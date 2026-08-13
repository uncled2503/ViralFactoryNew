import fs from 'fs';
import path from 'path';

export class FontManager {
  private static cachedFontPath: string | null = null;

  /**
   * Resolves the absolute path to a default TTF font file.
   * Throws an explicit error if no valid font file is found.
   */
  static getDefaultFontPath(): string {
    if (this.cachedFontPath && this.validateFontFile(this.cachedFontPath)) {
      return this.cachedFontPath;
    }

    const currentCwd = process.cwd();
    let moduleDir = '';
    try {
      if (typeof __dirname !== 'undefined') {
        moduleDir = __dirname;
      }
    } catch {}

    // Candidate locations in priority order
    const candidates = [
      path.resolve(currentCwd, 'server/fonts/DejaVuSans.ttf'),
      path.resolve(currentCwd, 'render-worker/fonts/DejaVuSans.ttf'),
      ...(moduleDir ? [
        path.resolve(moduleDir, '../../fonts/DejaVuSans.ttf'),
        path.resolve(moduleDir, '../fonts/DejaVuSans.ttf'),
      ] : []),
      path.resolve(currentCwd, 'fonts/DejaVuSans.ttf'),

      path.resolve(currentCwd, 'server/fonts/LiberationSans-Regular.ttf'),
      path.resolve(currentCwd, 'render-worker/fonts/LiberationSans-Regular.ttf'),
      path.resolve(currentCwd, 'fonts/LiberationSans-Regular.ttf'),

      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/freefont/FreeSans.ttf',

      'C:\\Windows\\Fonts\\arial.ttf',
      'C:\\Windows\\Fonts\\segoeui.ttf',
    ];

    for (const fontPath of candidates) {
      if (this.validateFontFile(fontPath)) {
        const resolvedPath = path.resolve(fontPath);
        this.cachedFontPath = resolvedPath;
        return resolvedPath;
      }
    }

    const checkedList = candidates.join('\n  - ');
    throw new Error(`Default render font not found. Checked candidate paths:\n  - ${checkedList}`);
  }

  /**
   * Validates that the font path exists, is a file, non-empty, and readable
   */
  static validateFontFile(filePath: string): boolean {
    try {
      if (!filePath) return false;
      if (!fs.existsSync(filePath)) return false;
      const stats = fs.statSync(filePath);
      if (!stats.isFile() || stats.size === 0) return false;
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Formats a font file path into a safe value for FFmpeg's drawtext filter.
   * Prefers a relative path from process.cwd() when inside the project tree to avoid drive letter colons and special characters.
   * Converts Windows backslashes to forward slashes and escapes single quotes.
   */
  static formatFontPathForFFmpeg(filePath: string): string {
    const absPath = path.resolve(filePath);
    const relPath = path.relative(process.cwd(), absPath);
    let targetPath = absPath;

    // Prefer relative path if it's within the current working directory
    if (relPath && !relPath.startsWith('..') && !path.isAbsolute(relPath)) {
      targetPath = relPath;
    }

    // Convert Windows backslashes to forward slashes for FFmpeg compatibility
    let normalized = targetPath.replace(/\\/g, '/');

    // DO NOT escape colons with backslashes when wrapped in single quotes!
    // In FFmpeg, inside single quotes '...', colons are literal.
    // Adding a backslash before the colon ('C\:') creates an invalid Win32 drive path in C runtime fopen.
    normalized = normalized.replace(/'/g, "'\\''");

    return normalized;
  }

  /**
   * Returns pre-formatted fontfile parameter for FFmpeg drawtext filter, e.g.
   * fontfile='C\:/path/to/font.ttf'
   */
  static getFFmpegFontParam(): string {
    const fontPath = this.getDefaultFontPath();
    const formatted = this.formatFontPathForFFmpeg(fontPath);
    return `fontfile='${formatted}'`;
  }

  /**
   * Logs font diagnostics prior to running FFmpeg
   */
  static logFontDiagnostics(logger: (msg: string) => void = console.log): string {
    try {
      const fontPath = this.getDefaultFontPath();
      const exists = fs.existsSync(fontPath);
      let readable = false;
      try {
        fs.accessSync(fontPath, fs.constants.R_OK);
        readable = true;
      } catch {}

      logger(`[FFmpeg Font] Using font: ${fontPath}`);
      logger(`[FFmpeg Font] Exists: ${exists}`);
      logger(`[FFmpeg Font] Readable: ${readable}`);

      return fontPath;
    } catch (err: any) {
      logger(`[FFmpeg Font] ERROR: ${err.message}`);
      throw err;
    }
  }
}
