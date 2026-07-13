export interface KeyframeProperty {
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  rotation?: number;
}

export interface KeyframeConfig {
  time: number; // 0 to 1 representing progress, or absolute seconds
  properties: KeyframeProperty;
}

export interface AnimationConfig {
  type: 'in' | 'out' | 'loop' | 'keyframes';
  name: 'fade' | 'slide_left' | 'slide_right' | 'slide_up' | 'slide_down' | 'zoom_in' | 'zoom_out' | 'rotate' | 'scale' | 'opacity' | string;
  duration: number; // in seconds
  easing?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';
  keyframes?: KeyframeConfig[];
}

export interface CompiledExpressions {
  x: string;
  y: string;
  alpha: string;
  scaleW: string;
  scaleH: string;
  rotation: string;
  videoFiltersBeforeOverlay: string[];
}

export class FFmpegAnimationEngine {
  /**
   * Compiles animations for a specific layer into FFmpeg-compatible filter expressions.
   */
  static compileAnimations(
    layerId: string,
    baseX: number,
    baseY: number,
    baseW: number,
    baseH: number,
    start: number,
    end: number,
    baseOpacity: number, // 0 to 100
    animations: AnimationConfig[] = []
  ): CompiledExpressions {
    const duration = end - start;
    const targetAlpha = baseOpacity / 100;

    // Default static expressions
    let xExpr = `${baseX}`;
    let yExpr = `${baseY}`;
    let alphaExpr = `${targetAlpha}`;
    let scaleWExpr = `${baseW}`;
    let scaleHExpr = `${baseH}`;
    let rotationExpr = '0';
    const beforeFilters: string[] = [];

    // Helper: Normalize easing progress time
    // t_rel is relative time from start of transition (0 to dur)
    const getEasingExpr = (t_rel: string, dur: number, easing: string = 'linear'): string => {
      const progress = `(${t_rel})/${dur}`;
      if (easing === 'ease_in') {
        return `pow(${progress},2)`;
      } else if (easing === 'ease_out') {
        return `(1-pow(1-${progress},2))`;
      } else if (easing === 'ease_in_out') {
        return `if(lt(${progress},0.5),2*pow(${progress},2),1-pow(-2*${progress}+2,2)/2)`;
      }
      return progress; // linear
    };

    // Separate animations by type
    const inAnim = animations.find(a => a.type === 'in');
    const outAnim = animations.find(a => a.type === 'out');
    const loopAnims = animations.filter(a => a.type === 'loop');
    const keyframeAnim = animations.find(a => a.type === 'keyframes');

    // --- 1. HANDLE IN ANIMATIONS ---
    if (inAnim) {
      const dur = inAnim.duration || 0.5;
      const t_in = `t-${start}`;
      const ease = getEasingExpr(t_in, dur, inAnim.easing);

      switch (inAnim.name) {
        case 'fade':
        case 'opacity':
          alphaExpr = `if(lt(t,${start}+${dur}),${targetAlpha}*${ease},${alphaExpr})`;
          break;

        case 'slide_left':
          // Start from right of screen (W) and move to baseX
          xExpr = `if(lt(t,${start}+${dur}),W-(W-${baseX})*${ease},${xExpr})`;
          break;

        case 'slide_right':
          // Start from left offscreen (-baseW) and move to baseX
          xExpr = `if(lt(t,${start}+${dur}),-${baseW}+(${baseX}+${baseW})*${ease},${xExpr})`;
          break;

        case 'slide_up':
          // Start from bottom of screen (H) and move to baseY
          yExpr = `if(lt(t,${start}+${dur}),H-(H-${baseY})*${ease},${yExpr})`;
          break;

        case 'slide_down':
          // Start from top offscreen (-baseH) and move to baseY
          yExpr = `if(lt(t,${start}+${dur}),-${baseH}+(${baseY}+${baseH})*${ease},${yExpr})`;
          break;

        case 'zoom_in':
          // Scale from 0 to 1 and adjust position to keep it centered on baseX, baseY
          scaleWExpr = `if(lt(t,${start}+${dur}),${baseW}*${ease},${scaleWExpr})`;
          scaleHExpr = `if(lt(t,${start}+${dur}),${baseH}*${ease},${scaleHExpr})`;
          xExpr = `if(lt(t,${start}+${dur}),${baseX}+(${baseW}/2)-(${baseW}*${ease}/2),${xExpr})`;
          yExpr = `if(lt(t,${start}+${dur}),${baseY}+(${baseH}/2)-(${baseH}*${ease}/2),${yExpr})`;
          break;

        case 'zoom_out':
          // Scale from 2 to 1
          scaleWExpr = `if(lt(t,${start}+${dur}),${baseW}*(2-ease),${scaleWExpr})`.replace('ease', ease);
          scaleHExpr = `if(lt(t,${start}+${dur}),${baseH}*(2-ease),${scaleHExpr})`.replace('ease', ease);
          xExpr = `if(lt(t,${start}+${dur}),${baseX}+(${baseW}/2)-(${baseW}*(2-ease)/2),${xExpr})`.replace('ease', ease);
          yExpr = `if(lt(t,${start}+${dur}),${baseY}+(${baseH}/2)-(${baseH}*(2-ease)/2),${yExpr})`.replace('ease', ease);
          break;
      }
    }

    // --- 2. HANDLE OUT ANIMATIONS ---
    if (outAnim) {
      const dur = outAnim.duration || 0.5;
      const t_out = `${end}-t`; // time remaining
      const ease = getEasingExpr(t_out, dur, outAnim.easing);

      switch (outAnim.name) {
        case 'fade':
        case 'opacity':
          alphaExpr = `if(gt(t,${end}-${dur}),${targetAlpha}*${ease},${alphaExpr})`;
          break;

        case 'slide_left':
          // Move left offscreen
          xExpr = `if(gt(t,${end}-${dur}),${baseX}-(${baseX}+${baseW})*(1-${ease}),${xExpr})`;
          break;

        case 'slide_right':
          // Move right offscreen
          xExpr = `if(gt(t,${end}-${dur}),${baseX}+(W-${baseX})*(1-${ease}),${xExpr})`;
          break;

        case 'slide_up':
          // Move up offscreen
          yExpr = `if(gt(t,${end}-${dur}),${baseY}-(${baseY}+${baseH})*(1-${ease}),${yExpr})`;
          break;

        case 'slide_down':
          // Move down offscreen
          yExpr = `if(gt(t,${end}-${dur}),${baseY}+(H-${baseY})*(1-${ease}),${yExpr})`;
          break;

        case 'zoom_in':
          // Zooms out to 0
          scaleWExpr = `if(gt(t,${end}-${dur}),${baseW}*${ease},${scaleWExpr})`;
          scaleHExpr = `if(gt(t,${end}-${dur}),${baseH}*${ease},${scaleHExpr})`;
          xExpr = `if(gt(t,${end}-${dur}),${baseX}+(${baseW}/2)-(${baseW}*${ease}/2),${xExpr})`;
          yExpr = `if(gt(t,${end}-${dur}),${baseY}+(${baseH}/2)-(${baseH}*${ease}/2),${yExpr})`;
          break;

        case 'zoom_out':
          // Zooms out to 2
          scaleWExpr = `if(gt(t,${end}-${dur}),${baseW}*(2-${ease}),${scaleWExpr})`;
          scaleHExpr = `if(gt(t,${end}-${dur}),${baseH}*(2-${ease}),${scaleHExpr})`;
          xExpr = `if(gt(t,${end}-${dur}),${baseX}+(${baseW}/2)-(${baseW}*(2-${ease})/2),${xExpr})`;
          yExpr = `if(gt(t,${end}-${dur}),${baseY}+(${baseH}/2)-(${baseH}*(2-${ease})/2),${yExpr})`;
          break;
      }
    }

    // --- 3. HANDLE LOOP ANIMATIONS ---
    loopAnims.forEach(loop => {
      const dur = loop.duration || 2.0;
      const name = loop.name;

      if (name === 'rotate') {
        rotationExpr = `(t*360/${dur})`;
      } else if (name === 'scale' || name === 'pulse') {
        const osc = `(sin(2*PI*t/${dur})+1)/2`; // oscillating 0 to 1
        const scaleFactor = `(1+0.1*${osc})`; // pulses between 1.0 and 1.1
        scaleWExpr = `${scaleWExpr}*${scaleFactor}`;
        scaleHExpr = `${scaleHExpr}*${scaleFactor}`;
        xExpr = `${xExpr}+(${baseW}/2)-(${baseW}*${scaleFactor}/2)`;
        yExpr = `${yExpr}+(${baseH}/2)-(${baseH}*${scaleFactor}/2)`;
      } else if (name === 'opacity' || name === 'blink') {
        const osc = `(sin(2*PI*t/${dur})+1)/2`;
        alphaExpr = `${alphaExpr}*(0.3+0.7*${osc})`; // pulse alpha between 0.3 and 1.0
      }
    });

    // --- 4. HANDLE CUSTOM KEYFRAME EXPRESSIONS ---
    if (keyframeAnim && keyframeAnim.keyframes && keyframeAnim.keyframes.length >= 2) {
      // Keyframe animation parses values using evaluate interpolation
      // We skip building infinite expressions here for speed unless explicitly demanded
    }

    return {
      x: xExpr,
      y: yExpr,
      alpha: alphaExpr,
      scaleW: scaleWExpr,
      scaleH: scaleHExpr,
      rotation: rotationExpr,
      videoFiltersBeforeOverlay: beforeFilters
    };
  }
}
