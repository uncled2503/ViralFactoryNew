import { Template, Project } from '../../src/types';

export interface CompiledLayout {
  aspect: '9:16' | '16:9' | '1:1';
  duration: number; // in seconds
  background: {
    type: 'color' | 'image' | 'video';
    value: string; // Hex color, Image URL, or Video URL
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
   * Reads a template saved in database and resolves it against active project details
   */
  static compile(template: Template, project: Project): CompiledLayout {
    const vars: Record<string, any> = (project.variables || {}) as Record<string, any>;

    // 1. Resolve Background Type & URL
    let bgType: 'color' | 'image' | 'video' = 'color';
    let bgValue = vars.brandColor || '#030712'; // default dark gray/black

    if (vars.backgroundVideoUrl || template.bgMusicUrl) {
      bgType = vars.backgroundVideoUrl ? 'video' : 'color';
      bgValue = vars.backgroundVideoUrl || bgValue;
    } else if (vars.backgroundImageUrl || template.backgroundImageUrl) {
      bgType = 'image';
      bgValue = vars.backgroundImageUrl || template.backgroundImageUrl || '';
    }

    // 2. Build default visual zones for 9:16 layout
    return {
      aspect: project.aspect || template.aspect || '9:16',
      duration: template.defaultDuration || 30,
      background: {
        type: bgType,
        value: bgValue,
        opacity: vars.backgroundImageUrl ? 0.4 : 1.0 // dimmer background if video overlay is main
      },
      videoArea: {
        x: 0,
        y: 460, // Centered vertically in 1080x1920 layout
        width: 1080,
        height: 1000,
        videoUrl: vars.backgroundVideoUrl || '',
        fit: 'cover',
        trim: vars.trim || { start: 0, duration: template.defaultDuration || 30 }
      },
      headline: {
        text: vars.title || vars.headline || 'HEADLINE PRINCIPAL',
        font: vars.fontName || 'Inter',
        color: vars.brandColor || '#FFFFFF',
        size: 54,
        x: 540, // Centered horizontally
        y: 200  // Upper header region
      },
      subheadline: {
        text: (vars.subtitles && vars.subtitles[0]) || vars.subheadline || 'Subheadline de apoio informativa',
        font: vars.fontName || 'Inter',
        color: '#E2E8F0',
        size: 38,
        x: 540,
        y: 320
      },
      cta: {
        text: vars.cta || 'Siga para mais novidades!',
        font: vars.fontName || 'Inter',
        color: '#FF007F', // vibrant neon pink
        size: 42,
        x: 540,
        y: 1700 // Lower footer region
      },
      logo: vars.logoUrl ? {
        url: vars.logoUrl,
        x: 490, // Centered (size 100 offset)
        y: 80,
        size: 100,
        opacity: 1.0
      } : undefined,
      subtitles: {
        enabled: true,
        text: vars.subtitles || ['Legenda do vídeo renderizado'],
        font: vars.fontName || 'Inter',
        color: '#FFFF00', // Yellow captions highlight
        size: 44,
        y: 1500 // Overlay subtitles below video zone
      },
      watermark: {
        url: '/src/assets/images/logo_symbol_new_1782894227400.jpg', // uses new brand logo symbol
        x: 920,
        y: 80,
        size: 80,
        opacity: 0.5
      },
      progressBar: {
        enabled: true,
        color: '#6366F1', // Indigo brand
        bgColor: '#1F2937',
        height: 10,
        y: 1910 // Bottom boundary
      }
    };
  }
}
