import { RenderLayer } from './LayerEngine.js';
import { FFmpegGraphBuilder } from './FFmpegGraphBuilder.js';

export interface ExportPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec: string;
  videoBitrate: string;
  audioBitrate: string;
  crf: number;
  speedPreset: string;
}

export interface CommandBuilderResult {
  command: string;       // Path/name of the executable (usually 'ffmpeg')
  args: string[];        // Array of fully dynamic command line arguments
  commandString: string;  // Highly detailed command line string for logs and debugging
  hasAudio: boolean;
  outputVideoLabel: string;
  outputAudioLabel: string;
}

export class FFmpegCommandBuilder {
  /**
   * Translates visual layers and output parameters directly into a fully formed list of arguments for executing FFmpeg.
   */
  static build(params: {
    ffmpegPath?: string;
    layers: RenderLayer[];
    resolvedAssets: Map<string, string>;
    preset: ExportPreset;
    duration: number;
    tempOutputPath: string;
  }): CommandBuilderResult {
    const {
      ffmpegPath = 'ffmpeg',
      layers,
      resolvedAssets,
      preset,
      duration,
      tempOutputPath
    } = params;

    const graph = FFmpegGraphBuilder.build(layers, resolvedAssets, {
      width: preset.width,
      height: preset.height,
      duration: duration
    });

    const args: string[] = [];

    // Feed dynamic input files
    args.push(...graph.inputArgs);

    // Inject the compiled filter_complex segment
    args.push('-filter_complex', graph.filterComplex);

    // Map the final composite video stream
    args.push('-map', graph.outputVideoLabel);

    // Map the final combined audio stream if active audio elements were processed
    if (graph.hasAudio) {
      args.push('-map', graph.outputAudioLabel);
      args.push('-c:a', preset.audioCodec);
      args.push('-b:a', preset.audioBitrate);
    }

    // Define output container and compression parameters from the preset
    args.push(
      '-c:v', preset.videoCodec,
      '-pix_fmt', 'yuv420p',
      '-r', `${preset.fps}`,
      '-b:v', preset.videoBitrate,
      '-crf', `${preset.crf}`,
      '-preset', preset.speedPreset,
      '-t', `${duration}`,
      '-y',
      tempOutputPath
    );

    const sanitizedArgs = args.map(arg => {
      if (arg.includes(' ') || arg.includes(';') || arg.includes(',') || arg.includes('|') || arg.includes('&') || arg.includes('=')) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    });
    const commandString = `${ffmpegPath} ${sanitizedArgs.join(' ')}`;

    return {
      command: ffmpegPath,
      args,
      commandString,
      hasAudio: graph.hasAudio,
      outputVideoLabel: graph.outputVideoLabel,
      outputAudioLabel: graph.outputAudioLabel
    };
  }
}
