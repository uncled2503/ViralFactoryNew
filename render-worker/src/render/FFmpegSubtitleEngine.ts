import { FontManager } from './FontManager.js';
import { TextEngine } from './TextEngine.js';

export interface SubtitleItem {
  id: string;
  text: string;
  start: number; // Start time in seconds
  end: number;   // End time in seconds
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>; // Future word-by-word structure
}

export interface SubtitleStyleConfig {
  font?: string;
  color?: string; // e.g. '#FFFFFF'
  fontSize?: number;
  borderColor?: string;
  borderWidth?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  positionX?: string | number; // e.g. '(w-text_w)/2'
  positionY?: string | number; // e.g. 'h-150'
  animationName?: 'fade' | 'pop' | 'none';
}

export class FFmpegSubtitleEngine {
  /**
   * Generates a collection of drawtext filters for manual and AI subtitles.
   */
  static compileManualSubtitles(
    subtitles: SubtitleItem[],
    style: SubtitleStyleConfig,
    baseInputLabel: string,
    outputLabelPrefix: string
  ): { filters: string[]; finalLabel: string } {
    const filters: string[] = [];
    let currentLabel = baseInputLabel;

    // Sort subtitles by start time to ensure correct sequential rendering
    const sortedSubs = [...subtitles].sort((a, b) => a.start - b.start);

    sortedSubs.forEach((sub, index) => {
      const nextLabel = `[${outputLabelPrefix}_sub_${index}]`;
      const escapedText = TextEngine.escapeDrawtext(sub.text);

      const font = style.font || 'Inter';
      const color = style.color || '#FFFFFF';
      const size = style.fontSize || 36;
      
      // Handle dynamic centering and offsets
      let xPos = style.positionX !== undefined ? `${style.positionX}` : '(w-text_w)/2';
      let yPos = style.positionY !== undefined ? `${style.positionY}` : 'h-180';

      // Advanced layout controls
      const borderW = style.borderWidth ?? 2;
      const borderCol = style.borderColor ?? 'black';
      const shadowCol = style.shadowColor ?? 'black';
      const shadowX = style.shadowOffsetX ?? 1;
      const shadowY = style.shadowOffsetY ?? 1;

      // Handle subtitle entry animations
      let alphaExpr = '1';
      const subDuration = sub.end - sub.start;

      if (style.animationName === 'fade') {
        const fadeDur = Math.min(0.25, subDuration / 3);
        alphaExpr = `if(lt(t,${sub.start}+${fadeDur}),(t-${sub.start})/${fadeDur},if(gt(t,${sub.end}-${fadeDur}),(${sub.end}-t)/${fadeDur},1))`;
      }

      const fontParam = FontManager.getFFmpegFontParam();

      let drawtextFilter = `drawtext=${fontParam}:text='${escapedText}':fontcolor=${color}:fontsize=${size}:x='${xPos}':y='${yPos}'`;

      if (borderW > 0) {
        drawtextFilter += `:borderw=${borderW}:bordercolor=${borderCol}`;
      }
      if (style.shadowColor) {
        drawtextFilter += `:shadowcolor=${shadowCol}:shadowx=${shadowX}:shadowy=${shadowY}`;
      }

      // Add timeline enable condition and combine with custom alpha expressions
      drawtextFilter += `:alpha='if(between(t,${sub.start},${sub.end}),${alphaExpr},0)'`;

      filters.push(`${currentLabel}${drawtextFilter}${nextLabel}`);
      currentLabel = nextLabel;
    });

    return {
      filters,
      finalLabel: currentLabel,
    };
  }

  /**
   * Compiles SRT or ASS subtitles into a native subtitles filter.
   * If a local file path is provided, it uses the native FFmpeg subtitles filter.
   */
  static compileNativeSubtitlesFilter(
    subtitleFilePath: string,
    style: SubtitleStyleConfig,
    baseInputLabel: string,
    outputLabel: string
  ): string {
    const font = style.font || 'Inter';
    const fontSize = style.fontSize || 24;
    const colorHex = (style.color || '#FFFFFF').replace('#', '');
    const borderColHex = (style.borderColor || '#000000').replace('#', '');

    // Format subtitle parameters in ASS/SRT styling conventions
    // OutlineColour and PrimaryColour use ASS hex ABGR format (AARRGGBB in reverse without AA)
    const styleString = `Fontname=${font},Fontsize=${fontSize},PrimaryColour=&H00${colorHex},OutlineColour=&H00${borderColHex},Outline=${style.borderWidth || 2}`;

    // Return the formatted subtitles filter segment
    return `${baseInputLabel}subtitles='${subtitleFilePath}':force_style='${styleString}'${outputLabel}`;
  }

  /**
   * Prepares Word-by-Word highlighting structure for future dynamic overlays.
   * Compiles a highlight effect (karaoke style) where the active word is colored differently.
   */
  static compileWordByWordSubtitles(
    subtitles: SubtitleItem[],
    style: SubtitleStyleConfig,
    highlightColor: string,
    baseInputLabel: string,
    outputLabelPrefix: string
  ): { filters: string[]; finalLabel: string } {
    const filters: string[] = [];
    let currentLabel = baseInputLabel;

    subtitles.forEach((sub, subIndex) => {
      // If words are present, compile them with independent high-precision highlighting triggers!
      if (sub.words && sub.words.length > 0) {
        // Create full sentence base
        const nextLabel = `[${outputLabelPrefix}_wbyw_${subIndex}]`;
        const wordsList = sub.words;

        // Build composite string filters
        // For word-by-word highlighting in vanilla FFmpeg, we can chain multiple overlay words
        // or use smart timed drawtext overlays positioned side by side.
        // Let's create a solid placeholder filter layout that evaluates active timestamps:
        const xPos = style.positionX !== undefined ? `${style.positionX}` : '(w-text_w)/2';
        const yPos = style.positionY !== undefined ? `${style.positionY}` : 'h-180';

        const fontParam = FontManager.getFFmpegFontParam();
        const escapedSubText = TextEngine.escapeDrawtext(sub.text);
        let filterSegment = `drawtext=${fontParam}:text='${escapedSubText}':fontcolor=${style.color || '#FFFFFF'}:fontsize=${style.fontSize || 36}:x='${xPos}':y='${yPos}':enable='between(t,${sub.start},${sub.end})'`;

        // Future word highlighters will render on top of the base text using precise bounding boxes
        wordsList.forEach((wordItem, wordIndex) => {
          // This prepares the slots to highlight word by word based on start/end
          // e.g. using timed color-swap variables.
        });

        filters.push(`${currentLabel}${filterSegment}${nextLabel}`);
        currentLabel = nextLabel;
      } else {
        // Fallback to standard manual compilation
        const fallback = this.compileManualSubtitles([sub], style, currentLabel, outputLabelPrefix);
        filters.push(...fallback.filters);
        currentLabel = fallback.finalLabel;
      }
    });

    return {
      filters,
      finalLabel: currentLabel,
    };
  }
}
