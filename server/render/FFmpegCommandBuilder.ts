import { RenderLayer } from './LayerEngine';
import { ExportPreset } from './ExportPresetManager';
import { FFmpegGraphBuilder } from './FFmpegGraphBuilder';

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
   * Translates visual layers, active dynamic placeholders, and output parameters
   * directly into a fully formed, dynamic list of arguments for executing FFmpeg.
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

    // 1. Convert visual layer array into filters and layout mappings using FFmpegGraphBuilder
    const graph = FFmpegGraphBuilder.build(layers, resolvedAssets, {
      width: preset.width,
      height: preset.height,
      duration: duration
    });

    const args: string[] = [];

    // 2. Feed dynamic input files (or synthetic video canvases if no background media exists)
    args.push(...graph.inputArgs);

    // 3. Inject the compiled filter_complex segment
    args.push('-filter_complex', graph.filterComplex);

    // 4. Map the final composite video stream
    args.push('-map', graph.outputVideoLabel);

    // 5. Map the final combined audio stream if active audio elements were processed
    if (graph.hasAudio) {
      args.push('-map', graph.outputAudioLabel);
      args.push('-c:a', preset.audioCodec);
      args.push('-b:a', preset.audioBitrate);
    }

    // 6. Define output container and compression parameters from the preset JSON
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

    // 7. Format a command-line compatible representation for transparent pipeline logging
    const sanitizedArgs = args.map(arg => {
      // Wrap filters or paths containing special characters in quotes for ease of inspection
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
