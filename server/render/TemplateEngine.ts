import { Template, Project } from '../../src/types';

export interface TemplateJSON {
  width: number;
  height: number;
  duration: number;
  layers: TemplateLayerJSON[];
  presetId?: string;
}

export interface TemplateLayerJSON {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  opacity: number;
  zIndex: number;
  timeline: { start: number; end: number };
  animations: any[];
  content: string;
  styles: Record<string, any>;
}

// Retained for backward-compatibility with legacy layers
export interface CompiledLayout {
  aspect: '9:16' | '16:9' | '1:1';
  duration: number;
  background: {
    type: 'color' | 'image' | 'video';
    value: string;
    opacity: number;
  };
  videoArea: {
    x: number;
    y: number;
    width: number;
    height: number;
    videoUrl?: string;
    trim?: { start: number; duration: number };
    fit: 'contain' | 'cover' | 'fill';
  };
  headline?: {
    text: string;
    font: string;
    color: string;
    size: number;
    x: number;
    y: number;
  };
  subheadline?: {
    text: string;
    font: string;
    color: string;
    size: number;
    x: number;
    y: number;
  };
  cta?: {
    text: string;
    font: string;
    color: string;
    size: number;
    x: number;
    y: number;
  };
  logo?: {
    url: string;
    x: number;
    y: number;
    size: number;
    opacity: number;
  };
  subtitles?: {
    enabled: boolean;
    text: string[];
    font: string;
    color: string;
    size: number;
    y: number;
  };
  watermark?: {
    url: string;
    x: number;
    y: number;
    size: number;
    opacity: number;
  };
  progressBar?: {
    enabled: boolean;
    color: string;
    bgColor: string;
    height: number;
    y: number;
  };
}

