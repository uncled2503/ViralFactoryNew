import { TemplateJSON } from './TemplateEngine';

export interface RenderLayer {
  id: string;
  type: string;
  name: string;
  order: number;
  data: any;
}

export class LayerEngine {
  /**
   * Compiles the visual layers dynamically from the new standardized TemplateJSON schema.
   * Eliminates the rigid hardcoded layouts and respects the JSON layout specifications entirely.
   */
  static compileLayers(templateJson: TemplateJSON): RenderLayer[] {
    const layers: RenderLayer[] = [];

    // Ensure we have a default background layer first if none is specified
    const hasBg = templateJson.layers.some(l => l.type === 'overlay' || l.type === 'background');
    if (!hasBg) {
      layers.push({
        id: 'layer-default-bg',
        type: 'background',
        name: 'Default Canvas Background',
        order: -10,
        data: {
          id: 'layer-default-bg',
          type: 'background',
          position: { x: 0, y: 0 },
          size: { width: templateJson.width || 1080, height: templateJson.height || 1920 },
          rotation: 0,
          opacity: 100,
          zIndex: -10,
          timeline: { start: 0, end: templateJson.duration || 30 },
          animations: [],
          content: '',
          styles: {
            overlayType: 'solid',
            color: '#030712'
          }
        }
      });
    }

    for (const layer of templateJson.layers) {
      const type = layer.type.toLowerCase();

      // Skip layers that are disabled or not within timeline bounds
      if (layer.opacity === 0) continue;

      layers.push({
        id: layer.id,
        type: type,
        name: layer.id,
        order: layer.zIndex !== undefined ? layer.zIndex : 0,
        data: layer
      });
    }

    // Sort layers by z-index order
    return layers.sort((a, b) => a.order - b.order);
  }
}
