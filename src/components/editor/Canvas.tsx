/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { EditorLayer, CanvasSettings } from './types';
import { LayerRenderer } from './LayerRenderer';
import { SelectionBox } from './SelectionBox';
import { Guides } from './Guides';
import { SnapLine, snapLayer } from './SnapSystem';

interface CanvasProps {
  settings: CanvasSettings;
  layers: EditorLayer[];
  selectedLayerId: string | null;
  currentTime: number;
  scale: number;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<EditorLayer>) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  settings,
  layers,
  selectedLayerId,
  currentTime,
  scale,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapLines, setSnapLines] = React.useState<SnapLine[]>([]);

  // Find currently selected layer object
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  // Clear selection if clicking the gray canvas background area
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSelectLayer(null);
    }
  };

  const handleUpdateLayerWithSnap = (layerId: string, updates: Partial<EditorLayer>) => {
    const targetLayer = layers.find((l) => l.id === layerId);
    if (!targetLayer) return;

    const merged = { ...targetLayer, ...updates };

    // Snapping logic if enabled
    if (settings.snapEnabled && (updates.x !== undefined || updates.y !== undefined)) {
      const snapResult = snapLayer(
        layerId,
        merged.x,
        merged.y,
        merged.width,
        merged.height,
        layers,
        settings.width,
        settings.height
      );
      
      updates.x = snapResult.snappedX;
      updates.y = snapResult.snappedY;
      setSnapLines(snapResult.lines);
    } else {
      setSnapLines([]);
    }

    onUpdateLayer(layerId, updates);
  };

  const handleMouseUpGlobal = () => {
    setSnapLines([]);
  };

  React.useEffect(() => {
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, []);

  // Set aspect ratio color
  const isTransparent = settings.backgroundColor === 'transparent';

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      className="flex-1 overflow-auto bg-[#0a0c16] relative flex items-center justify-center p-8 select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Outer bounding wrap showing aspect-ratio shape of canvas */}
      <div
        className="relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-gray-900/60 transition-transform duration-100 ease-out flex-shrink-0"
        style={{
          width: `${settings.width}px`,
          height: `${settings.height}px`,
          transform: `scale(${scale})`,
          backgroundColor: isTransparent ? '#030712' : settings.backgroundColor,
          backgroundImage: isTransparent
            ? `
                linear-gradient(45deg, #090d16 25%, transparent 25%),
                linear-gradient(-45deg, #090d16 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #090d16 75%),
                linear-gradient(-45deg, transparent 75%, #090d16 75%)
              `
            : undefined,
          backgroundSize: isTransparent ? '20px 20px' : undefined,
          backgroundPosition: isTransparent ? '0 0, 0 10px, 10px -10px, -10px 0px' : undefined,
        }}
      >
        {/* Layer Renderer Stage */}
        <div 
          className="absolute inset-0 overflow-hidden"
          onClick={(e) => {
            // Select topmost clicked layer (reverse z-order)
            const sortedLayers = [...layers].sort((a, b) => b.order - a.order);
            const clickedLayer = sortedLayers.find((l) => {
              if (!l.visible) return false;
              
              // Coordinates of click relative to scale
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = (e.clientX - rect.left) / scale;
              const clickY = (e.clientY - rect.top) / scale;

              const isWithinBounds =
                clickX >= l.x &&
                clickX <= l.x + l.width &&
                clickY >= l.y &&
                clickY <= l.y + l.height;

              return isWithinBounds;
            });

            if (clickedLayer) {
              e.stopPropagation();
              onSelectLayer(clickedLayer.id);
            } else {
              onSelectLayer(null);
            }
          }}
        >
          {/* Active timeline rendering */}
          {layers
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((layer) => (
              <LayerRenderer 
                key={layer.id} 
                layer={layer} 
                currentTime={currentTime} 
              />
            ))}
        </div>

        {/* Guides overlay (grids, safe areas, snaps) */}
        <Guides settings={settings} snapLines={snapLines} />

        {/* Selected Layer visual bounding controls */}
        {selectedLayer && (
          <SelectionBox
            layer={selectedLayer}
            canvasScale={scale}
            onUpdate={(updates) => handleUpdateLayerWithSnap(selectedLayer.id, updates)}
            onDelete={() => onDeleteLayer(selectedLayer.id)}
            onDuplicate={() => onDuplicateLayer(selectedLayer.id)}
          />
        )}
      </div>
    </div>
  );
};
