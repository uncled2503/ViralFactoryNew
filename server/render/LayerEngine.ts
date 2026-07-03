import { CompiledLayout } from './TemplateEngine';

export interface RenderLayer {
  id: string;
  type: 'background' | 'video' | 'image' | 'text' | 'progressbar';
  name: string;
  order: number;
  data: any;
}

export class LayerEngine {
  /**
   * Compiles and orders the visual layers from top to bottom
   * 
   * Strict Order required:
   * 1. Background
   * 2. Video
   * 3. Logo
   * 4. Headline
   * 5. Subheadline
   * 6. Subtitles (Legenda)
   * 7. CTA
   * 8. Watermark (Marca d'água)
   * 9. Progress Bar
   */
  static compileLayers(layout: CompiledLayout): RenderLayer[] {
    const layers: RenderLayer[] = [];
    let orderIndex = 0;

    // 1. Background Layer (Order 0)
    layers.push({
      id: 'layer-bg',
      type: 'background',
      name: 'Background Canvas',
      order: orderIndex++,
      data: layout.background
    });

    // 2. Main Video Layer (Order 1)
    if (layout.videoArea) {
      layers.push({
        id: 'layer-video',
        type: 'video',
        name: 'Video Area Segment',
        order: orderIndex++,
        data: layout.videoArea
      });
    }

    // 3. Logo Overlay Layer (Order 2)
    if (layout.logo) {
      layers.push({
        id: 'layer-logo',
        type: 'image',
        name: 'Brand Logo Icon',
        order: orderIndex++,
        data: layout.logo
      });
    }

    // 4. Headline Overlay Layer (Order 3)
    if (layout.headline && layout.headline.text) {
      layers.push({
        id: 'layer-headline',
        type: 'text',
        name: 'Primary Headline Text',
        order: orderIndex++,
        data: layout.headline
      });
    }

    // 5. Subheadline Overlay Layer (Order 4)
    if (layout.subheadline && layout.subheadline.text) {
      layers.push({
        id: 'layer-subheadline',
        type: 'text',
        name: 'Secondary Subheadline Text',
        order: orderIndex++,
        data: layout.subheadline
      });
    }

    // 6. Subtitles (Legenda) Overlay Layer (Order 5)
    if (layout.subtitles && layout.subtitles.enabled && layout.subtitles.text.length > 0) {
      layers.push({
        id: 'layer-subtitles',
        type: 'text',
        name: 'Captions / Subtitles Track',
        order: orderIndex++,
        data: layout.subtitles
      });
    }

    // 7. CTA Overlay Layer (Order 6)
    if (layout.cta && layout.cta.text) {
      layers.push({
        id: 'layer-cta',
        type: 'text',
        name: 'Call To Action Element',
        order: orderIndex++,
        data: layout.cta
      });
    }

    // 8. Watermark Overlay Layer (Order 7)
    if (layout.watermark) {
      layers.push({
        id: 'layer-watermark',
        type: 'image',
        name: 'System Watermark Badge',
        order: orderIndex++,
        data: layout.watermark
      });
    }

    // 9. Progress Bar Layer (Order 8)
    if (layout.progressBar && layout.progressBar.enabled) {
      layers.push({
        id: 'layer-progressbar',
        type: 'progressbar',
        name: 'Dynamic Progress Timer Bar',
        order: orderIndex++,
        data: layout.progressBar
      });
    }

    return layers.sort((a, b) => a.order - b.order);
  }
}
