/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditorLayer } from './types';

export interface SnapLine {
  type: 'x' | 'y';
  value: number;
}

export function snapLayer(
  layerId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  activeLayers: EditorLayer[],
  canvasWidth: number,
  canvasHeight: number,
  threshold = 8
): { snappedX: number; snappedY: number; lines: SnapLine[] } {
  let snappedX = x;
  let snappedY = y;
  const lines: SnapLine[] = [];

  // Targets for X snaps (vertical lines)
  const xTargets: { value: number; label: string }[] = [
    { value: 0, label: 'canvas-left' },
    { value: canvasWidth / 2, label: 'canvas-hcenter' },
    { value: canvasWidth, label: 'canvas-right' }
  ];

  // Targets for Y snaps (horizontal lines)
  const yTargets: { value: number; label: string }[] = [
    { value: 0, label: 'canvas-top' },
    { value: canvasHeight / 2, label: 'canvas-vcenter' },
    { value: canvasHeight, label: 'canvas-bottom' }
  ];

  // Populate targets from other layers
  activeLayers.forEach((l) => {
    if (l.id === layerId || !l.visible) return;
    
    // X targets
    xTargets.push({ value: l.x, label: 'layer-left' });
    xTargets.push({ value: l.x + l.width / 2, label: 'layer-hcenter' });
    xTargets.push({ value: l.x + l.width, label: 'layer-right' });

    // Y targets
    yTargets.push({ value: l.y, label: 'layer-top' });
    yTargets.push({ value: l.y + l.height / 2, label: 'layer-vcenter' });
    yTargets.push({ value: l.y + l.height, label: 'layer-bottom' });
  });

  // Current layer snap source points
  const layerXPoints = [
    { value: x, offset: 0 }, // left edge
    { value: x + width / 2, offset: -width / 2 }, // center
    { value: x + width, offset: -width } // right edge
  ];

  const layerYPoints = [
    { value: y, offset: 0 }, // top edge
    { value: y + height / 2, offset: -height / 2 }, // center
    { value: y + height, offset: -height } // bottom edge
  ];

  // Find closest X snap
  let minDiffX = Infinity;
  let bestTargetX = 0;
  let bestOffsetX = 0;

  layerXPoints.forEach((lp) => {
    xTargets.forEach((t) => {
      const diff = Math.abs(lp.value - t.value);
      if (diff < minDiffX && diff <= threshold) {
        minDiffX = diff;
        bestTargetX = t.value;
        bestOffsetX = lp.offset;
      }
    });
  });

  if (minDiffX !== Infinity) {
    snappedX = bestTargetX + bestOffsetX;
    lines.push({ type: 'x', value: bestTargetX });
  }

  // Find closest Y snap
  let minDiffY = Infinity;
  let bestTargetY = 0;
  let bestOffsetY = 0;

  layerYPoints.forEach((lp) => {
    yTargets.forEach((t) => {
      const diff = Math.abs(lp.value - t.value);
      if (diff < minDiffY && diff <= threshold) {
        minDiffY = diff;
        bestTargetY = t.value;
        bestOffsetY = lp.offset;
      }
    });
  });

  if (minDiffY !== Infinity) {
    snappedY = bestTargetY + bestOffsetY;
    lines.push({ type: 'y', value: bestTargetY });
  }

  return { snappedX, snappedY, lines };
}
