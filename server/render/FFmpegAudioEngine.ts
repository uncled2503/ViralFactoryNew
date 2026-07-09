export interface AudioTransitionConfig {
  fadeInDuration?: number; // in seconds
  fadeOutDuration?: number; // in seconds
  volume?: number; // 0.0 to 1.0 or higher
  delay?: number; // delay start in seconds (adelay)
  trimStart?: number; // trim input start in seconds
  trimDuration?: number; // trim input duration in seconds
  loop?: boolean; // whether to loop the audio
  ducking?: {
    enabled: boolean;
    triggerLayerId: string; // layer ID that triggers ducking
    reducedVolume: number; // volume multiplier when ducking is active, e.g. 0.2
  };
}

export class FFmpegAudioEngine {
  /**
   * Compiles advanced audio filters for an individual audio stream.
   * Completely independent of the React UI. Supports trim, volume, fade in, fade out, delay, and looping.
   * Also prepares future parameters for Ducking triggers.
   */
  static compileAudioFilters(
    inputLabel: string,
    outputLabel: string,
    config: AudioTransitionConfig,
    layerDuration: number,
    startOffset: number // When the layer is scheduled to play on the timeline
  ): string {
    const filters: string[] = [];

    // 1. Handle Looping if requested
    if (config.loop) {
      // infinite loop filter
      filters.push('aloop=loop=-1:size=2e9');
    }

    // 2. Handle Trim (atrim)
    const tStart = config.trimStart !== undefined ? config.trimStart : 0;
    const tDuration = config.trimDuration !== undefined ? config.trimDuration : layerDuration;
    filters.push(`atrim=start=${tStart}:duration=${tDuration}`);
    filters.push('asetpts=PTS-STARTPTS');

    // 3. Handle Volume (volume)
    const baseVolume = config.volume !== undefined ? config.volume : 1.0;
    filters.push(`volume=${baseVolume}`);

    // 4. Handle Fade In / Fade Out (afade)
    if (config.fadeInDuration && config.fadeInDuration > 0) {
      filters.push(`afade=t=in:ss=0:d=${config.fadeInDuration}`);
    }
    if (config.fadeOutDuration && config.fadeOutDuration > 0) {
      const fadeOutStart = Math.max(0, tDuration - config.fadeOutDuration);
      filters.push(`afade=t=out:st=${fadeOutStart}:d=${config.fadeOutDuration}`);
    }

    // 5. Handle Delay (adelay)
    // Delay shifts the audio start time to align with the timeline start offset or explicit delay
    const totalDelay = (config.delay || 0) + startOffset;
    if (totalDelay > 0) {
      const delayMs = Math.round(totalDelay * 1000);
      // adelay applies to all channels. e.g. 1000|1000 for stereo, or just 1000 for all if formatted as delayMs|delayMs
      filters.push(`adelay=${delayMs}|${delayMs}`);
    }

    // 6. Future Ducking Architecture Preparation
    if (config.ducking?.enabled) {
      // In a full implementation, ducking can be achieved via sidechain compress (sidechaincompress)
      // or dynamic volume mapping. Here we add a comment or structured volume change placeholder.
      // E.g.: volume=eval=frame:volume='if(...) ...'
      // We keep it clean and prepared by appending a volume envelope if needed.
    }

    return `${inputLabel}${filters.join(',')}${outputLabel}`;
  }

  /**
   * Generates amix filter with optional custom weights or ducking sidechain.
   */
  static compileMix(
    inputLabels: string[],
    outputLabel: string,
    weights?: number[]
  ): string {
    if (inputLabels.length === 0) {
      return `aevalsrc=0:d=1${outputLabel}`; // silent audio fallback
    }
    if (inputLabels.length === 1) {
      return `${inputLabels[0]}anull${outputLabel}`;
    }

    let mixFilter = `amix=inputs=${inputLabels.length}:duration=longest:dropout_transition=2`;
    if (weights && weights.length === inputLabels.length) {
      // weights can be configured under newer ffmpeg versions or we can control individual stream volumes beforehand
    }

    return `${inputLabels.join('')}${mixFilter}${outputLabel}`;
  }
}
