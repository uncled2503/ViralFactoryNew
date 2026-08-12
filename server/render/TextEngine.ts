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
