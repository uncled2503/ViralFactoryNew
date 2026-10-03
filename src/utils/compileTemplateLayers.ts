/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template } from '../types';

// Converts a template built in the Template Editor (zones positioned in PERCENTAGES of the
// canvas, see TemplateEditor.tsx's `zones` state) into the pixel-based TemplateJSON shape the
// render pipeline actually consumes (server/render/TemplateEngine.ts's `vars.templateJson`
// path). Templates built via TemplateEditor were previously decorative only — the batch wizard
// read just their name/aspect and never touched `template.layers`, so nothing positioned there
// ever reached the rendered video. This is the missing link.
//
// Returns null when `template.layers` isn't in the zone shape (older/simple templates created
// without ever opening the zone editor) — callers should fall back to their existing flat
// composition in that case, exactly as before.

export interface TemplateOverrides {
  headline?: string;
  avatarUrl?: string;
  username?: string;
  videoUrl?: string;
}

const pct = (value: number | undefined, dimension: number): number =>
  Math.round(((value || 0) / 100) * dimension);

export function compileTemplateLayers(
  template: Template,
  canvasWidth: number,
  canvasHeight: number,
  duration: number,
  overrides: TemplateOverrides
): { width: number; height: number; duration: number; layers: any[] } | null {
  const zones = template.layers as any[];
  // Zone-shaped layers (built via TemplateEditor.tsx) always carry `x`/`rotation` as a
  // PERCENTAGE (0-100) position. Two other layer shapes exist in the wild and must be rejected
  // here, or their values would be misread as percentages and placed wildly off-canvas:
  // createTemplate's simple default ({id, type, name, defaultValue}, no `x` at all) and the
  // older seeded templates (e.g. "Corte Viral Top/Bottom"), which DO have `x`/`width` but as
  // absolute pixels (up to 1080+) and have no `rotation` field at all.
  const first = zones[0];
  const isPercentZoneShape =
    first && typeof first.x === 'number' && first.x <= 100 &&
    typeof first.width === 'number' && first.width <= 100 &&
    first.rotation !== undefined;
  if (!zones || zones.length === 0 || !isPercentZoneShape) return null;

  // One override consumed per matching zone TYPE, not per zone id — a template only ever needs
  // one headline/avatar/username/video slot for this to make sense, and letting the first match
  // win keeps this simple instead of needing the template author to wire up explicit bindings.
  let headlineUsed = false;
  let avatarUsed = false;
  let usernameUsed = false;
  let videoUsed = false;

  const layers = zones.map((zone) => {
    let content = zone.defaultValue || '';

    if (zone.type === 'video' && overrides.videoUrl && !videoUsed) {
      content = overrides.videoUrl;
      videoUsed = true;
    } else if (zone.type === 'headline' && overrides.headline && !headlineUsed) {
      content = overrides.headline;
      headlineUsed = true;
    } else if ((zone.type === 'avatar' || zone.type === 'logo' || zone.type === 'dynamicImage') && overrides.avatarUrl && !avatarUsed) {
      content = overrides.avatarUrl;
      avatarUsed = true;
    } else if (zone.type === 'instagram' && overrides.username && !usernameUsed) {
      content = overrides.username;
      usernameUsed = true;
    }

    return {
      id: zone.id,
      type: zone.type,
      position: { x: pct(zone.x, canvasWidth), y: pct(zone.y, canvasHeight) },
      size: { width: pct(zone.width, canvasWidth), height: pct(zone.height, canvasHeight) },
      rotation: zone.rotation || 0,
      opacity: zone.opacity !== undefined ? zone.opacity : 100,
      zIndex: 1,
      timeline: { start: 0, end: duration },
      animations: [],
      content,
      styles: {
        font: zone.font,
        color: zone.color,
        size: zone.size,
        weight: zone.weight,
        spacing: zone.spacing,
        align: zone.align,
        shadowEnabled: zone.shadowEnabled,
        shadowColor: zone.shadowColor,
        uppercase: zone.uppercase,
        lineHeight: zone.lineHeight,
        padding: zone.padding,
        radius: zone.radius,
        borderWidth: zone.borderWidth,
        borderColor: zone.borderColor,
        fit: zone.objectFit || zone.crop,
        shapeType: zone.shapeType,
        ringEnabled: zone.ringEnabled,
        ringColor: zone.ringColor,
        ringWidth: zone.ringWidth,
        overlayType: zone.overlayType,
        gradientColorStart: zone.gradientColorStart,
        gradientColorEnd: zone.gradientColorEnd,
      },
    };
  });

  // Base canvas layer — image if the template has one, otherwise a solid color. Uses
  // type: 'background' (not 'overlay') to match FFmpegGraphBuilder's background-detection
  // (`layers.find(l => l.type === 'background')`), which only recognizes that exact type.
  const backgroundLayer = {
    id: 'layer-base-bg',
    type: 'background',
    position: { x: 0, y: 0 },
    size: { width: canvasWidth, height: canvasHeight },
    rotation: 0,
    opacity: 100,
    zIndex: 0,
    timeline: { start: 0, end: duration },
    animations: [],
    content: template.backgroundImageUrl || '',
    styles: {
      fit: 'cover',
      color: template.backgroundColor || '#FFFFFF',
    },
  };

  return {
    width: canvasWidth,
    height: canvasHeight,
    duration,
    layers: [backgroundLayer, ...layers],
  };
}
