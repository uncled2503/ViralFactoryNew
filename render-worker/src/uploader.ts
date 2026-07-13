import fs from 'fs';
import path from 'path';

export interface UploadResult {
  videoUrl: string;
  thumbnailUrl: string;
  previewUrl: string;
}

export class AssetUploader {
  /**
   * Uploads all rendering outputs to the SaaS backend using our raw binary PUT endpoints,
   * returning the final public storage URLs of the assets.
   */
  static async uploadOutputs(params: {
    jobId: string;
    apiUrl: string;
    videoPath: string;
    thumbnailPath: string;
    previewPath: string;
  }): Promise<UploadResult> {
    const { jobId, apiUrl, videoPath, thumbnailPath, previewPath } = params;

    console.log(`[Worker Uploader] Initiating upload of rendering outputs for Job ${jobId}...`);

    // Define filenames with job ID to prevent collisions
    const videoFilename = `render_${jobId}.mp4`;
    const thumbFilename = `thumb_${jobId}.jpg`;
    const previewFilename = `preview_${jobId}.mp4`;

    // 1. Upload Video MP4
    console.log(`[Worker Uploader] Uploading final MP4: ${videoPath}`);
    const videoUrl = await this.uploadBinaryFile({
      apiUrl,
      folder: 'rendered',
      filename: videoFilename,
      filePath: videoPath
    });

    // 2. Upload Thumbnail JPG
    console.log(`[Worker Uploader] Uploading thumbnail JPG: ${thumbnailPath}`);
    const thumbnailUrl = await this.uploadBinaryFile({
      apiUrl,
      folder: 'rendered',
      filename: thumbFilename,
      filePath: thumbnailPath
    });

    // 3. Upload Preview MP4
    console.log(`[Worker Uploader] Uploading preview clip MP4: ${previewPath}`);
    const previewUrl = await this.uploadBinaryFile({
      apiUrl,
      folder: 'rendered',
      filename: previewFilename,
      filePath: previewPath
    });

    console.log(`[Worker Uploader] All assets uploaded successfully!`);
    return {
      videoUrl,
      thumbnailUrl,
      previewUrl
    };
  }

  /**
   * Streaming PUT file uploader
   */
  private static async uploadBinaryFile(params: {
    apiUrl: string;
    folder: string;
    filename: string;
    filePath: string;
  }): Promise<string> {
    const { apiUrl, folder, filename, filePath } = params;

    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file to upload does not exist: ${filePath}`);
    }

    const uploadUrl = `${apiUrl.replace(/\/+$/, '')}/api/render/upload/${folder}/${filename}`;
    const fileStream = fs.createReadStream(filePath);

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileStream as any,
      // duplex: 'half' is a requirement when sending streaming bodies in Node.js fetch
      // to avoid protocol mismatch errors.
      duplex: 'half'
    } as any);

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Failed to upload ${filename} (${response.status} ${response.statusText}): ${errorMsg}`);
    }

    const data = await response.json();
    if (!data.success || !data.url) {
      throw new Error(`SaaS upload API returned failure for ${filename}`);
    }

    return data.url;
  }
}
