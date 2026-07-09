import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export class StorageManager {
  private static TEMP_DIR = path.join(process.cwd(), 'temp_render');
  private static OUTPUT_DIR = path.join(process.cwd(), 'public', 'storage', 'rendered');

  static init() {
    if (!fs.existsSync(this.TEMP_DIR)) {
      fs.mkdirSync(this.TEMP_DIR, { recursive: true });
      logger.info(`Created temporary render directory at: ${this.TEMP_DIR}`);
    }
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      fs.mkdirSync(this.OUTPUT_DIR, { recursive: true });
      logger.info(`Created public output directory at: ${this.OUTPUT_DIR}`);
    }
  }

  static getTempPath(filename: string): string {
    return path.join(this.TEMP_DIR, filename);
  }

  static getOutputPath(filename: string): string {
    return path.join(this.OUTPUT_DIR, filename);
  }

  static cleanTempFile(filepath: string) {
    if (fs.existsSync(filepath)) {
      fs.unlink(filepath, (err) => {
        if (err) logger.error(`Failed to delete temp file ${filepath}:`, err);
        else logger.info(`Cleaned up temp file: ${filepath}`);
      });
    }
  }

  static getPublicUrl(filename: string): string {
    return `/storage/rendered/${filename}`;
  }
}
