import { RenderLayer } from './LayerEngine.js';
import { FFmpegAnimationEngine } from './FFmpegAnimationEngine.js';
import { FFmpegAudioEngine } from './FFmpegAudioEngine.js';
import { FFmpegSubtitleEngine, SubtitleItem, SubtitleStyleConfig } from './FFmpegSubtitleEngine.js';

export interface GraphBuilderResult {
  inputArgs: string[];
  filterComplex: string;
  outputVideoLabel: string;
  outputAudioLabel: string;
  hasAudio: boolean;
}

export interface GraphContext {
  currentLabel: string;
  inputIndexMap: Map<string, number>; // Maps layer ID or local path to its input index
  duration: number;
  width: number;
  height: number;
  audioLabels: string[];
}

export class FFmpegGraphBuilder {
  /**
   * Builds the inputs and filter_complex string for FFmpeg from the compiled Layer Engine layers.
   */
  static build(
    layers: RenderLayer[],
    resolvedAssets: Map<string, string>, // Maps layer ID -> local resolved file path
    options: { width?: number; height?: number; duration?: number } = {}
  ): GraphBuilderResult {
    const width = options.width || 1080;
    const height = options.height || 1920;
    const duration = options.duration || 30;

    const inputArgs: string[] = [];
    const fileToInputIndex = new Map<string, number>();

    // 1. Resolve Background/Canvas Input (Index 0)
    const bgLayer = layers.find(l => l.type === 'background');
    const bgVal = bgLayer?.data?.styles?.color || '#030712';
    const bgHex = bgVal.replace('#', '');

    if (bgLayer && bgLayer.data?.content && resolvedAssets.has(bgLayer.id)) {
      const bgFilePath = resolvedAssets.get(bgLayer.id)!;
      inputArgs.push('-i', bgFilePath);
      fileToInputIndex.set(bgFilePath, 0);
    } else {
      // Create solid canvas as base input 0
      inputArgs.push('-f', 'lavfi', '-i', `color=c=${bgHex}:s=${width}x${height}:d=${duration}`);
    }

    // 2. Map all other file-based layers to unique input indices
    let inputIndexCounter = 1;
    for (const layer of layers) {
      if (layer.type === 'background') continue;

      const filePath = resolvedAssets.get(layer.id);
      if (filePath) {
        if (!fileToInputIndex.has(filePath)) {
          inputArgs.push('-i', filePath);
          fileToInputIndex.set(filePath, inputIndexCounter++);
        }
      }
    }

    // Create a mapping of Layer ID -> Input Index
    const inputIndexMap = new Map<string, number>();
    for (const layer of layers) {
      const filePath = resolvedAssets.get(layer.id);
      if (filePath && fileToInputIndex.has(filePath)) {
        inputIndexMap.set(layer.id, fileToInputIndex.get(filePath)!);
      }
    }

    // 3. Build the Filter Graph Chaining
    const filterSegments: string[] = [];
    const audioFilterSegments: string[] = [];
    const audioLabels: string[] = [];

    const ctx: GraphContext = {
      currentLabel: '[0:v]', // Base background canvas
      inputIndexMap,
      duration,
      width,
      height,
      audioLabels,
    };

    // Process each layer in order of their compiled z-index/order
    for (const layer of layers) {
      const type = layer.type.toLowerCase();
      const inputIndex = inputIndexMap.get(layer.id);

      // Skip the solid color background layer as it's our base canvas [0:v]
      if (type === 'background' && !inputIndexMap.has(layer.id)) {
        continue;
      }

      // Base properties
      const x = layer.data?.position?.x ?? layer.data?.x ?? 0;
      const y = layer.data?.position?.y ?? layer.data?.y ?? 0;
      const w = layer.data?.size?.width ?? layer.data?.width ?? width;
      const h = layer.data?.size?.height ?? layer.data?.height ?? height;
      const start = layer.data?.timeline?.start ?? layer.data?.durationStart ?? 0;
      const end = layer.data?.timeline?.end ?? layer.data?.durationEnd ?? duration;
      const layerDuration = end - start;
      const opacity = layer.data?.opacity !== undefined ? layer.data.opacity : 100;
      const anims = layer.data?.animations || [];

      // Compile animations
      const compiledAnims = FFmpegAnimationEngine.compileAnimations(
        layer.id,
        x,
        y,
        w,
        h,
        start,
        end,
        opacity,
        anims
      );

      if (type === 'video') {
        if (inputIndex !== undefined) {
          const fit = layer.data?.styles?.fit || layer.data?.fit || 'cover';

          // Process Video Filter with dynamic scaling and pre-overlay filters
          const scaledLabel = `[scaled_vid_${layer.id}]`;
          const overlayLabel = `[overlay_vid_${layer.id}]`;

          let scaleAndCrop = `scale=w='${compiledAnims.scaleW}':h='${compiledAnims.scaleH}'`;
          if (fit === 'cover') {
            scaleAndCrop = `scale=w='${compiledAnims.scaleW}':h='${compiledAnims.scaleH}':force_original_aspect_ratio=increase,crop='${compiledAnims.scaleW}':'${compiledAnims.scaleH}'`;
          }

          const vidFilters = [
            scaleAndCrop,
            `trim=start=${start}:duration=${layerDuration}`,
            'setpts=PTS-STARTPTS',
            ...compiledAnims.videoFiltersBeforeOverlay,
            'format=yuva420p',
            `colorchannelmixer=aa='${compiledAnims.alpha}'`
          ];

          const videoSegment = `[${inputIndex}:v]${vidFilters.join(',')}${scaledLabel}`;
          const overlaySegment = `${ctx.currentLabel}${scaledLabel}overlay=x='${compiledAnims.x}':y='${compiledAnims.y}':enable='between(t,${start},${end})'${overlayLabel}`;

          filterSegments.push(videoSegment, overlaySegment);
          ctx.currentLabel = overlayLabel;

          // Process Audio stream if exists
          const audioLabel = `[aud_${layer.id}]`;
          const audioConf = {
            volume: layer.data?.styles?.volume ?? layer.data?.volume ?? 1.0,
            fadeInDuration: layer.data?.styles?.audioFadeIn || layer.data?.audioFadeIn || 0,
            fadeOutDuration: layer.data?.styles?.audioFadeOut || layer.data?.audioFadeOut || 0,
            delay: layer.data?.styles?.audioDelay || layer.data?.audioDelay || 0,
            trimStart: layer.data?.styles?.audioTrimStart ?? layer.data?.audioTrimStart ?? 0,
            trimDuration: layer.data?.styles?.audioTrimDuration ?? layer.data?.audioTrimDuration ?? layerDuration,
            loop: layer.data?.styles?.audioLoop || layer.data?.audioLoop || false,
          };
          const audioSegment = FFmpegAudioEngine.compileAudioFilters(
            `[${inputIndex}:a]`,
            audioLabel,
            audioConf,
            layerDuration,
            start
          );
          audioFilterSegments.push(audioSegment);
          ctx.audioLabels.push(audioLabel);
        }
      } else if (type === 'image' || type === 'logo' || type === 'watermark') {
        if (inputIndex !== undefined) {
          const scaledLabel = `[scaled_img_${layer.id}]`;
          const overlayLabel = `[overlay_img_${layer.id}]`;

          const imgFilters = [
            `scale=w='${compiledAnims.scaleW}':h='${compiledAnims.scaleH}'`,
            ...compiledAnims.videoFiltersBeforeOverlay,
            'format=yuva420p',
            `colorchannelmixer=aa='${compiledAnims.alpha}'`
          ];

          const imageSegment = `[${inputIndex}:v]${imgFilters.join(',')}${scaledLabel}`;
          const overlaySegment = `${ctx.currentLabel}${scaledLabel}overlay=x='${compiledAnims.x}':y='${compiledAnims.y}':enable='between(t,${start},${end})'${overlayLabel}`;

          filterSegments.push(imageSegment, overlaySegment);
          ctx.currentLabel = overlayLabel;
        }
      } else if (
        type === 'text' ||
        type === 'headline' ||
        type === 'subheadline' ||
        type === 'subtitle' ||
        type === 'cta'
      ) {
        const text = layer.data?.content ?? layer.data?.text ?? '';
        const color = layer.data?.styles?.color ?? layer.data?.color ?? '#FFFFFF';
        const size = layer.data?.styles?.size ?? layer.data?.size ?? 40;
        const align = layer.data?.styles?.align ?? layer.data?.align ?? 'center';

        const escapedText = text
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "'\\\\\\''")
          .replace(/:/g, '\\:')
          .replace(/%/g, '\\%');

        let xPos = compiledAnims.x;
        if (align === 'center' || xPos === '0' || xPos === '') {
          xPos = '(w-text_w)/2';
        }

        const shadowEnabled = layer.data?.styles?.shadowEnabled ?? layer.data?.shadowEnabled;
        const shadowColor = layer.data?.styles?.shadowColor ?? layer.data?.shadowColor ?? 'black';
        const shadowOffsetX = layer.data?.styles?.shadowOffsetX ?? layer.data?.shadowOffsetX ?? 2;
        const shadowOffsetY = layer.data?.styles?.shadowOffsetY ?? layer.data?.shadowOffsetY ?? 2;

        const strokeEnabled = layer.data?.styles?.strokeEnabled ?? layer.data?.strokeEnabled;
        const strokeColor = layer.data?.styles?.strokeColor ?? layer.data?.strokeColor ?? 'black';
        const strokeWidth = layer.data?.styles?.strokeWidth ?? layer.data?.strokeWidth ?? 2;

        let drawtextFilter = `drawtext=text='${escapedText}':fontcolor=${color}:fontsize=${size}:x='${xPos}':y='${compiledAnims.y}':alpha='${compiledAnims.alpha}':enable='between(t,${start},${end})'`;

        if (shadowEnabled) {
          drawtextFilter += `:shadowcolor=${shadowColor}:shadowx=${shadowOffsetX}:shadowy=${shadowOffsetY}`;
        }
        if (strokeEnabled) {
          drawtextFilter += `:borderw=${strokeWidth}:bordercolor=${strokeColor}`;
        }

        const textLabel = `[text_${layer.id}]`;
        const textSegment = `${ctx.currentLabel}${drawtextFilter}${textLabel}`;

        filterSegments.push(textSegment);
        ctx.currentLabel = textLabel;
      } else if (type === 'progressbar') {
        const color = layer.data?.styles?.color ?? layer.data?.color ?? '#6366F1';
        const bgColor = layer.data?.styles?.bgColor ?? layer.data?.bgColor ?? '#1F2937';
        const pbHeight = h || 10;
        const pbLabel = `[pb_${layer.id}]`;

        const bgBox = `drawbox=y='${compiledAnims.y}':color=${bgColor}:width=iw:height=${pbHeight}:t=fill:enable='between(t,${start},${end})'`;
        const activeBox = `drawbox=y='${compiledAnims.y}':color=${color}:width=iw*clip((t-${start})/${layerDuration},0,1):height=${pbHeight}:t=fill:enable='between(t,${start},${end})'`;

        const progressSegment = `${ctx.currentLabel}${bgBox},${activeBox}${pbLabel}`;

        filterSegments.push(progressSegment);
        ctx.currentLabel = pbLabel;
      } else if (type === 'shape') {
        const color = layer.data?.styles?.color ?? layer.data?.color ?? '#FFFFFF';
        const shapeType = layer.data?.styles?.shapeType ?? layer.data?.shapeType ?? 'rectangle';
        const shapeLabel = `[shape_${layer.id}]`;

        if (shapeType === 'rectangle') {
          const shapeSegment = `${ctx.currentLabel}drawbox=x='${compiledAnims.x}':y='${compiledAnims.y}':w='${compiledAnims.scaleW}':h='${compiledAnims.scaleH}':color=${color}:t=fill:enable='between(t,${start},${end})'${shapeLabel}`;
          filterSegments.push(shapeSegment);
          ctx.currentLabel = shapeLabel;
        }
      } else if (type === 'subtitle' || type === 'subtitlelayer' || type === 'subtitles') {
        const style: SubtitleStyleConfig = {
          font: layer.data?.styles?.font ?? layer.data?.font ?? 'Inter',
          color: layer.data?.styles?.color ?? layer.data?.color ?? '#FFFFFF',
          fontSize: layer.data?.styles?.fontSize ?? layer.data?.fontSize ?? layer.data?.styles?.size ?? layer.data?.size ?? 36,
          borderColor: layer.data?.styles?.borderColor ?? layer.data?.borderColor ?? 'black',
          borderWidth: layer.data?.styles?.borderWidth ?? layer.data?.borderWidth ?? 2,
          shadowColor: layer.data?.styles?.shadowColor ?? layer.data?.shadowColor,
          shadowOffsetX: layer.data?.styles?.shadowOffsetX ?? layer.data?.shadowOffsetX ?? 1,
          shadowOffsetY: layer.data?.styles?.shadowOffsetY ?? layer.data?.shadowOffsetY ?? 1,
          positionX: layer.data?.styles?.positionX ?? layer.data?.positionX ?? compiledAnims.x,
          positionY: layer.data?.styles?.positionY ?? layer.data?.positionY ?? compiledAnims.y,
          animationName: layer.data?.styles?.animationName ?? layer.data?.animationName ?? 'none',
        };

        const subtitleItems: SubtitleItem[] = layer.data?.subtitles || layer.data?.items || [];
        const subtitleFilePath = resolvedAssets.get(layer.id) || layer.data?.subtitleFile || layer.data?.content;

        if (subtitleFilePath && typeof subtitleFilePath === 'string' && (subtitleFilePath.endsWith('.srt') || subtitleFilePath.endsWith('.ass'))) {
          const subOutputLabel = `[native_sub_${layer.id}]`;
          const subSegment = FFmpegSubtitleEngine.compileNativeSubtitlesFilter(
            subtitleFilePath,
            style,
            ctx.currentLabel,
            subOutputLabel
          );
          filterSegments.push(subSegment);
          ctx.currentLabel = subOutputLabel;
        } else if (subtitleItems.length > 0) {
          const hasWords = subtitleItems.some(item => item.words && item.words.length > 0);
          if (hasWords) {
            const highlightColor = layer.data?.styles?.highlightColor ?? '#FBBF24';
            const compiled = FFmpegSubtitleEngine.compileWordByWordSubtitles(
              subtitleItems,
              style,
              highlightColor,
              ctx.currentLabel,
              `sub_wbyw_${layer.id}`
            );
            filterSegments.push(...compiled.filters);
            ctx.currentLabel = compiled.finalLabel;
          } else {
            const compiled = FFmpegSubtitleEngine.compileManualSubtitles(
              subtitleItems,
              style,
              ctx.currentLabel,
              `sub_man_${layer.id}`
            );
            filterSegments.push(...compiled.filters);
            ctx.currentLabel = compiled.finalLabel;
          }
        }
      } else if (type === 'audio' || type === 'audiolayer') {
        if (inputIndex !== undefined) {
          const audioLabel = `[aud_${layer.id}]`;
          const audioConf = {
            volume: layer.data?.styles?.volume ?? layer.data?.volume ?? 1.0,
            fadeInDuration: layer.data?.styles?.audioFadeIn || layer.data?.audioFadeIn || 0,
            fadeOutDuration: layer.data?.styles?.audioFadeOut || layer.data?.audioFadeOut || 0,
            delay: layer.data?.styles?.audioDelay || layer.data?.audioDelay || 0,
            trimStart: layer.data?.styles?.audioTrimStart ?? layer.data?.audioTrimStart ?? 0,
            trimDuration: layer.data?.styles?.audioTrimDuration ?? layer.data?.audioTrimDuration ?? layerDuration,
            loop: layer.data?.styles?.audioLoop || layer.data?.audioLoop || false,
          };
          const audioSegment = FFmpegAudioEngine.compileAudioFilters(
            `[${inputIndex}:a]`,
            audioLabel,
            audioConf,
            layerDuration,
            start
          );
          audioFilterSegments.push(audioSegment);
          ctx.audioLabels.push(audioLabel);
        }
      }
    }

    // Assemble the complete filter_complex string
    let filterComplex = '';
    
    // Combine video filter segments
    filterComplex += filterSegments.join(';');

    // Append audio filters if present
    if (audioFilterSegments.length > 0) {
      if (filterComplex) filterComplex += ';';
      filterComplex += audioFilterSegments.join(';');

      const mixedAudioLabel = '[mixed_audio]';
      const mixSegment = FFmpegAudioEngine.compileMix(ctx.audioLabels, mixedAudioLabel);
      filterComplex += `;${mixSegment}`;
    }

    return {
      inputArgs,
      filterComplex,
      outputVideoLabel: ctx.currentLabel,
      outputAudioLabel: ctx.audioLabels.length > 0 ? '[mixed_audio]' : '',
      hasAudio: ctx.audioLabels.length > 0,
    };
  }
}
