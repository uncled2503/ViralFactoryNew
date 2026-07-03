export interface VideoTransformations {
  scale?: { width: number; height: number };
  crop?: { x: number; y: number; width: number; height: number };
  fit?: 'contain' | 'cover' | 'fill';
  fillColor?: string; // Hex color for pads, e.g. "000000"
  center?: boolean;
  rotation?: 0 | 90 | 180 | 270;
  opacity?: number; // 0.0 to 1.0
  position?: { x: number | string; y: number | string };
  trim?: { start: number; duration: number };
}

export class VideoEngine {
  /**
   * Generates input arguments for trimming video stream
   */
  static buildTrimArgs(trim?: { start: number; duration: number }): string[] {
    if (!trim) return [];
    const args: string[] = [];
    if (trim.start !== undefined && trim.start > 0) {
      args.push('-ss', trim.start.toString());
    }
    if (trim.duration !== undefined && trim.duration > 0) {
      args.push('-t', trim.duration.toString());
    }
    return args;
  }

  /**
   * Translates visual alignment and scaling options into high-performance FFmpeg filter complexes
   */
  static buildFilterComplex(
    inputIndex: number,
    transformations: VideoTransformations,
    outputWidth = 1080,
    outputHeight = 1920
  ): string {
    const filters: string[] = [];
    const label = `v${inputIndex}`;

    // 1. Base input select
    let currentLabel = `[${inputIndex}:v]`;

    // 2. Rotation
    if (transformations.rotation) {
      if (transformations.rotation === 90) {
        filters.push(`${currentLabel}transpose=1[r_${label}]`);
        currentLabel = `[r_${label}]`;
      } else if (transformations.rotation === 180) {
        filters.push(`${currentLabel}hflip,vflip[r_${label}]`);
        currentLabel = `[r_${label}]`;
      } else if (transformations.rotation === 270) {
        filters.push(`${currentLabel}transpose=2[r_${label}]`);
        currentLabel = `[r_${label}]`;
      }
    }

    // 3. Cropping (if manual crop exists)
    if (transformations.crop) {
      const { x, y, width, height } = transformations.crop;
      filters.push(`${currentLabel}crop=${width}:${height}:${x}:${y}[c_${label}]`);
      currentLabel = `[c_${label}]`;
    }

    // 4. Fitting/Scaling to the canvas (contain vs cover vs fill)
    const fitMode = transformations.fit || 'contain';
    const fillCol = transformations.fillColor || '000000';
    
    if (fitMode === 'fill') {
      filters.push(`${currentLabel}scale=${outputWidth}:${outputHeight}[s_${label}]`);
      currentLabel = `[s_${label}]`;
    } else if (fitMode === 'cover') {
      // Scale to cover entire canvas, then crop excess
      filters.push(`${currentLabel}scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=increase,crop=${outputWidth}:${outputHeight}[s_${label}]`);
      currentLabel = `[s_${label}]`;
    } else {
      // Default: contain. Scale to fit while maintaining aspect ratio, pad remaining spaces
      const centerPad = transformations.center !== false;
      const xPad = centerPad ? `(ow-iw)/2` : `0`;
      const yPad = centerPad ? `(oh-ih)/2` : `0`;
      filters.push(`${currentLabel}scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:${xPad}:${yPad}:${fillCol}[s_${label}]`);
      currentLabel = `[s_${label}]`;
    }

    // 5. Opacity handling (uses format=rgba and overlay blend later, or alters lutyuv/lutrgb)
    if (transformations.opacity !== undefined && transformations.opacity < 1.0) {
      const alpha = Math.max(0, Math.min(1, transformations.opacity));
      filters.push(`${currentLabel}format=rgba,colorchannelmixer=aa=${alpha}[o_${label}]`);
      currentLabel = `[o_${label}]`;
    }

    // Return compiled sub-filter graph with its output label
    return filters.length > 0 
      ? `${filters.join(';')};${currentLabel}` 
      : `${currentLabel}null[s_${label}]`;
  }
}
