import { spawn } from 'child_process';
import { GoogleGenAI, Type } from '@google/genai';
import { isAllowedAssetUrl } from '../render/PipelineManager';

// A frame extraction (or the Gemini call itself) hanging forever would tie up the request
// indefinitely — both are bounded so one bad video can't exhaust the server.
const FRAME_EXTRACTION_TIMEOUT_MS = 20000;
const GEMINI_TIMEOUT_MS = 30000;
// A single JPEG frame should never legitimately be this large; this is a sanity cap against a
// malformed/huge ffmpeg output, not a real-world limit.
const MAX_FRAME_BYTES = 8 * 1024 * 1024;

export class HeadlineGenerationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let cachedClient: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new HeadlineGenerationError('Geração de headlines por IA não está configurada neste servidor (GEMINI_API_KEY ausente).', 503);
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

// Grabs a single frame from a remote video via ffmpeg, piping the JPEG straight to stdout —
// no temp file to create or clean up. `seekSeconds` lets the caller retry at 0s for videos
// shorter than the initial seek point.
function extractFrame(videoUrl: string, seekSeconds: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = ['-ss', String(seekSeconds), '-i', videoUrl, '-vframes', '1', '-q:v', '4', '-f', 'image2', 'pipe:1'];
    const proc = spawn('ffmpeg', args);
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const finish = (err: Error | null, buffer?: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (err) reject(err);
      else resolve(buffer!);
    };

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      finish(new Error('Tempo esgotado ao extrair frame do vídeo.'));
    }, FRAME_EXTRACTION_TIMEOUT_MS);

    proc.stdout.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_FRAME_BYTES) {
        proc.kill('SIGKILL');
        finish(new Error('Frame extraído do vídeo excedeu o tamanho máximo permitido.'));
        return;
      }
      chunks.push(chunk);
    });
    proc.stderr.on('data', () => { /* drain ffmpeg's progress log to avoid stdio backpressure */ });
    proc.on('error', (err) => finish(err));
    proc.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        finish(null, Buffer.concat(chunks));
      } else {
        finish(new Error(`FFmpeg não conseguiu extrair um frame do vídeo (código ${code}).`));
      }
    });
  });
}

async function extractFrameWithFallback(videoUrl: string): Promise<Buffer> {
  try {
    return await extractFrame(videoUrl, 1);
  } catch {
    // Likely a video shorter than 1s, or the 1s mark landed on a black/transition frame.
    return await extractFrame(videoUrl, 0);
  }
}

export interface GenerateHeadlinesParams {
  videoUrl: string;
  context?: string;
  count?: number;
}

export class HeadlineGenerationService {
  static async generateHeadlines({ videoUrl, context, count = 4 }: GenerateHeadlinesParams): Promise<string[]> {
    if (!videoUrl || typeof videoUrl !== 'string') {
      throw new HeadlineGenerationError('videoUrl é obrigatório.', 400);
    }
    // Same SSRF allowlist PipelineManager enforces before handing a URL to ffmpeg -i — this
    // endpoint spawns ffmpeg against a client-supplied URL too, so it needs the same guard.
    if (!isAllowedAssetUrl(videoUrl)) {
      throw new HeadlineGenerationError('URL de vídeo não permitida.', 400);
    }
    const safeCount = Math.min(Math.max(Math.trunc(count) || 4, 1), 8);

    const client = getClient();

    let frame: Buffer;
    try {
      frame = await extractFrameWithFallback(videoUrl);
    } catch (err: any) {
      throw new HeadlineGenerationError(`Não foi possível extrair um frame do vídeo para análise: ${err.message}`, 502);
    }

    const trimmedContext = typeof context === 'string' ? context.trim().slice(0, 300) : '';
    const prompt = [
      'Você é um especialista em copywriting para vídeos curtos virais (TikTok, Reels, Shorts) em português do Brasil.',
      'Observe a imagem anexa, que é um frame real extraído do vídeo.',
      trimmedContext ? `Contexto adicional fornecido pelo usuário sobre este vídeo: "${trimmedContext}".` : null,
      `Gere ${safeCount} sugestões de headline DIFERENTES entre si para sobrepor neste vídeo.`,
      'Regras: no máximo 60 caracteres cada, em português do Brasil, tom chamativo/viral, sem emojis, sem aspas, sem numeração, baseadas no que aparece na imagem.',
    ].filter(Boolean).join('\n');

    let response;
    try {
      response = await Promise.race([
        client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { data: frame.toString('base64'), mimeType: 'image/jpeg' } },
              { text: prompt },
            ],
          }],
          config: {
            temperature: 0.9,
            responseMimeType: 'application/json',
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), GEMINI_TIMEOUT_MS)),
      ]);
    } catch (err: any) {
      throw new HeadlineGenerationError(`Falha ao gerar headlines com a IA: ${err.message}`, 502);
    }

    const raw = response.text;
    if (!raw) {
      throw new HeadlineGenerationError('A IA não retornou nenhuma sugestão de headline.', 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HeadlineGenerationError('Resposta da IA em formato inesperado.', 502);
    }

    if (!Array.isArray(parsed)) {
      throw new HeadlineGenerationError('Resposta da IA em formato inesperado.', 502);
    }

    const headlines = parsed
      .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
      .map((h) => h.trim().slice(0, 80))
      .slice(0, safeCount);

    if (headlines.length === 0) {
      throw new HeadlineGenerationError('A IA não retornou nenhuma sugestão de headline válida.', 502);
    }

    return headlines;
  }
}
