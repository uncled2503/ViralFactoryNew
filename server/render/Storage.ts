import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

export class StorageManager {
  private static STORAGE_DIR = path.join(process.cwd(), 'public', 'storage');
  private static TEMP_DIR = path.join(process.cwd(), 'temp_render');

  static init() {
    // Ensure storage folders exist
    const dirs = [
      this.STORAGE_DIR,
      path.join(this.STORAGE_DIR, 'uploads'),
      path.join(this.STORAGE_DIR, 'rendered'),
      path.join(this.STORAGE_DIR, 'templates'),
      this.TEMP_DIR
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  static getStoragePath(folder: 'uploads' | 'rendered' | 'templates', fileName: string): string {
    return path.join(this.STORAGE_DIR, folder, fileName);
  }

  static getTempPath(fileName: string): string {
    return path.join(this.TEMP_DIR, fileName);
  }

  static getPublicUrl(folder: 'uploads' | 'rendered' | 'templates', fileName: string): string {
    return `/storage/${folder}/${fileName}`;
  }

  /**
   * Downloads a remote file to the local temp directory for processing
   */
  static downloadFile(url: string, destName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const destPath = this.getTempPath(destName);
      const file = fs.createWriteStream(destPath);
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: Status Code ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(destPath);
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {}); // Clean up
        reject(err);
      });
    });
  }

  /**
   * Moves a processed file to permanent storage
   */
  static saveToStorage(tempPath: string, folder: 'uploads' | 'rendered' | 'templates', fileName: string): string {
    const destPath = this.getStoragePath(folder, fileName);
    
    // Ensure target folder exists
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.copyFileSync(tempPath, destPath);
    try {
      fs.unlinkSync(tempPath);
    } catch (e) {
      // Ignored
    }

    return this.getPublicUrl(folder, fileName);
  }

  /**
   * Retrieves file size in MB
   */
  static getFileSizeMB(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size / (1024 * 1024);
    } catch {
      return 0;
    }
  }

  /**
   * Clean up a temp file
   */
  static deleteTempFile(fileName: string) {
    const filePath = this.getTempPath(fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error(`Failed to delete temp file ${fileName}:`, e);
      }
    }
  }

  /**
   * Clean up all temporary rendering files
   */
  static clearTempDir() {
    if (fs.existsSync(this.TEMP_DIR)) {
      const files = fs.readdirSync(this.TEMP_DIR);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(this.TEMP_DIR, file));
        } catch (e) {
          // Ignored
        }
      }
    }
  }
}