export class TemplateEngine {
  /**
   * Helper to fetch or generate the standardized TemplateJSON from project/template details.
   * Promotes fully decoupled template JSON execution in the Render Engine.
   */
  static getTemplateJson(template: any, project: any): TemplateJSON {
    const vars = project?.variables || {};
    
    // 1. If we already have the pre-compiled templateJson saved inside project variables
    if (vars.templateJson) {
      const parsed = typeof vars.templateJson === 'string' 
        ? JSON.parse(vars.templateJson) 
        : vars.templateJson;

      if (vars.videoZone && parsed.layers) {
        const isVideoLayer = (layer: any) =>
          String(layer.type || '').toLowerCase() === 'video' ||
          String(layer.id || '').toLowerCase().includes('video');

        if (!parsed.layers.some(isVideoLayer)) {
          console.warn(`[TemplateEngine] videoZone was set but no layer in this template's saved templateJson matched a video layer (checked type==='video' or id containing 'video'). The user's chosen video position was NOT applied — layer ids: ${parsed.layers.map((l: any) => `${l.id}(${l.type})`).join(', ')}`);
        }

        parsed.layers = parsed.layers.map((layer: any) => {
          if (isVideoLayer(layer)) {
            return {
              ...layer,
              position: { x: vars.videoZone.x, y: vars.videoZone.y },
              size: { width: vars.videoZone.width, height: vars.videoZone.height },
              rotation: vars.videoZone.rotation !== undefined ? vars.videoZone.rotation : (layer.rotation || 0),
              opacity: vars.videoZone.opacity !== undefined ? vars.videoZone.opacity : (layer.opacity !== undefined ? layer.opacity : 100),
              zIndex: vars.videoZone.zIndex !== undefined ? vars.videoZone.zIndex : (layer.zIndex || 1),
              styles: {
                ...layer.styles,
                fit: vars.videoZone.scaleMode || 'cover'
              }
            };
          }
          return layer;
        });
      }
      return parsed;
    }

    // 2. Fallback: Parse canvas and layers directly from editor variables
    if (vars.canvas && vars.layers) {
      return {
        width: vars.canvas.width || 1080,
        height: vars.canvas.height || 1920,
        duration: project.totalDuration || template?.duration_seconds || template?.default_duration || 30,
        layers: vars.layers.map((layer: any) => {
          const isVideo = String(layer.type || '').toLowerCase() === 'video' || String(layer.id || '').toLowerCase().includes('video');
          return {
            id: layer.id,
            type: layer.type,
            position: (isVideo && vars.videoZone) 
              ? { x: vars.videoZone.x, y: vars.videoZone.y } 
              : { x: layer.x, y: layer.y },
            size: (isVideo && vars.videoZone) 
              ? { width: vars.videoZone.width, height: vars.videoZone.height } 
              : { width: layer.width, height: layer.height },
            rotation: (isVideo && vars.videoZone && vars.videoZone.rotation !== undefined)
              ? vars.videoZone.rotation
              : (layer.rotation || 0),
            opacity: (isVideo && vars.videoZone && vars.videoZone.opacity !== undefined)
              ? vars.videoZone.opacity
              : (layer.opacity !== undefined ? layer.opacity : 100),
            zIndex: (isVideo && vars.videoZone && vars.videoZone.zIndex !== undefined)
              ? vars.videoZone.zIndex
              : (layer.order || 0),
            timeline: { start: layer.durationStart || 0, end: layer.durationEnd || 30 },
            animations: layer.animationIn || layer.animationOut ? [
              { type: 'in', name: layer.animationIn || 'none', duration: layer.animationDuration || 0.5 },
              { type: 'out', name: layer.animationOut || 'none', duration: layer.animationDuration || 0.5 }
            ] : [],
            content: layer.text || layer.contentUrl || layer.placeholder || '',
            styles: {
              color: layer.color,
              font: layer.font,
              size: layer.size,
              weight: layer.weight,
              spacing: layer.spacing,
              align: layer.align,
              anchor: layer.anchor,
              shadowEnabled: layer.shadowEnabled,
              shadowColor: layer.shadowColor,
              shadowBlur: layer.shadowBlur,
              shadowOffsetX: layer.shadowOffsetX,
              shadowOffsetY: layer.shadowOffsetY,
              glowEnabled: layer.glowEnabled,
              glowColor: layer.glowColor,
              glowBlur: layer.glowBlur,
              strokeEnabled: layer.strokeEnabled,
              strokeColor: layer.strokeColor,
              strokeWidth: layer.strokeWidth,
              radius: layer.radius,
              padding: layer.padding,
              margin: layer.margin,
              shapeType: layer.shapeType,
              overlayType: layer.overlayType,
              gradientColorStart: layer.gradientColorStart,
              gradientColorEnd: layer.gradientColorEnd,
              fit: (isVideo && vars.videoZone) ? (vars.videoZone.scaleMode || 'cover') : layer.fit
            }
          };
        })
      };
    }

    // 3. Absolute Fallback: Generate template layers using old metadata
    const duration = template?.duration_seconds || template?.default_duration || 30;
    // The canvas size MUST match whatever the client's position editor (VideoAreaEditor) used to
    // compute vars.videoZone — that editor now takes the project's real aspect ratio as its
    // canvas size (see NewProjectWizard.tsx's ASPECT_CANVAS_SIZE), so this must derive from the
    // same project.aspect instead of hardcoding 1080x1920. A mismatch here is exactly what made
    // "centered in the editor" land in the wrong place for any non-9:16 project.
    const ASPECT_CANVAS_SIZE: Record<string, { width: number; height: number }> = {
      '9:16': { width: 1080, height: 1920 },
      '16:9': { width: 1920, height: 1080 },
      '1:1': { width: 1080, height: 1080 },
    };
    const canvasSize = ASPECT_CANVAS_SIZE[project?.aspect as string] || ASPECT_CANVAS_SIZE['9:16'];
    const videoPosition = vars.videoZone ? { x: vars.videoZone.x, y: vars.videoZone.y } : { x: 0, y: 460 };
    const videoSize = vars.videoZone ? { width: vars.videoZone.width, height: vars.videoZone.height } : { width: canvasSize.width, height: Math.round(canvasSize.height * 0.52) };
    const videoRotation = (vars.videoZone && vars.videoZone.rotation !== undefined) ? vars.videoZone.rotation : 0;
    const videoOpacity = (vars.videoZone && vars.videoZone.opacity !== undefined) ? vars.videoZone.opacity : 100;
    const videoZIndex = (vars.videoZone && vars.videoZone.zIndex !== undefined) ? vars.videoZone.zIndex : 1;
    const videoFit = (vars.videoZone && vars.videoZone.scaleMode) ? vars.videoZone.scaleMode : 'cover';

    return {
      width: canvasSize.width,
      height: canvasSize.height,
      duration: duration,
      layers: [
        vars.backgroundImageUrl ? {
          id: 'layer-base-bg',
          type: 'background',
          position: { x: 0, y: 0 },
          size: canvasSize,
          rotation: 0,
          opacity: 100,
          zIndex: 0,
          timeline: { start: 0, end: duration },
          animations: [],
          content: vars.backgroundImageUrl,
          styles: {
            fit: 'cover'
          }
        } : {
          id: 'layer-base-bg',
          type: 'overlay',
          position: { x: 0, y: 0 },
          size: canvasSize,
          rotation: 0,
          opacity: 100,
          zIndex: 0,
          timeline: { start: 0, end: duration },
          animations: [],
          content: '',
          styles: {
            overlayType: 'solid',
            color: vars.brandColor || '#030712'
          }
        },
        {
          id: 'layer-video',
          type: 'video',
          position: videoPosition,
          size: videoSize,
          rotation: videoRotation,
          opacity: videoOpacity,
          zIndex: videoZIndex,
          timeline: { start: 0, end: duration },
          animations: [],
          content: vars.backgroundVideoUrl || '',
          styles: {
            fit: videoFit
          }
        },
        // Headline/subtitle layers are only added when the user actually provided text —
        // no placeholder text should ever be burned into a video the user didn't ask for.
        ...(vars.title || vars.headline ? [{
          id: 'layer-headline',
          type: 'headline',
          position: { x: 90, y: 180 },
          size: { width: 900, height: 200 },
          rotation: 0,
          opacity: 100,
          zIndex: 2,
          timeline: { start: 0, end: duration },
          animations: [],
          content: vars.title || vars.headline,
          styles: {
            font: vars.fontName || 'Inter',
            color: '#FFFFFF',
            size: 54
          }
        }] : []),
        ...((vars.subtitles && vars.subtitles[0]) || vars.subheadline ? [{
          id: 'layer-subtitle',
          type: 'subtitle',
          position: { x: 90, y: 1400 },
          size: { width: 900, height: 200 },
          rotation: 0,
          opacity: 100,
          zIndex: 3,
          timeline: { start: 0, end: duration },
          animations: [],
          content: (vars.subtitles && vars.subtitles[0]) || vars.subheadline,
          styles: {
            font: vars.fontName || 'Inter',
            color: '#E2E8F0',
            size: 38
          }
        }] : []),
        {
          id: 'layer-progress-bar',
          type: 'progressBar',
          position: { x: 90, y: 1840 },
          size: { width: 900, height: 12 },
          rotation: 0,
          opacity: 100,
          zIndex: 4,
          timeline: { start: 0, end: duration },
          animations: [],
          content: '',
          styles: {
            color: vars.brandColor || '#6366F1'
          }
        }
      ]
    };
  }

