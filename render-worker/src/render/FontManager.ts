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
      path.resolve(currentCwd, 'render-worker/fonts/DejaVuSans.ttf'),
      ...(moduleDir ? [
        path.resolve(moduleDir, '../../fonts/DejaVuSans.ttf'),
        path.resolve(moduleDir, '../fonts/DejaVuSans.ttf'),
      ] : []),
      path.resolve(currentCwd, 'fonts/DejaVuSans.ttf'),
      path.resolve(currentCwd, 'server/fonts/DejaVuSans.ttf'),

      path.resolve(currentCwd, 'render-worker/fonts/LiberationSans-Regular.ttf'),
      path.resolve(currentCwd, 'fonts/LiberationSans-Regular.ttf'),
      path.resolve(currentCwd, 'server/fonts/LiberationSans-Regular.ttf'),

      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/freefont/FreeSans.ttf',

      'C:\\Windows\\Fonts\\arial.ttf',
      'C:\\Windows\\Fonts\\segoeui.ttf',
    ];

    for (const fontPath of candidates) {
      if (this.validateFontFile(fontPath) && !this.isLikelyCorruptedFont(fontPath)) {
        const resolvedPath = path.resolve(fontPath);
        this.cachedFontPath = resolvedPath;
        return resolvedPath;
      }
    }

    const checkedList = candidates.join('\n  - ');
    throw new Error(`Default render font not found. Checked candidate paths:\n  - ${checkedList}`);
  }

  /**
   * Resolves the absolute path to the bundled fontconfig configuration file, if present.
   * Windows FFmpeg full builds link against libfontconfig for the drawtext filter and
   * crash with an access violation when they can't locate a config file.
   */
  static getFontConfigFilePath(): string | null {
    const currentCwd = process.cwd();
    let moduleDir = '';
    try {
      if (typeof __dirname !== 'undefined') {
        moduleDir = __dirname;
      }
    } catch {}

    const candidates = [
      path.resolve(currentCwd, 'render-worker/fonts/fonts.conf'),
      ...(moduleDir ? [
        path.resolve(moduleDir, '../../fonts/fonts.conf'),
        path.resolve(moduleDir, '../fonts/fonts.conf'),
      ] : []),
      path.resolve(currentCwd, 'fonts/fonts.conf'),
      path.resolve(currentCwd, 'server/fonts/fonts.conf'),
    ];

    for (const confPath of candidates) {
      if (this.validateFontFile(confPath)) {
        return path.resolve(confPath);
      }
    }
    return null;
  }

  /**
   * Env vars to merge into an FFmpeg child process so fontconfig can locate its config
   * instead of crashing. Returns {} when no bundled fonts.conf is found (e.g. Linux
   * containers with system fontconfig already configured).
   */
  static getFontConfigEnv(): Record<string, string> {
    const confPath = this.getFontConfigFilePath();
    return confPath ? { FONTCONFIG_FILE: confPath } : {};
  }

  /**
   * Detects TTF/OTF binaries that were mangled by a text/UTF-8 processing step
   * (e.g. a bad git filter or editor save), which is invisible to size/readability
   * checks but makes FreeType fail to parse the font, crashing FFmpeg's drawtext
   * filter. Mangled bytes get replaced with the UTF-8 replacement char (EF BF BD);
   * a handful of coincidental occurrences in real glyph data is normal, thousands
   * is corruption.
   */
  private static isLikelyCorruptedFont(filePath: string): boolean {
    try {
      const data = fs.readFileSync(filePath);
      let replacementCount = 0;
      for (let i = 0; i < data.length - 2; i++) {
        if (data[i] === 0xef && data[i + 1] === 0xbf && data[i + 2] === 0xbd) {
          replacementCount++;
          if (replacementCount > 20) return true;
        }
      }
      return false;
    } catch {
      return true;
    }
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

    // Escape single quotes first (order matters: this must run before the colon escape
    // below, otherwise it would double-escape the backslash that colon escaping inserts).
    normalized = normalized.replace(/'/g, "'\\''");

    // Escape colons even inside the single-quoted value. Despite appearances, FFmpeg's
    // filtergraph parser does NOT treat ':' as literal within '...' — a drive-letter
    // colon right after the opening quote (e.g. fontfile='C:/Windows/...') terminates
    // the quoted value early and breaks parsing ("No option name near ..."). FFmpeg's
    // drawtext filter unescapes '\:' back to ':' before the path reaches fopen, so this
    // is safe for real filesystem paths.
    normalized = normalized.replace(/:/g, '\\:');

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
