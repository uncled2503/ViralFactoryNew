import { describe, it, expect } from 'vitest';
import { FFmpegCommandBuilder } from '../render-worker/src/render/FFmpegCommandBuilder';
import { RenderLayer } from '../render-worker/src/render/LayerEngine';

describe('FFmpeg Command Builder & Pipeline Engine Tests', () => {
  const mockPreset = {
    id: 'tiktok',
    name: 'TikTok Shorts',
    width: 1080,
    height: 1920,
    fps: 30,
    videoCodec: 'libx264',
    audioCodec: 'aac',
    videoBitrate: '4.5M',
    audioBitrate: '192k',
    crf: 20,
    speedPreset: 'fast'
  };

  it('should escape single-quotes, colons, percent signs and commas inside text layers', () => {
    const layers: RenderLayer[] = [
      {
        id: 'layer-text-complex',
        type: 'text',
        name: 'Complex Text',
        order: 1,
        data: {
          position: { x: 50, y: 100 },
          size: { width: 400, height: 100 },
          rotation: 0,
          opacity: 100,
          zIndex: 1,
          timeline: { start: 0, end: 5 },
          content: "Gabriel's text, containing: colons, 100% safety & commas!",
          styles: {
            color: '#FFFFFF',
            size: 40,
            align: 'left',
            font: 'NimbusSans'
          }
        }
      }
    ];

    const resolvedAssets = new Map<string, string>();

    const result = FFmpegCommandBuilder.build({
      ffmpegPath: 'ffmpeg',
      layers,
      resolvedAssets,
      preset: mockPreset,
      duration: 5,
      tempOutputPath: '/app/temp/test.mp4'
    });

    expect(result).toBeDefined();
    expect(result.commandString).toContain('drawtext');
    // Ensure commas are escaped
    expect(result.commandString).toContain('\\,');
    // Ensure colons are escaped
    expect(result.commandString).toContain('\\:');
    // Ensure percent signs are escaped
    expect(result.commandString).toContain('\\%');
    // Ensure single quotes are escaped
    expect(result.commandString).toContain("'\\''");
  });

  it('should position text layers correctly using alignment calculations', () => {
    const layers: RenderLayer[] = [
      {
        id: 'layer-center-text',
        type: 'text',
        name: 'Center Text',
        order: 2,
        data: {
          position: { x: 0, y: 350 },
          size: { width: 1080, height: 100 },
          rotation: 0,
          opacity: 100,
          zIndex: 2,
          timeline: { start: 0, end: 5 },
          content: 'Centered text',
          styles: {
            color: '#E2E8F0',
            size: 50,
            align: 'center',
            font: 'NimbusSans'
          }
        }
      }
    ];

    const resolvedAssets = new Map<string, string>();

    const result = FFmpegCommandBuilder.build({
      layers,
      resolvedAssets,
      preset: mockPreset,
      duration: 5,
      tempOutputPath: '/app/temp/test_center.mp4'
    });

    expect(result.commandString).toContain("x='(w-text_w)/2'");
  });

  it('should generate progress bar layers with background and active progress boxes', () => {
    const layers: RenderLayer[] = [
      {
        id: 'layer-progress-bar',
        type: 'progressbar',
        name: 'Progress Bar',
        order: 3,
        data: {
          position: { x: 0, y: 1800 },
          size: { width: 1080, height: 15 },
          rotation: 0,
          opacity: 100,
          zIndex: 3,
          timeline: { start: 0, end: 5 },
          content: '',
          styles: {
            color: '#38BDF8',
            bgColor: '#1E293B',
            height: 15
          }
        }
      }
    ];

    const resolvedAssets = new Map<string, string>();

    const result = FFmpegCommandBuilder.build({
      layers,
      resolvedAssets,
      preset: mockPreset,
      duration: 5,
      tempOutputPath: '/app/temp/test_progress.mp4'
    });

    expect(result.commandString).toContain('drawbox');
    expect(result.commandString).toContain('0x1E293B'); // Background color of progress bar
    expect(result.commandString).toContain('0x38BDF8'); // Foreground color of progress bar
  });
});