  /**
   * Reads a template saved in database and resolves it against active project details
   */
  static compile(templateJson: TemplateJSON, variables: Record<string, any>): TemplateJSON {
    // Deep clone the template JSON
    const compiled = JSON.parse(JSON.stringify(templateJson)) as TemplateJSON;

    // Resolve merge tags/placeholders inside layer content on the backend
    for (const layer of compiled.layers) {
      if (typeof layer.content === 'string' && layer.content) {
        let text = layer.content;
        
        if (text.includes('{{HEADLINE}}') || text.includes('{{headline}}')) {
          text = text.replace(/\{\{headline\}\}/gi, variables.headline || variables.title || 'HEADLINE PRINCIPAL');
        }
        if (text.includes('{{TITLE}}') || text.includes('{{title}}')) {
          text = text.replace(/\{\{title\}\}/gi, variables.title || variables.headline || 'HEADLINE PRINCIPAL');
        }
        if (text.includes('{{VIDEO}}') || text.includes('{{video}}')) {
          text = text.replace(/\{\{video\}\}/gi, variables.backgroundVideoUrl || variables.videoUrl || '');
        }
        if (text.includes('{{CTA}}') || text.includes('{{cta}}')) {
          text = text.replace(/\{\{cta\}\}/gi, variables.cta || 'Siga para mais novidades!');
        }
        if (text.includes('{{SUBTITLE}}') || text.includes('{{subtitle}}')) {
          const sub = (variables.subtitles && variables.subtitles[0]) || variables.subheadline || '';
          text = text.replace(/\{\{subtitle\}\}/gi, sub);
        }
        
        layer.content = text;
      }
    }

    return compiled;
  }
}
