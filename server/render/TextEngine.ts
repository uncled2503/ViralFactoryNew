export class TextEngine {
  /**
   * Substitutes all dynamic variables in a given template string with project values
   */
  static parse(text: string, variables: Record<string, any>): string {
    if (!text) return '';

    let parsed = text;

    // Direct mappings
    const mappings: Record<string, string> = {
      HEADLINE: variables.headline || variables.title || '',
      SUBHEADLINE: variables.subheadline || (variables.subtitles && variables.subtitles[0]) || '',
      CTA: variables.cta || 'Siga para ver mais!',
      INSTAGRAM: variables.instagram || variables.username || 'viral_factory',
      USERNAME: variables.username || 'viralfactory',
      PRICE: variables.price || 'R$ 0,00',
      DATE: variables.date || new Date().toLocaleDateString('pt-BR'),
    };

    // Replace {{VAR}} tags
    Object.entries(mappings).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      parsed = parsed.replace(regex, val);
    });

    // Replace any leftover unknown placeholders with empty string
    parsed = parsed.replace(/{{\s*[\w_-]+\s*}}/g, '');

    return parsed.trim();
  }

  /**
   * Escapes text specifically for single-quoted FFmpeg drawtext filter option
   */
  static escapeDrawtext(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/:/g, '\\:')
      .replace(/%/g, '\\%');
  }

  /**
   * Validates/normalizes a color value before it's interpolated into an FFmpeg filter string.
   * Template/project style fields reach these filters as plain, unvalidated strings — a value
   * like `black'; movie=/etc/passwd; drawtext=text='x` would otherwise break out of the quoted
   * `color='...'` option and inject arbitrary filter_complex syntax. Only #hex (converted to
   * FFmpeg's 0xRRGGBB form) or a plain alphanumeric color name (FFmpeg's named-color set) is
   * accepted; anything else falls back to the given default.
   */
  static safeColor(value: any, fallback = 'white'): string {
    const c = String(value ?? '').trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) {
      return '0x' + c.slice(1);
    }
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(c)) {
      return c;
    }
    return fallback;
  }

  /**
   * Validates a numeric style field (fontsize, strokeWidth, shadow offsets, bar heights, etc.)
   * before it's interpolated UNQUOTED into an FFmpeg filter string (e.g. `fontsize=${size}`) —
   * unlike quoted color/text options, these have no escaping at all, so any non-numeric string
   * (e.g. "40:textfile=/etc/passwd") injects new filter options outright. Returns a finite
   * number clamped to [min, max], or the fallback if the input isn't a valid number.
   */
  static safeNumber(value: any, fallback: number, min = -100000, max = 100000): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  /**
   * Cleans text to prevent CLI injection and breaks long lines into subtitles
   */
  static sanitizeAndWrap(text: string, maxCharsPerLine = 35): string[] {
    const sanitized = this.escapeDrawtext(text);

    if (sanitized.length <= maxCharsPerLine) {
      return [sanitized];
    }

    const words = sanitized.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
