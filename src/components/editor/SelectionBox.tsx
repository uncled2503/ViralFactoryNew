/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { EditorLayer } from './types';
import { RotateCw, Trash2, Copy, Shield, ShieldAlert } from 'lucide-react';

interface SelectionBoxProps {
  layer: EditorLayer;
  canvasScale: number;
  onUpdate: (updates: Partial<EditorLayer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  layer,
  canvasScale,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);

  if (layer.locked) {
    // Render a simplified locked border with lock badge
    return (
      <div
        className="absolute pointer-events-none border border-red-500/60"
        style={{
          left: `${layer.x}px`,
          top: `${layer.y}px`,
          width: `${layer.width}px`,
          height: `${layer.height}px`,
          transform: `rotate(${layer.rotation}deg)`,
          transformOrigin: 'center center',
          zIndex: 9999,
        }}
      >
        <div className="absolute top-1 left-1 bg-red-950/95 border border-red-800 text-[9px] font-bold font-mono text-red-400 px-1.5 py-0.5 rounded shadow-lg flex items-center gap-1">
          <ShieldAlert className="w-2.5 h-2.5" />
          BLOQUEADO
        </div>
      </div>
    );
  }

  // Handle simple dragging of the layer
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = layer.x;
    const initialY = layer.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / canvasScale;
      const deltaY = (moveEvent.clientY - startY) / canvasScale;
      
      onUpdate({
        x: Math.round(initialX + deltaX),
        y: Math.round(initialY + deltaY),
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle resizing from individual handles
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = layer.x;
    const initialY = layer.y;
    const initialWidth = layer.width;
    const initialHeight = layer.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / canvasScale;
      const deltaY = (moveEvent.clientY - startY) / canvasScale;

      let newWidth = initialWidth;
      let newHeight = initialHeight;
      let newX = initialX;
      let newY = initialY;

      if (direction.includes('e')) {
        newWidth = Math.max(10, initialWidth + deltaX);
      }
      if (direction.includes('s')) {
        newHeight = Math.max(10, initialHeight + deltaY);
      }
      if (direction.includes('w')) {
        const potentialWidth = initialWidth - deltaX;
        if (potentialWidth > 10) {
          newWidth = potentialWidth;
          newX = initialX + deltaX;
        }
      }
      if (direction.includes('n')) {
        const potentialHeight = initialHeight - deltaY;
        if (potentialHeight > 10) {
          newHeight = potentialHeight;
          newY = initialY + deltaY;
        }
      }

      onUpdate({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle rotating the layer
  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!boxRef.current) return;

    // Center coordinates of the layer selection box
    const rect = boxRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const angleRad = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      let angleDeg = (angleRad * 180) / Math.PI - 90; // Offset by -90 to align rotate handle on top
      
      // Keep angles positive 0-359
      if (angleDeg < 0) {
        angleDeg += 360;
      }

      // Snap to increments of 15 degrees if shift key is pressed
      if (moveEvent.shiftKey) {
        angleDeg = Math.round(angleDeg / 15) * 15;
      }

      onUpdate({ rotation: Math.round(angleDeg) });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Style helper for the anchor points
  const handleClass = "absolute w-2.5 h-2.5 bg-white border border-indigo-600 rounded-full hover:bg-indigo-200 transition cursor-pointer z-[10001]";

  return (
    <div
      ref={boxRef}
      className="absolute border border-indigo-500/80 group selection-box"
      style={{
        left: `${layer.x}px`,
        top: `${layer.y}px`,
        width: `${layer.width}px`,
        height: `${layer.height}px`,
        transform: `rotate(${layer.rotation}deg)`,
        transformOrigin: 'center center',
        zIndex: 9999,
      }}
    >
      {/* Visual background highlighter when hovering */}
      <div
        onMouseDown={handleDragStart}
        className="absolute inset-0 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-move transition"
      />

      {/* Edge border lines for resize gestures */}
      <div className="absolute inset-x-0 top-0 h-1 cursor-ns-resize" onMouseDown={(e) => handleResizeStart(e, 'n')} />
      <div className="absolute inset-y-0 right-0 w-1 cursor-ew-resize" onMouseDown={(e) => handleResizeStart(e, 'e')} />
      <div className="absolute inset-x-0 bottom-0 h-1 cursor-ns-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
      <div className="absolute inset-y-0 left-0 w-1 cursor-ew-resize" onMouseDown={(e) => handleResizeStart(e, 'w')} />

      {/* Top Center Rotate Handle Arm & Indicator */}
      <div className="absolute left-1/2 -top-8 -translate-x-1/2 flex flex-col items-center">
        <div 
          onMouseDown={handleRotateStart}
          className="w-5 h-5 bg-indigo-600 border border-indigo-400 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 hover:scale-110 active:scale-95 shadow-md cursor-grab transition"
          title="Arraste para rotacionar"
        >
          <RotateCw className="w-3 h-3" />
        </div>
        <div className="w-0.5 h-3.5 bg-indigo-500" />
      </div>

      {/* Resize corner and edge points */}
      <div className={`${handleClass} -left-1.5 -top-1.5 cursor-nwse-resize`} onMouseDown={(e) => handleResizeStart(e, 'nw')} />
      <div className={`${handleClass} left-1/2 -translate-x-1/2 -top-1.5 cursor-ns-resize`} onMouseDown={(e) => handleResizeStart(e, 'n')} />
      <div className={`${handleClass} -right-1.5 -top-1.5 cursor-nesw-resize`} onMouseDown={(e) => handleResizeStart(e, 'ne')} />
      <div className={`${handleClass} -right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize`} onMouseDown={(e) => handleResizeStart(e, 'e')} />
      <div className={`${handleClass} -right-1.5 -bottom-1.5 cursor-nwse-resize`} onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className={`${handleClass} left-1/2 -translate-x-1/2 -bottom-1.5 cursor-ns-resize`} onMouseDown={(e) => handleResizeStart(e, 's')} />
      <div className={`${handleClass} -left-1.5 -bottom-1.5 cursor-nesw-resize`} onMouseDown={(e) => handleResizeStart(e, 'sw')} />
      <div className={`${handleClass} -left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize`} onMouseDown={(e) => handleResizeStart(e, 'w')} />

      {/* Quick context tools popping out at the bottom of the active selection */}
      <div className="absolute -bottom-11 left-1/2 -translate-x-1/2 bg-gray-950/95 border border-indigo-900/60 text-xs text-gray-200 px-2 py-1 rounded-xl shadow-2xl flex items-center gap-1.5 backdrop-blur-sm z-[10005]">
        <span className="text-[10px] font-semibold text-gray-400 font-mono select-none px-1">
          {layer.width}x{layer.height} px
        </span>
        <div className="w-px h-3 bg-gray-800" />
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="p-1 hover:bg-gray-900 text-gray-400 hover:text-indigo-400 rounded transition cursor-pointer"
          title="Duplicar Camada"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 hover:bg-red-950 text-gray-400 hover:text-red-400 rounded transition cursor-pointer"
          title="Excluir Camada"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
