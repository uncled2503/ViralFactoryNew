export interface ExportPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  videoBitrate: string; // e.g. "4M" or "8M"
  videoCodec: 'libx264' | 'libx265' | 'h264_nvenc' | string;
  crf: number; // Constant Rate Factor (lower is higher quality, e.g. 18-23)
  audioCodec: 'aac' | 'libmp3lame' | string;
  audioBitrate: string; // e.g. "192k" or "320k"
  speedPreset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  description: string;
}

export class ExportPresetManager {
  private static presets: Record<string, ExportPreset> = {
    tiktok: {
      id: 'tiktok',
      name: 'TikTok',
      width: 1080,
      height: 1920,
      fps: 30,
      videoBitrate: '4.5M',
      videoCodec: 'libx264',
      crf: 20,
      audioCodec: 'aac',
      audioBitrate: '192k',
      speedPreset: 'fast',
      description: 'Ideal portrait format (9:16) with optimized bitrate for TikTok upload.'
    },
    reels: {
      id: 'reels',
      name: 'Instagram Reels',
      width: 1080,
      height: 1920,
      fps: 30,
      videoBitrate: '5M',
      videoCodec: 'libx264',
      crf: 19,
      audioCodec: 'aac',
      audioBitrate: '192k',
      speedPreset: 'medium',
      description: 'Optimized high-quality portrait output (9:16) for Instagram Reels.'
    },
    shorts: {
      id: 'shorts',
      name: 'YouTube Shorts',
      width: 1080,
      height: 1920,
      fps: 60,
      videoBitrate: '6M',
      videoCodec: 'libx264',
      crf: 18,
      audioCodec: 'aac',
      audioBitrate: '256k',
      speedPreset: 'medium',
      description: 'Smooth 60fps portrait output (9:16) tuned for YouTube Shorts feed.'
    },
    stories: {
      id: 'stories',
      name: 'Social Stories',
      width: 1080,
      height: 1920,
      fps: 30,
      videoBitrate: '3.5M',
      videoCodec: 'libx264',
      crf: 22,
      audioCodec: 'aac',
      audioBitrate: '128k',
      speedPreset: 'veryfast',
      description: 'Lightweight portrait video (9:16) for fast loading on Instagram/Snapchat Stories.'
    },
    feed_square: {
      id: 'feed_square',
      name: 'Square Feed (1:1)',
      width: 1080,
      height: 1080,
      fps: 30,
      videoBitrate: '4M',
      videoCodec: 'libx264',
      crf: 20,
      audioCodec: 'aac',
      audioBitrate: '192k',
      speedPreset: 'fast',
      description: 'Square aspect ratio (1:1) perfectly suited for main social media feeds.'
    },
    youtube_16_9: {
      id: 'youtube_16_9',
      name: 'YouTube Landscape (16:9)',
      width: 1920,
      height: 1080,
      fps: 60,
      videoBitrate: '12M',
      videoCodec: 'libx264',
      crf: 18,
      audioCodec: 'aac',
      audioBitrate: '320k',
      speedPreset: 'slow',
      description: 'Full HD high fidelity landscape video (16:9) with premium audio bitrate.'
    },
    facebook: {
      id: 'facebook',
      name: 'Facebook Feed',
      width: 1280,
      height: 720,
      fps: 30,
      videoBitrate: '3M',
      videoCodec: 'libx264',
      crf: 21,
      audioCodec: 'aac',
      audioBitrate: '128k',
      speedPreset: 'fast',
      description: 'Standard landscape video format (16:9 / 720p) optimized for Facebook compression.'
    }
  };

  /**
   * Retrieves a preset by ID, falling back to TikTok portrait mode if not found.
   */
  static getPreset(id: string): ExportPreset {
    const resolvedId = id.toLowerCase();
    return this.presets[resolvedId] || this.presets['tiktok'];
  }

  /**
   * Returns all available export presets.
   */
  static getAllPresets(): ExportPreset[] {
    return Object.values(this.presets);
  }
}
