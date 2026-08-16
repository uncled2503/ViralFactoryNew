import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { JobQueue, RenderJob, JobStatus } from './JobQueue';
import { StorageManager } from './Storage';
import { TemplateEngine } from './TemplateEngine';
import { LayerEngine } from './LayerEngine';
import { ExportEngine } from './ExportEngine';
import { OutputManager } from './OutputManager';
import { FFmpegGraphBuilder } from './FFmpegGraphBuilder';
import { ExportPresetManager } from './ExportPresetManager';
import { RenderEngine } from './RenderEngine';
import { FFmpegCommandBuilder } from './FFmpegCommandBuilder';

export class PipelineManager {
  /**
   * Main entrypoint to process an active rendering Job through the multi-stage pipeline
   */
  static async run(jobId: string): Promise<RenderJob> {
    const job = JobQueue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} não encontrado no sistema.`);
    }

    const startTime = Date.now();
    const logs: string[] = [];

    const addLog = (stage: string, message: string, isError = false) => {
      const timeStr = new Date().toLocaleTimeString('pt-BR');
      const prefix = isError ? '[ERRO]' : '[INFO]';
      const logLine = `[${timeStr}] [${stage}] ${prefix} ${message}`;
      // Full detail (including the underlying render tool's name/commands) stays in the
      // server's own console only — the trail persisted/exposed to clients never
      // references the implementation, so users can't discover how rendering works.
      console.log(`[Pipeline] ${logLine}`);
      if (!/ffmpeg/i.test(logLine)) {
        logs.push(logLine);
        JobQueue.updateJob(jobId, { logs: [...logs] });
      }
    };

    let projectData: any = null;
    let templateData: any = null;
    let compiledTemplateJson: any = null;
    let renderLayers: any[] = [];
    let preset: any = null;
    let tempOutputPath = '';
    let fileName = '';
    let permanentVideoUrl = '';
    let permanentThumbUrl = '';
    let permanentPreviewUrl = '';
    let renderTimeStr = '';

    let ffmpegCommandStr = '';
    let ffmpegStartTime = 0;
    let ffmpegEndTime = 0;
    let stdoutData = '';
    let stderrData = '';
    let debugInfo: any = null;

    try {
      // -----------------------------------------------------------------------
      // STEP 1: VALIDAR JOB
      // -----------------------------------------------------------------------
      addLog('Validar Job', 'Iniciando validação dos parâmetros essenciais da tarefa...');
      if (!job.userId) throw new Error('Identificação do Usuário (userId) ausente no Job.');
      if (!job.projectId) throw new Error('Identificação do Projeto (projectId) ausente no Job.');
      if (!job.templateId) throw new Error('Identificação do Template (templateId) ausente no Job.');
      
      JobQueue.updateProgress(jobId, 'Preparing', 5);
      await RenderEngine.saveDbStatus(jobId, 'Preparing', 5, undefined, undefined, undefined, logs);

      addLog('Validar Job', `Carregando registro de projeto no banco (ID: ${job.projectId})...`);
      // Use RenderEngine's fetch helpers
      projectData = await (RenderEngine as any).fetchProject(job.projectId, job.userId);
      if (!projectData) {
        throw new Error(`Projeto ${job.projectId} não encontrado ou sem permissão de acesso.`);
      }
      addLog('Validar Job', `Projeto "${projectData.name || job.projectName}" localizado com sucesso.`);

      addLog('Validar Job', `Carregando registro de template no banco (ID: ${job.templateId})...`);
      templateData = await (RenderEngine as any).fetchTemplate(job.templateId, job.userId);
      if (!templateData) {
        throw new Error(`Template ${job.templateId} não encontrado no banco de dados.`);
      }
      addLog('Validar Job', `Template "${templateData.name || job.templateName}" localizado com sucesso.`);
      addLog('Validar Job', 'Sucesso: Parâmetros e referências do Job validados.');


      // -----------------------------------------------------------------------
      // STEP 2: VALIDAR ASSETS
      // -----------------------------------------------------------------------
      addLog('Validar Assets', 'Iniciando varredura e validação de ativos de mídia configurados...');
      const vars = job.variables || projectData.variables || {};
      
      const assetKeys = ['backgroundImageUrl', 'backgroundVideoUrl', 'audioUrl', 'logoUrl'];
      let checkedAssets = 0;
      for (const key of assetKeys) {
        const url = vars[key];
        if (url) {
          addLog('Validar Assets', `Analisando asset [${key}]: ${url}`);
          // Basic HTTP / URL safety check
          if (url.startsWith('http://') || url.startsWith('https://')) {
            addLog('Validar Assets', `Asset [${key}] possui formato de URL remota válida.`);
          } else if (url.startsWith('/') && fs.existsSync(path.join(process.cwd(), 'public', url))) {
            addLog('Validar Assets', `Asset [${key}] mapeado localmente no sistema.`);
          } else {
            addLog('Validar Assets', `Aviso: Asset [${key}] possui caminho relativo ou não-padrão.`, false);
          }
          checkedAssets++;
        }
      }
      addLog('Validar Assets', `Varredura concluída. ${checkedAssets} ativos mapeados e validados.`);
      
      JobQueue.updateProgress(jobId, 'Preparing', 15);
      await RenderEngine.saveDbStatus(jobId, 'Preparing', 15, undefined, undefined, undefined, logs);


      // -----------------------------------------------------------------------
      // STEP 3: VALIDAR TEMPLATE
      // -----------------------------------------------------------------------
      addLog('Validar Template', 'Processando e validando conformidade da estrutura JSON do template...');
      const baseTemplateJson = TemplateEngine.getTemplateJson(templateData, projectData);
      
      if (!baseTemplateJson) {
        throw new Error('Falha ao obter estrutura base JSON do template.');
      }
      if (!Array.isArray(baseTemplateJson.layers)) {
        throw new Error('Estrutura de camadas do template inválida ou inexistente.');
      }
      addLog('Validar Template', `JSON estruturado validado contendo ${baseTemplateJson.layers.length} camadas base.`);


      // -----------------------------------------------------------------------
      // STEP 4: RESOLVER PLACEHOLDERS
      // -----------------------------------------------------------------------
      addLog('Resolver Placeholders', 'Iniciando compilação de variáveis dinâmicas e placeholders de texto...');
      compiledTemplateJson = TemplateEngine.compile(baseTemplateJson, vars);
      
      if (!compiledTemplateJson) {
        throw new Error('Falha crítica na substituição de placeholders via TemplateEngine.');
      }
      
      // Print substituted text for debugging/tracking
      compiledTemplateJson.layers.forEach((layer: any) => {
        if (layer.type === 'text' || layer.type === 'headline') {
          addLog('Resolver Placeholders', `Camada de texto compilada: "${layer.text || layer.defaultValue}"`);
        }
      });
      addLog('Resolver Placeholders', 'Compilação de variáveis do projeto concluída.');


      // -----------------------------------------------------------------------
      // STEP 5: MONTAR LAYERS
      // -----------------------------------------------------------------------
      addLog('Montar Layers', 'Iniciando empilhamento de camadas e arranjo de render composite...');
      renderLayers = LayerEngine.compileLayers(compiledTemplateJson);
      
      if (!renderLayers || renderLayers.length === 0) {
        throw new Error('Nenhuma camada ativa de composição visual pôde ser montada.');
      }
      addLog('Montar Layers', `Pilha de camadas compilada com sucesso contendo ${renderLayers.length} camadas de render.`);
      
      JobQueue.updateProgress(jobId, 'Preparing', 20);
      await RenderEngine.saveDbStatus(jobId, 'Preparing', 20, undefined, undefined, undefined, logs);


      // -----------------------------------------------------------------------
      // STEP 6: GERAR FILTER GRAPH E COMANDO DINÂMICO
      // -----------------------------------------------------------------------
      addLog('Gerar Filter Graph', 'Mapeando presets de exportação ativos para FFmpeg...');
      const presetId = job.variables?.presetId || projectData?.presetId || projectData?.preset || compiledTemplateJson?.presetId || 'tiktok';
      preset = ExportPresetManager.getPreset(presetId);
      
      addLog('Gerar Filter Graph', `Preset de Exportação resolvido: ${preset.name} (${preset.width}x${preset.height} @ ${preset.fps}fps)`);

      // Resolve assets as required by GraphBuilder
      const resolvedAssets = new Map<string, string>();
      for (const layer of renderLayers) {
        const contentUrl = layer.data?.content || layer.data?.url || layer.data?.videoUrl;
        if (contentUrl) {
          if (contentUrl.startsWith('/') && fs.existsSync(path.join(process.cwd(), 'public', contentUrl))) {
            resolvedAssets.set(layer.id, path.join(process.cwd(), 'public', contentUrl));
          } else {
            resolvedAssets.set(layer.id, contentUrl); // Use directly if remote
          }
        }
      }

      // -----------------------------------------------------------------------
      // STEP 7: EXECUTAR FFMPEG COM COMMAND BUILDER
      // -----------------------------------------------------------------------
      addLog('Executar FFmpeg', 'Localizando executável do FFmpeg no sistema...');
      
      let videoDuration = Number(compiledTemplateJson?.duration || job.variables?.duration || projectData?.variables?.duration || 30);
      if (job.variables?.isSandbox) {
        videoDuration = 3;
        addLog('Executar FFmpeg', 'Render Sandbox Ativo! Forçando a duração total do vídeo para 3 segundos para uma renderização de preview ultra-rápida.');
      } else {
        addLog('Executar FFmpeg', `Duração total do vídeo configurada para renderização: ${videoDuration} segundos.`);
      }

      let ffmpegPath = 'ffmpeg';
      let ffmpegLocated = false;
      
      const checkPaths = [
        'ffmpeg',
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/opt/homebrew/bin/ffmpeg'
      ];

      for (const checkPath of checkPaths) {
        try {
          const { execSync } = require('child_process');
          execSync(`"${checkPath}" -version`, { stdio: 'ignore' });
          ffmpegPath = checkPath;
          ffmpegLocated = true;
          addLog('Executar FFmpeg', `Executável do FFmpeg localizado e validado em: "${checkPath}"`);
          break;
        } catch (e) {
          // Ignore and check next path
        }
      }

      if (!ffmpegLocated) {
        throw new Error('Falha crítica: O executável do FFmpeg não pôde ser localizado ou não possui permissão de execução no container.');
      }

      fileName = `${job.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}.mp4`;
      tempOutputPath = StorageManager.getTempPath(fileName);
      
      // Ensure target directory exists
      const outputDir = path.dirname(tempOutputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      addLog('Executar FFmpeg', 'Iniciando montagem do comando FFmpeg completo e 100% dinâmico via FFmpegCommandBuilder...');
      const builderResult = FFmpegCommandBuilder.build({
        ffmpegPath,
        layers: renderLayers,
        resolvedAssets,
        preset,
        duration: videoDuration,
        tempOutputPath
      });

      const ffmpegArgs = builderResult.args;
      ffmpegCommandStr = builderResult.commandString;
      addLog('Executar FFmpeg', `Grafo e parâmetros compilados. Áudio detectado no grafo: ${builderResult.hasAudio ? 'Sim' : 'Não'}`);
      addLog('Executar FFmpeg', `Comando Completo FFmpeg construído:\n${builderResult.commandString}`);
      addLog('Executar FFmpeg', `Spawnando processo com ${ffmpegArgs.length} argumentos dinâmicos...`);


      // -----------------------------------------------------------------------
      // STEP 8: MONITORAR PROGRESSO
      // -----------------------------------------------------------------------
      addLog('Monitorar progresso', 'Conectando-se ao fluxo stderr para acompanhamento e leitura em tempo real do progresso...');
      
      JobQueue.updateProgress(jobId, 'Rendering', 25);
      await RenderEngine.saveDbStatus(jobId, 'processing', 25, undefined, undefined, undefined, logs);

      ffmpegStartTime = Date.now();
      const renderProcess = spawn(ffmpegPath, ffmpegArgs);
      
      await new Promise<void>((resolvePromise, rejectPromise) => {
        let lastReportedPercent = 25;
        
        renderProcess.stdout.on('data', (data) => {
          stdoutData += data.toString();
        });
        
        renderProcess.stderr.on('data', (data) => {
          const str = data.toString();
          stderrData += str;
          if (str.includes('frame=')) {
            const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2})/);
            if (timeMatch) {
              const hours = parseInt(timeMatch[1], 10);
              const mins = parseInt(timeMatch[2], 10);
              const secs = parseInt(timeMatch[3], 10);
              const totalSecs = hours * 3600 + mins * 60 + secs;
              
              const progressRatio = videoDuration > 0 ? (totalSecs / videoDuration) : 0;
              const estimatedPercent = Math.min(Math.round(25 + progressRatio * 65), 90);
              
              if (estimatedPercent > lastReportedPercent) {
                lastReportedPercent = estimatedPercent;
                const status: JobStatus = estimatedPercent < 60 ? 'Rendering' : 'Encoding';
                JobQueue.updateProgress(jobId, status, estimatedPercent);
                addLog('Monitorar progresso', `Renderização do fluxo ativo de quadros: ${estimatedPercent}% concluído (tempo processado: ${timeMatch[0].replace('time=', '')}).`);
                
                if (estimatedPercent % 10 === 0) {
                  RenderEngine.saveDbStatus(jobId, 'processing', estimatedPercent, undefined, undefined, undefined, logs).catch(() => {});
                }
              }
            }
          }
        });

        renderProcess.on('close', (code) => {
          ffmpegEndTime = Date.now();
          if (code === 0) {
            addLog('Monitorar progresso', 'FFmpeg finalizou processo de codificação com código de retorno 0.');
            resolvePromise();
          } else {
            addLog('Monitorar progresso', `FFmpeg fechou com erro (código: ${code}).`, true);
            rejectPromise(new Error(`FFmpeg falhou com código de encerramento ${code}`));
          }
        });

        renderProcess.on('error', (err) => {
          ffmpegEndTime = Date.now();
          addLog('Monitorar progresso', `Erro na execução do processo de renderização: ${err.message}`, true);
          rejectPromise(err);
        });
      });

      // -----------------------------------------------------------------------
      // VALIDAR ARQUIVO DE SAÍDA MP4
      // -----------------------------------------------------------------------
      addLog('Executar FFmpeg', 'Verificando a existência e integridade do arquivo MP4 resultante no disco...');
      if (!fs.existsSync(tempOutputPath)) {
        throw new Error(`Falha crítica: O arquivo de vídeo MP4 de saída não foi gerado no caminho esperado: ${tempOutputPath}`);
      }
      const fileStats = fs.statSync(tempOutputPath);
      if (fileStats.size === 0) {
        throw new Error('Falha crítica: O arquivo de vídeo MP4 de saída foi criado, mas possui tamanho de 0 bytes (vazio).');
      }
      addLog('Executar FFmpeg', `Sucesso: Arquivo MP4 validado (${(fileStats.size / 1024 / 1024).toFixed(2)} MB). Continuando com o pipeline.`);

      // Compile final debugInfo. The raw command/stdout/stderr are intentionally kept out
      // of what gets persisted or sent to the client — only generic, non-identifying
      // telemetry (timing, size, resolution, etc) should ever leave the server process.
      const executionTimeMs = ffmpegEndTime > 0 && ffmpegStartTime > 0 ? (ffmpegEndTime - ffmpegStartTime) : 0;
      debugInfo = {
        executionTimeMs,
        encodingTimeMs: executionTimeMs,
        fileSize: fileStats.size,
        bitrate: preset.videoBitrate,
        resolution: `${preset.width}x${preset.height}`,
        codec: preset.videoCodec,
        fps: preset.fps
      };


      // -----------------------------------------------------------------------
      // STEP 9: GERAR THUMBNAIL
      // -----------------------------------------------------------------------
      addLog('Gerar Thumbnail', 'Iniciando extração de quadro de destaque de alta resolução...');
      
      const thumbFileName = fileName.replace('.mp4', '.jpg');
      const tempThumbPath = StorageManager.getTempPath(thumbFileName);
      
      await OutputManager.generateThumbnail(tempOutputPath, tempThumbPath);
      addLog('Gerar Thumbnail', `Miniatura gerada com sucesso em cache temporário.`);


      // -----------------------------------------------------------------------
      // STEP 10: GERAR PREVIEW
      // -----------------------------------------------------------------------
      addLog('Gerar Preview', 'Iniciando extração de clipe de preview web-optimizado (5 segundos)...');
      
      const previewFileName = fileName.replace('.mp4', '_preview.mp4');
      const tempPreviewPath = StorageManager.getTempPath(previewFileName);
      
      await OutputManager.generatePreview(tempOutputPath, tempPreviewPath);
      addLog('Gerar Preview', `Clipe de pré-visualização reduzido gerado com sucesso.`);


      // -----------------------------------------------------------------------
      // STEP 11: SALVAR NO STORAGE
      // -----------------------------------------------------------------------
      addLog('Salvar no Storage', 'Persistindo arquivos exportados e metadados para o Storage permanente...');
      
      permanentVideoUrl = StorageManager.saveToStorage(tempOutputPath, 'rendered', fileName);
      permanentThumbUrl = StorageManager.saveToStorage(tempThumbPath, 'rendered', thumbFileName);
      permanentPreviewUrl = StorageManager.saveToStorage(tempPreviewPath, 'rendered', previewFileName);
      
      addLog('Salvar no Storage', `Vídeo final salvo em: ${permanentVideoUrl}`);
      addLog('Salvar no Storage', `Miniatura salva em: ${permanentThumbUrl}`);
      addLog('Salvar no Storage', `Preview salvo em: ${permanentPreviewUrl}`);


      // -----------------------------------------------------------------------
      // STEP 12: ATUALIZAR SUPABASE (E LOCAL DB)
      // -----------------------------------------------------------------------
      addLog('Atualizar Supabase', 'Gravando registros de finalização nos bancos de dados unificados...');
      
      const renderDurationSeconds = Math.round((Date.now() - startTime) / 1000);
      renderTimeStr = `${renderDurationSeconds}s`;

      // Save complete status to databases
      await RenderEngine.saveDbStatus(
        jobId,
        'completed',
        100,
        permanentVideoUrl,
        renderTimeStr,
        undefined,
        logs,
        debugInfo,
        permanentThumbUrl
      );
      
      await RenderEngine.registerRenderedFile(
        job.userId, 
        job.projectId, 
        job.projectName, 
        permanentVideoUrl
      );
      
      addLog('Atualizar Supabase', 'Banco de dados sincronizado com sucesso.');


      // -----------------------------------------------------------------------
      // STEP 13: CONCLUIR JOB
      // -----------------------------------------------------------------------
      addLog('Concluir Job', `Toda a esteira de renderização executada com sucesso em ${renderTimeStr}!`);
      
      const completedJobUpdates = {
        status: 'Completed' as const,
        progress: 100,
        renderTime: renderTimeStr,
        outputUrl: permanentVideoUrl,
        thumbnailUrl: permanentThumbUrl,
        completedAt: new Date().toISOString(),
        logs: [...logs],
        debugInfo
      };

      JobQueue.updateJob(jobId, completedJobUpdates);
      
      // Safety cleanup of temp files
      try {
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
        if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
        if (fs.existsSync(tempPreviewPath)) fs.unlinkSync(tempPreviewPath);
        addLog('Concluir Job', 'Arquivos temporários limpos do container.');
      } catch (err: any) {
        addLog('Concluir Job', `Aviso na limpeza de cache temporário: ${err.message}`);
      }

      return JobQueue.getJob(jobId)!;

    } catch (err: any) {
      // Full detail stays server-side only; never let the render tool's name leak into
      // anything persisted or returned to a client.
      console.error(`[PipelineManager] Pipeline falhou para o Job ${jobId}:`, err);
      const safeErrorMessage: string = (err.message || 'Erro inesperado no pipeline de renderização').replace(/ffmpeg/gi, 'motor de renderização');

      const executionTimeMs = ffmpegStartTime > 0 ? (Date.now() - ffmpegStartTime) : 0;
      const failedDebugInfo = {
        executionTimeMs,
        encodingTimeMs: executionTimeMs,
        fileSize: 0,
        bitrate: preset?.videoBitrate || 'N/A',
        resolution: preset ? `${preset.width}x${preset.height}` : 'N/A',
        codec: preset?.videoCodec || 'N/A',
        fps: preset?.fps || 0
      };

      const failedJobUpdates = {
        status: 'Failed' as const,
        progress: 0,
        error: safeErrorMessage,
        logs: [...logs],
        debugInfo: failedDebugInfo
      };

      JobQueue.updateJob(jobId, failedJobUpdates);

      // Update DB to failed with complete steps logs
      try {
        await RenderEngine.saveDbStatus(
          jobId,
          'failed',
          0,
          undefined,
          undefined,
          safeErrorMessage,
          logs,
          failedDebugInfo
        );
      } catch (dbErr) {
        console.error('[PipelineManager] Falha ao gravar status de falha no banco:', dbErr);
      }

      // Throw error to satisfy function return signature if necessary,
      // but ensure we do not block or crash the worker.
      throw err;
    }
  }
}
