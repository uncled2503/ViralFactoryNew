import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { RenderLayer } from './render/LayerEngine.js';

// Hostnames a remote asset URL is allowed to come from before this worker fetches it. Layer
// data comes from the coordinator's job payload — ultimately sourced from client-supplied
// project/template JSON that's never otherwise validated — so without this, a crafted asset URL
// pointing at an internal service or a cloud metadata endpoint (169.254.169.254) would be
// fetched and fed into ffmpeg as if it were a trusted asset (SSRF).
function isAllowedAssetUrl(url: string, apiUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  if (host.endsWith('.supabase.co')) return true;
  try {
    if (host === new URL(apiUrl).hostname.toLowerCase()) return true;
  } catch { /* apiUrl misconfigured, fall through */ }
  return false;
}

export class AssetDownloader {
  /**
   * Scans all layers for remote assets, downloads them in parallel, 
   * and maps each layer ID to its local, resolved file path.
   */
  static async downloadAssets(params: {
    jobId: string;
    layers: RenderLayer[];
    apiUrl: string;
  }): Promise<Map<string, string>> {
    const { jobId, layers, apiUrl } = params;
    const resolvedAssets = new Map<string, string>();

    // Create a local temp directory for this job's assets
    const tempJobDir = path.resolve(process.cwd(), 'temp_assets', jobId);
    if (!fs.existsSync(tempJobDir)) {
      fs.mkdirSync(tempJobDir, { recursive: true });
    }

    console.log(`[Worker Downloader] Starting download for Job ${jobId} to: ${tempJobDir}`);

    const downloadPromises = layers.map(async (layer) => {
      const type = layer.type.toLowerCase();
      
      // Determine asset URL based on layer structure
      let url: string | null = null;
      if (type === 'video') {
        url = layer.data?.content || layer.data?.styles?.videoUrl || layer.data?.videoUrl || null;
      } else if (type === 'image' || type === 'logo' || type === 'watermark' || type === 'dynamicimage' || type === 'avatar') {
        url = layer.data?.content || layer.data?.styles?.imageUrl || layer.data?.imageUrl || null;
      } else if (type === 'audio' || type === 'audiolayer') {
        url = layer.data?.content || layer.data?.styles?.audioUrl || layer.data?.audioUrl || null;
      } else if (type === 'subtitle' || type === 'subtitlelayer' || type === 'subtitles') {
        url = layer.data?.subtitleFile || layer.data?.content || null;
      } else if (type === 'background') {
        url = layer.data?.content || null;
      }

      // If no asset URL is specified, skip downloading (e.g. for text layers)
      if (!url || typeof url !== 'string' || url.trim() === '') {
        return;
      }

      // Check if it's actually a valid URL or local server relative path
      const isUrlOrPath = url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://');
      if (!isUrlOrPath) {
        // Not a download asset, probably raw text content or solid color code
        return;
      }

      // Format clean, absolute download URL
      let downloadUrl = url;
      if (url.startsWith('/')) {
        // Local relative SaaS path -> prepend SaaS base API_URL
        downloadUrl = `${apiUrl.replace(/\/+$/, '')}${url}`;
      }

      if (!isAllowedAssetUrl(downloadUrl, apiUrl)) {
        console.error(`[Worker Downloader] Rejected asset for layer "${layer.id}": URL is not http(s) or not from an allowed host: ${downloadUrl}`);
        throw new Error(`Asset URL for layer ${layer.id} is not allowed.`);
      }

      // Determine correct local file extension
      let extension = path.extname(url).toLowerCase();
      if (!extension) {
        // Fallback extensions depending on layer types
        if (type === 'video') extension = '.mp4';
        else if (type === 'image' || type === 'logo' || type === 'watermark') extension = '.jpg';
        else if (type === 'audio') extension = '.mp3';
        else if (type === 'subtitle') extension = '.srt';
        else extension = '.bin';
      }

      // layer.id is job-supplied with no format guarantee — strip anything that isn't
      // alphanumeric/hyphen/underscore before it's used to build a filesystem path, or a value
      // like "../../../../tmp/evil" could write the downloaded content outside tempJobDir.
      const safeLayerId = String(layer.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const localFileName = `layer_${safeLayerId}${extension}`;
      const localFilePath = path.join(tempJobDir, localFileName);

      try {
        console.log(`[Worker Downloader] Downloading asset for Layer "${layer.id}": ${downloadUrl}`);
        await this.downloadFile(downloadUrl, localFilePath);
        resolvedAssets.set(layer.id, localFilePath);
        console.log(`[Worker Downloader] Asset saved to: ${localFilePath}`);
      } catch (err: any) {
        console.error(`[Worker Downloader] Error downloading layer "${layer.id}" from URL "${downloadUrl}":`, err.message);
        throw new Error(`Failed to download asset for layer ${layer.id}: ${err.message}`);
      }
    });

    // Execute downloads in parallel
    await Promise.all(downloadPromises);
    return resolvedAssets;
  }

  /**
   * Helper stream-based downloader
   */
  private static async downloadFile(url: string, destPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const fileStream = fs.createWriteStream(destPath);
    // Node.js 18+ Web Response body is a ReadableStream; we need to convert it or pipe it
    const nodeReadable = Readable.fromWeb(response.body as any);
    await finished(nodeReadable.pipe(fileStream));
  }
}
