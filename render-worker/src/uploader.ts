import fs from 'fs';
import path from 'path';

export interface UploadResult {
  videoUrl: string;
  thumbnailUrl: string;
  previewUrl: string;
}

export class AssetUploader {
  /**
   * Uploads all rendering outputs to the SaaS backend or directly to Supabase Storage
   * using Signed URLs, returning the final storage URLs of the assets.
   */
  static async uploadOutputs(params: {
    jobId: string;
    apiUrl: string;
    videoPath: string;
    thumbnailPath: string;
    previewPath: string;
    uploadUrls?: { video: string; thumbnail: string; preview: string };
  }): Promise<UploadResult> {
    const { jobId, apiUrl, videoPath, thumbnailPath, previewPath, uploadUrls } = params;

    console.log(`[Worker Uploader] Initiating upload of rendering outputs for Job ${jobId}...`);

    // Define filenames with job ID to prevent collisions
    const videoFilename = `render_${jobId}.mp4`;
    const thumbFilename = `thumb_${jobId}.jpg`;
    const previewFilename = `preview_${jobId}.mp4`;

    let videoUrl: string;
    let thumbnailUrl: string;
    let previewUrl: string;

    // 1. Upload Video MP4
    if (uploadUrls?.video && !uploadUrls.video.includes('/api/render/upload')) {
      console.log(`[Worker Uploader] Uploading final MP4 directly to Supabase Storage: ${videoPath}`);
      await this.uploadToSignedUrlWithRetry(uploadUrls.video, videoPath, 'video/mp4');
      videoUrl = `/storage/rendered/${videoFilename}`;
    } else {
      console.log(`[Worker Uploader] Uploading final MP4 to SaaS Coordinator: ${videoPath}`);
      videoUrl = await this.uploadBinaryFileWithRetry({
        apiUrl,
        folder: 'rendered',
        filename: videoFilename,
        filePath: videoPath
      });
    }

    // 2. Upload Thumbnail JPG
    if (uploadUrls?.thumbnail && !uploadUrls.thumbnail.includes('/api/render/upload')) {
      console.log(`[Worker Uploader] Uploading thumbnail JPG directly to Supabase Storage: ${thumbnailPath}`);
      await this.uploadToSignedUrlWithRetry(uploadUrls.thumbnail, thumbnailPath, 'image/jpeg');
      thumbnailUrl = `/storage/rendered/${thumbFilename}`;
    } else {
      console.log(`[Worker Uploader] Uploading thumbnail JPG to SaaS Coordinator: ${thumbnailPath}`);
      thumbnailUrl = await this.uploadBinaryFileWithRetry({
        apiUrl,
        folder: 'rendered',
        filename: thumbFilename,
        filePath: thumbnailPath
      });
    }

    // 3. Upload Preview MP4
    if (uploadUrls?.preview && !uploadUrls.preview.includes('/api/render/upload')) {
      console.log(`[Worker Uploader] Uploading preview clip MP4 directly to Supabase Storage: ${previewPath}`);
      await this.uploadToSignedUrlWithRetry(uploadUrls.preview, previewPath, 'video/mp4');
      previewUrl = `/storage/rendered/${previewFilename}`;
    } else {
      console.log(`[Worker Uploader] Uploading preview clip MP4 to SaaS Coordinator: ${previewPath}`);
      previewUrl = await this.uploadBinaryFileWithRetry({
        apiUrl,
        folder: 'rendered',
        filename: previewFilename,
        filePath: previewPath
      });
    }

    console.log(`[Worker Uploader] All assets uploaded successfully!`);
    return {
      videoUrl,
      thumbnailUrl,
      previewUrl
    };
  }

  /**
   * Helper method to execute upload tasks with automatic exponential backoff retries
   */
  private static async executeWithRetry<T>(operation: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
    try {
      return await operation();
    } catch (err: any) {
      if (retries <= 0) {
        throw err;
      }
      console.warn(`[Worker Uploader] Upload failed: ${err.message}. Retrying in ${delayMs}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return this.executeWithRetry(operation, retries - 1, delayMs * 2);
    }
  }

  /**
   * Streaming PUT file uploader directly to a Supabase Storage Signed URL
   */
  private static async uploadToSignedUrlWithRetry(url: string, filePath: string, contentType: string): Promise<void> {
    await this.executeWithRetry(async () => {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Local file to upload does not exist: ${filePath}`);
      }

      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': stats.size.toString()
        },
        body: fileStream as any,
        duplex: 'half'
      } as any);

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`Supabase Storage returned HTTP ${response.status}: ${errorMsg}`);
      }
    });
  }

  /**
   * Streaming PUT file uploader to local server (fallback with retry)
   */
  private static async uploadBinaryFileWithRetry(params: {
    apiUrl: string;
    folder: string;
    filename: string;
    filePath: string;
  }): Promise<string> {
    return this.executeWithRetry(async () => {
      const { apiUrl, folder, filename, filePath } = params;

      if (!fs.existsSync(filePath)) {
        throw new Error(`Local file to upload does not exist: ${filePath}`);
      }

      const uploadUrl = `${apiUrl.replace(/\/+$/, '')}/api/render/upload/${folder}/${filename}`;
      const fileStream = fs.createReadStream(filePath);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileStream as any,
        duplex: 'half'
      } as any);

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`SaaS returned HTTP ${response.status}: ${errorMsg}`);
      }

      const data = await response.json();
      if (!data.success || !data.url) {
        throw new Error(`SaaS upload API returned failure for ${filename}`);
      }

      return data.url;
    });
  }
}
