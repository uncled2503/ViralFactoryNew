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
        case 'scale':
          // Scale from 0 to 1, and offset x/y to keep center anchor aligned
          scaleWExpr = `if(lt(t,${start}+${dur}),${baseW}*${ease},${scaleWExpr})`;
          scaleHExpr = `if(lt(t,${start}+${dur}),${baseH}*${ease},${scaleHExpr})`;
          xExpr = `if(lt(t,${start}+${dur}),${baseX}+(${baseW}/2)*(1-${ease}),${xExpr})`;
          yExpr = `if(lt(t,${start}+${dur}),${baseY}+(${baseH}/2)*(1-${ease}),${yExpr})`;
          break;

        case 'zoom_out':
          // Scale from 2 to 1
          const factorOut = `(2-1*${ease})`;
          scaleWExpr = `if(lt(t,${start}+${dur}),${baseW}*${factorOut},${scaleWExpr})`;
          scaleHExpr = `if(lt(t,${start}+${dur}),${baseH}*${factorOut},${scaleHExpr})`;
          xExpr = `if(lt(t,${start}+${dur}),${baseX}+(${baseW}/2)*(1-${factorOut}),${xExpr})`;
          yExpr = `if(lt(t,${start}+${dur}),${baseY}+(${baseH}/2)*(1-${factorOut}),${yExpr})`;
          break;

        case 'rotate':
          // Rotate 360 degrees (2*PI radians)
          rotationExpr = `if(lt(t,${start}+${dur}),2*PI*${ease},${rotationExpr})`;
          break;
      }
    }

    // --- 2. HANDLE OUT ANIMATIONS ---
    if (outAnim) {
      const dur = outAnim.duration || 0.5;
      const t_out = `t-(${end}-${dur})`;
      const ease = getEasingExpr(t_out, dur, outAnim.easing);

      switch (outAnim.name) {
        case 'fade':
        case 'opacity':
          alphaExpr = `if(gt(t,${end}-${dur}),${targetAlpha}*(1-${ease}),${alphaExpr})`;
          break;

        case 'slide_left':
          // Exit to left of screen (-baseW)
          xExpr = `if(gt(t,${end}-${dur}),${baseX}-(${baseX}+${baseW})*${ease},${xExpr})`;
          break;

        case 'slide_right':
          // Exit to right of screen (W)
          xExpr = `if(gt(t,${end}-${dur}),${baseX}+(W-${baseX})*${ease},${xExpr})`;
          break;

        case 'slide_up':
          // Exit to top of screen (-baseH)
          yExpr = `if(gt(t,${end}-${dur}),${baseY}-(${baseY}+${baseH})*${ease},${yExpr})`;
          break;

        case 'slide_down':
          // Exit to bottom of screen (H)
          yExpr = `if(gt(t,${end}-${dur}),${baseY}+(H-${baseY})*${ease},${yExpr})`;
          break;

        case 'zoom_in':
        case 'scale':
          // Scale from 1 to 2
          const factorIn = `(1+1*${ease})`;
          scaleWExpr = `if(gt(t,${end}-${dur}),${baseW}*${factorIn},${scaleWExpr})`;
          scaleHExpr = `if(gt(t,${end}-${dur}),${baseH}*${factorIn},${scaleHExpr})`;
          xExpr = `if(gt(t,${end}-${dur}),${baseX}+(${baseW}/2)*(1-${factorIn}),${xExpr})`;
          yExpr = `if(gt(t,${end}-${dur}),${baseY}+(${baseH}/2)*(1-${factorIn}),${yExpr})`;
          break;

        case 'zoom_out':
          // Scale from 1 to 0
          const factorOut = `(1-${ease})`;
          scaleWExpr = `if(gt(t,${end}-${dur}),${baseW}*${factorOut},${scaleWExpr})`;
          scaleHExpr = `if(gt(t,${end}-${dur}),${baseH}*${factorOut},${scaleHExpr})`;
          xExpr = `if(gt(t,${end}-${dur}),${baseX}+(${baseW}/2)*(1-${factorOut}),${xExpr})`;
          yExpr = `if(gt(t,${end}-${dur}),${baseY}+(${baseH}/2)*(1-${factorOut}),${yExpr})`;
          break;

        case 'rotate':
          // Rotate another 360 degrees
          rotationExpr = `if(gt(t,${end}-${dur}),${rotationExpr}+2*PI*${ease},${rotationExpr})`;
          break;
      }
    }

    // --- 3. HANDLE LOOP ANIMATIONS ---
    for (const loop of loopAnims) {
      const dur = loop.duration || 2.0;
      const t_loop = `mod(t-${start},${dur})`;
      const ease = getEasingExpr(t_loop, dur, loop.easing);

      switch (loop.name) {
        case 'rotate':
          // Continuous rotation
          rotationExpr = `(${rotationExpr}+2*PI*${ease})`;
          break;

        case 'scale':
          // Pulse scale between 0.95 and 1.05
          const pulse = `(1+0.05*sin(2*PI*(t-${start})/${dur}))`;
          scaleWExpr = `(${scaleWExpr}*${pulse})`;
          scaleHExpr = `(${scaleHExpr}*${pulse})`;
          xExpr = `(${xExpr}+(${baseW}/2)*(1-${pulse}))`;
          yExpr = `(${yExpr}+(${baseH}/2)*(1-${pulse}))`;
          break;

        case 'opacity':
          // Pulse alpha between 0.5 and 1.0
          const alphaPulse = `(${targetAlpha}*(0.75+0.25*sin(2*PI*(t-${start})/${dur})))`;
          alphaExpr = alphaPulse;
          break;
      }
    }

    // --- 4. PREPARE ARCHITECTURE FOR KEYFRAMES ---
    if (keyframeAnim && keyframeAnim.keyframes && keyframeAnim.keyframes.length > 0) {
      // Sort keyframes by time
      const sortedKfs = [...keyframeAnim.keyframes].sort((a, b) => a.time - b.time);
      
      // We will compile the keyframes interpolation formula in FFmpeg format!
      // This uses a chain of nested 'if' statements to check which keyframe interval 't_progress' falls into.
      // progress = (t - start) / duration
      const progress = `(t-${start})/${duration}`;

      let kfX = `${baseX}`;
      let kfY = `${baseY}`;
      let kfAlpha = `${targetAlpha}`;
      let kfScale = '1';
      let kfRot = '0';

      for (let i = 0; i < sortedKfs.length - 1; i++) {
        const kf1 = sortedKfs[i];
        const kf2 = sortedKfs[i + 1];

        const t1 = kf1.time; // e.g. 0.0
        const t2 = kf2.time; // e.g. 1.0
        const intervalProgress = `(${progress}-${t1})/(${t2}-${t1})`;

        if (kf1.properties.x !== undefined && kf2.properties.x !== undefined) {
          const val1 = kf1.properties.x;
          const val2 = kf2.properties.x;
          kfX = `if(and(gte(${progress},${t1}),lt(${progress},${t2})),${val1}+(${val2}-${val1})*${intervalProgress},${kfX})`;
        }
        if (kf1.properties.y !== undefined && kf2.properties.y !== undefined) {
          const val1 = kf1.properties.y;
          const val2 = kf2.properties.y;
          kfY = `if(and(gte(${progress},${t1}),lt(${progress},${t2})),${val1}+(${val2}-${val1})*${intervalProgress},${kfY})`;
        }
        if (kf1.properties.opacity !== undefined && kf2.properties.opacity !== undefined) {
          const val1 = kf1.properties.opacity / 100;
          const val2 = kf2.properties.opacity / 100;
          kfAlpha = `if(and(gte(${progress},${t1}),lt(${progress},${t2})),${val1}+(${val2}-${val1})*${intervalProgress},${kfAlpha})`;
        }
        if (kf1.properties.scale !== undefined && kf2.properties.scale !== undefined) {
          const val1 = kf1.properties.scale;
          const val2 = kf2.properties.scale;
          kfScale = `if(and(gte(${progress},${t1}),lt(${progress},${t2})),${val1}+(${val2}-${val1})*${intervalProgress},${kfScale})`;
        }
        if (kf1.properties.rotation !== undefined && kf2.properties.rotation !== undefined) {
          const val1 = (kf1.properties.rotation * PI) / 180;
          const val2 = (kf2.properties.rotation * PI) / 180;
          kfRot = `if(and(gte(${progress},${t1}),lt(${progress},${t2})),${val1}+(${val2}-${val1})*${intervalProgress},${kfRot})`;
        }
      }

      // Merge Keyframe expressions into active equations if defined
      xExpr = kfX;
      yExpr = kfY;
      alphaExpr = kfAlpha;
      scaleWExpr = `(${baseW}*${kfScale})`;
      scaleHExpr = `(${baseH}*${kfScale})`;
      rotationExpr = kfRot;
    }

    // --- 5. BUILD PRE-OVERLAY VIDEO FILTERS ---
    // If rotation is set, we must inject a rotate filter on the layer prior to placing it in overlay
    if (rotationExpr !== '0') {
      beforeFilters.push(`rotate=angle=${rotationExpr}:ow='hypot(iw,ih)':oh='ow':c=none`);
    }

    return {
      x: xExpr,
      y: yExpr,
      alpha: alphaExpr,
      scaleW: scaleWExpr,
      scaleH: scaleHExpr,
      rotation: rotationExpr,
      videoFiltersBeforeOverlay: beforeFilters,
    };
  }
}

// Global math helper for rotation conversions
const PI = Math.PI;
