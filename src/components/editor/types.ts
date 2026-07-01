/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CanvasAspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '3:4';

export interface CanvasSettings {
  aspectRatio: CanvasAspectRatio;
  width: number;
  height: number;
  backgroundColor: string;
  gridEnabled: boolean;
  guidesEnabled: boolean;
  snapEnabled: boolean;
  safeAreaEnabled: boolean;
}

export type EditorLayerType =
  | 'video'
  | 'image'
  | 'logo'
  | 'headline'
  | 'subheadline'
  | 'text'
  | 'cta'
  | 'watermark'
  | 'subtitle'
  | 'progressBar'
  | 'shape'
  | 'overlay';

export interface EditorLayer {
  id: string;
  name: string;
  type: EditorLayerType;
  x: number; // In pixels relative to canvas coordinates
  y: number; // In pixels relative to canvas coordinates
  width: number;
  height: number;
  rotation: number; // In degrees
  opacity: number; // 0 to 100
  visible: boolean;
  locked: boolean;
  order: number; // z-index ordering
  
  // Dynamic Placeholders
  placeholder?: string; // e.g. '{{VIDEO}}', '{{HEADLINE}}', '{{CTA}}'
  
  // Style and Content attributes
  contentUrl?: string; // For videos, images, logos
  text?: string; // For texts, headlines, cta
  color?: string; // Text color or shape fill
  font?: string; // Font family
  size?: number; // Font size or progress bar height
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  spacing?: number; // Letter spacing
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  glowEnabled?: boolean;
  glowColor?: string;
  glowBlur?: number;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  radius?: number; // For shapes/rectangles
  padding?: number;
  margin?: number;
  align?: 'left' | 'center' | 'right';
  anchor?: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  
  // Animation attributes
  animationIn?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'zoom-in' | 'typewriter' | 'bounce';
  animationOut?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'zoom-in';
  animationDuration?: number; // Duration in seconds
  
  // Shape-specific properties
  shapeType?: 'rectangle' | 'circle' | 'line';
  
  // Overlay-specific properties
  overlayType?: 'blur' | 'gradient' | 'solid';
  gradientColorStart?: string;
  gradientColorEnd?: string;
  
  // Timeline properties
  durationStart: number; // start offset in seconds
  durationEnd: number; // end offset in seconds
}

export interface VideoEditorProject {
  id: string;
  name: string;
  description: string;
  canvas: CanvasSettings;
  layers: EditorLayer[];
  totalDuration: number; // in seconds
}
