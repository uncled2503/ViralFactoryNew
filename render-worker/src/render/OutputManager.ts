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
        // Extract frame at second 1 of the video. If the video is shorter than 1s (e.g. a
        // sandbox/test render), fall back to frame 0 instead of giving up on the whole thing.
        const trySeek = (seekArgs: string[]) => new Promise<boolean>((res) => {
          const args = [...seekArgs, '-i', videoPath, '-vframes', '1', '-q:v', '2', '-y', outputThumbPath];
          const thumbProcess = spawn(ffmpegPath, args);
          thumbProcess.on('close', (code) => res(code === 0 && fs.existsSync(outputThumbPath)));
          thumbProcess.on('error', () => res(false));
        });

        let ok = await trySeek(['-ss', '00:00:01']);
        if (!ok) ok = await trySeek([]);

        if (ok) {
          resolve(outputThumbPath);
        } else {
          await this.createFallbackThumbnail(outputThumbPath, ffmpegPath, hasFFmpeg);
          resolve(outputThumbPath);
        }
      } else {
        await this.createFallbackThumbnail(outputThumbPath, ffmpegPath, hasFFmpeg);
        resolve(outputThumbPath);
      }
    });
  }

  /**
   * Creates a real, valid placeholder JPEG (a solid brand-colored frame) when a real thumbnail
   * can't be extracted. This used to write raw text bytes as the "image", which browsers can't
   * decode — every card that hit this path rendered a broken image instead of any thumbnail.
   */
  private static createFallbackThumbnail(outputThumbPath: string, ffmpegPath: string, hasFFmpeg: boolean): Promise<void> {
    const parentDir = path.dirname(outputThumbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (!hasFFmpeg) {
      // No FFmpeg available at all on this worker — nothing valid can be generated locally.
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const args = [
        '-f', 'lavfi', '-i', 'color=c=0x030712:s=1080x1920:d=1',
        '-vframes', '1', '-q:v', '4', '-y', outputThumbPath
      ];
      const proc = spawn(ffmpegPath, args);
      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });
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
        previewProcess.on('close', async (code) => {
          if (code === 0 && fs.existsSync(outputPreviewPath)) {
            resolve(outputPreviewPath);
          } else {
            await this.createFallbackPreview(outputPreviewPath, ffmpegPath, hasFFmpeg);
            resolve(outputPreviewPath);
          }
        });
      } else {
        await this.createFallbackPreview(outputPreviewPath, ffmpegPath, hasFFmpeg);
        resolve(outputPreviewPath);
      }
    });
  }

  /**
   * Creates a real, valid tiny placeholder MP4 when a real preview clip can't be extracted
   * (same reasoning as createFallbackThumbnail — this used to write garbage text bytes as a
   * ".mp4", which no video player can play).
   */
  private static createFallbackPreview(outputPreviewPath: string, ffmpegPath: string, hasFFmpeg: boolean): Promise<void> {
    const parentDir = path.dirname(outputPreviewPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (!hasFFmpeg) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const args = [
        '-f', 'lavfi', '-i', 'color=c=0x030712:s=1080x1920:d=2',
        '-c:v', 'libx264', '-t', '2', '-pix_fmt', 'yuv420p', '-y', outputPreviewPath
      ];
      const proc = spawn(ffmpegPath, args);
      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });
  }
}
