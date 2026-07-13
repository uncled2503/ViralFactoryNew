import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class OutputManager {
  /**
   * Generates a representative thumbnail image from the completed render output
   */
  static generateThumbnail(
    videoPath: string, 
    outputThumbPath: string, 
    ffmpegPath = 'ffmpeg'
  ): Promise<string> {
    return new Promise(async (resolve) => {
      let hasFFmpeg = false;
      try {
        const check = spawn(ffmpegPath, ['-version']);
        await new Promise((res) => {
          check.on('close', (code) => res(code === 0));
          check.on('error', () => res(false));
        });
        hasFFmpeg = true;
      } catch {
        hasFFmpeg = false;
      }

      if (hasFFmpeg && fs.existsSync(videoPath)) {
        // Extract frame at second 1 of the video
        const args = [
          '-ss', '00:00:01',
          '-i', videoPath,
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          outputThumbPath
        ];

        const thumbProcess = spawn(ffmpegPath, args);
        thumbProcess.on('close', (code) => {
          if (code === 0 && fs.existsSync(outputThumbPath)) {
            resolve(outputThumbPath);
          } else {
            this.createFallbackThumbnail(outputThumbPath);
            resolve(outputThumbPath);
          }
        });
      } else {
        this.createFallbackThumbnail(outputThumbPath);
        resolve(outputThumbPath);
      }
    });
  }

  /**
   * Creates a mock thumbnail when FFmpeg fails or is not present
   */
  private static createFallbackThumbnail(outputThumbPath: string) {
    const parentDir = path.dirname(outputThumbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(outputThumbPath, 'FALLBACK_THUMBNAIL_BINARY_IMAGE_DATA');
  }

  /**
   * Generates a web-optimized smaller 5-second video preview clip for dashboard streams
   */
  static generatePreview(
    videoPath: string, 
    outputPreviewPath: string, 
    ffmpegPath = 'ffmpeg'
  ): Promise<string> {
    return new Promise(async (resolve) => {
      let hasFFmpeg = false;
      try {
        const check = spawn(ffmpegPath, ['-version']);
        await new Promise((res) => {
          check.on('close', (code) => res(code === 0));
          check.on('error', () => res(false));
        });
        hasFFmpeg = true;
      } catch {
        hasFFmpeg = false;
      }

      if (hasFFmpeg && fs.existsSync(videoPath)) {
        // Extract first 5 seconds
        const args = [
          '-ss', '00:00:00',
          '-t', '5',
          '-i', videoPath,
          '-c', 'copy',
          '-y',
          outputPreviewPath
        ];

        const previewProcess = spawn(ffmpegPath, args);
        previewProcess.on('close', (code) => {
          if (code === 0 && fs.existsSync(outputPreviewPath)) {
            resolve(outputPreviewPath);
          } else {
            this.createFallbackPreview(outputPreviewPath);
            resolve(outputPreviewPath);
          }
        });
      } else {
        this.createFallbackPreview(outputPreviewPath);
        resolve(outputPreviewPath);
      }
    });
  }

  /**
   * Mock fallback preview
   */
  private static createFallbackPreview(outputPreviewPath: string) {
    const parentDir = path.dirname(outputPreviewPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(outputPreviewPath, 'FALLBACK_PREVIEW_VIDEO_DATA');
  }
}
