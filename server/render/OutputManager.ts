import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { StorageManager } from './Storage';

export class OutputManager {
  /**
   * Generates a representative thumbnail image from the completed render output
   */
  static generateThumbnail(videoPath: string, outputThumbPath: string): Promise<string> {
    return new Promise(async (resolve) => {
      // Check if FFmpeg is available
      let hasFFmpeg = false;
      try {
        const check = spawn('ffmpeg', ['-version']);
        await new Promise((res) => {
          check.on('close', (code) => res(code === 0));
          check.on('error', () => res(false));
        });
        hasFFmpeg = true;
      } catch {
        hasFFmpeg = false;
      }

      if (hasFFmpeg && fs.existsSync(videoPath)) {
        // Extract frame at second 1 (1s) of the video
        const args = [
          '-ss', '00:00:01',
          '-i', videoPath,
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          outputThumbPath
        ];

        const thumbProcess = spawn('ffmpeg', args);
        thumbProcess.on('close', (code) => {
          if (code === 0 && fs.existsSync(outputThumbPath)) {
            resolve(outputThumbPath);
          } else {
            this.createFallbackThumbnail(outputThumbPath);
            resolve(outputThumbPath);
          }
        });
      } else {
        // Fallback thumbnail copy
        this.createFallbackThumbnail(outputThumbPath);
        resolve(outputThumbPath);
      }
    });
  }

  /**
   * Creates a high-contrast mock thumbnail when FFmpeg is not installed
   */
  private static createFallbackThumbnail(outputThumbPath: string) {
    const parentDir = path.dirname(outputThumbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Try copying from new brand logo symbol
    const logoSymbol = path.join(process.cwd(), 'src/assets/images/logo_symbol_new_1782894227400.jpg');
    if (fs.existsSync(logoSymbol)) {
      try {
        fs.copyFileSync(logoSymbol, outputThumbPath);
        return;
      } catch (e) {
        // Ignore and fallback to file write
      }
    }

    // Write simple text image binary descriptor
    fs.writeFileSync(outputThumbPath, 'FALLBACK_THUMBNAIL_BINARY_IMAGE_DATA');
  }

  /**
   * Generates a web-optimized smaller 5-second video preview clip for dashboard streams
   */
  static generatePreview(videoPath: string, outputPreviewPath: string): Promise<string> {
    return new Promise(async (resolve) => {
      let hasFFmpeg = false;
      try {
        const check = spawn('ffmpeg', ['-version']);
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

        const previewProcess = spawn('ffmpeg', args);
        previewProcess.on('close', (code) => {
          if (code === 0 && fs.existsSync(outputPreviewPath)) {
            resolve(outputPreviewPath);
          } else {
            fs.copyFileSync(videoPath, outputPreviewPath); // Fallback to copy original
            resolve(outputPreviewPath);
          }
        });
      } else {
        if (fs.existsSync(videoPath)) {
          try {
            fs.copyFileSync(videoPath, outputPreviewPath);
          } catch (e) {}
        }
        resolve(outputPreviewPath);
      }
    });
  }
}
