/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { EditorLayer } from './types';
import { 
  Play, Pause, RotateCw, Volume2, VolumeX, Eye, EyeOff, Lock, Unlock, 
  Trash2, Copy, Plus, ZoomIn, ZoomOut, Scissors, Clock, Layers 
} from 'lucide-react';

interface TimelineProps {
  layers: EditorLayer[];
  selectedLayerId: string | null;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<EditorLayer>) => void;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onUpdateTotalDuration: (dur: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  layers,
  selectedLayerId,
  currentTime,
  totalDuration,
  isPlaying,
  onSelectLayer,
  onUpdateLayer,
  onTimeChange,
  onPlayPause,
  onDeleteLayer,
  onDuplicateLayer,
  onUpdateTotalDuration,
}) => {
  const [zoom, setZoom] = useState<number>(30); // pixels per second
  const timelineRulerRef = useRef<HTMLDivElement>(null);

  // Helper to format time as 00:00.00
  const formatTimecode = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 100);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Dragging the playhead to scrub time
  const handleScrubStart = (e: React.MouseEvent) => {
    if (!timelineRulerRef.current) return;
    
    const rect = timelineRulerRef.current.getBoundingClientRect();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const relativeX = moveEvent.clientX - rect.left;
      const calculatedTime = Math.max(0, Math.min(totalDuration, relativeX / zoom));
      onTimeChange(calculatedTime);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Trigger initial click position update
    const relativeX = e.clientX - rect.left;
    onTimeChange(Math.max(0, Math.min(totalDuration, relativeX / zoom)));

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Moving or trimming timeline tracks
  const handleTrackDragStart = (
    e: React.MouseEvent,
    layer: EditorLayer,
    action: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const initialStart = layer.durationStart;
    const initialEnd = layer.durationEnd;
    const initialDuration = layer.durationEnd - layer.durationStart;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / zoom;

      if (action === 'move') {
        let newStart = initialStart + deltaX;
        let newEnd = initialEnd + deltaX;

        // Bounds enforcement
        if (newStart < 0) {
          newStart = 0;
          newEnd = initialDuration;
        }
        if (newEnd > totalDuration) {
          newEnd = totalDuration;
          newStart = totalDuration - initialDuration;
        }

        onUpdateLayer(layer.id, {
          durationStart: Number(newStart.toFixed(2)),
          durationEnd: Number(newEnd.toFixed(2)),
        });
      } else if (action === 'trim-start') {
        let newStart = initialStart + deltaX;
        if (newStart < 0) newStart = 0;
        if (newStart > layer.durationEnd - 0.2) newStart = layer.durationEnd - 0.2; // Min duration 0.2s

        onUpdateLayer(layer.id, {
          durationStart: Number(newStart.toFixed(2)),
        });
      } else if (action === 'trim-end') {
        let newEnd = initialEnd + deltaX;
        if (newEnd > totalDuration) newEnd = totalDuration;
        if (newEnd < layer.durationStart + 0.2) newEnd = layer.durationStart + 0.2; // Min duration 0.2s

        onUpdateLayer(layer.id, {
          durationEnd: Number(newEnd.toFixed(2)),
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Render ticks on the timeline ruler
  const renderRulerTicks = () => {
    const ticks = [];
    // Render tick every 1 second or 5 seconds depending on zoom level
    const step = zoom < 15 ? 5 : zoom < 40 ? 2 : 1;

    for (let s = 0; s <= totalDuration; s += step) {
      ticks.push(
        <div 
          key={`tick-${s}`}
          className="absolute h-full flex flex-col justify-between"
          style={{ left: `${s * zoom}px` }}
        >
          <div className="w-px h-2.5 bg-gray-800" />
          <span className="text-[9px] font-mono text-gray-500 select-none pb-0.5" style={{ transform: 'translateX(-50%)' }}>
            {Math.floor(s)}s
          </span>
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="h-56 bg-[#06080e] border-t border-gray-900 flex flex-col z-40 select-none overflow-hidden">
      {/* 1. Control Bar */}
      <div className="h-10 border-b border-gray-900 flex items-center justify-between px-4 bg-gray-950/60">
        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={onPlayPause}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
              isPlaying ? 'bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse' : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-850'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />}
          </button>

          {/* Time Display */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-400">
              {formatTimecode(currentTime)}
            </span>
            <span className="text-[10px] text-gray-600 font-bold font-mono">/</span>
            <input
              type="number"
              value={totalDuration}
              onChange={(e) => onUpdateTotalDuration(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-12 bg-gray-950 border border-gray-900 hover:border-gray-850 focus:border-indigo-500 rounded px-1.5 py-0.5 text-xs text-gray-400 font-mono text-center outline-none transition"
              title="Duração Total (s)"
            />
            <span className="text-[10px] text-gray-600 font-semibold">s</span>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-indigo-500/50" />
          <span>Arraste as bordas dos blocos na timeline para aparar o início/fim das camadas.</span>
        </div>

        {/* Timeline Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(10, zoom - 5))}
            className="p-1 hover:bg-gray-900 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
            title="Reduzir Escala"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <div className="w-16">
            <input
              type="range"
              min="10"
              max="100"
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-900 accent-indigo-500 cursor-pointer rounded"
            />
          </div>
          <button
            onClick={() => setZoom(Math.min(100, zoom + 5))}
            className="p-1 hover:bg-gray-900 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
            title="Aumentar Escala"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Horizontal Track Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers Panel */}
        <div className="w-48 bg-gray-950/20 border-r border-gray-900 flex flex-col overflow-y-auto overflow-x-hidden select-none select-none custom-scrollbar">
          {/* Top Filler aligning with Ruler */}
          <div className="h-8 border-b border-gray-900 flex items-center px-3 bg-gray-950/60 select-none">
            <span className="text-[9px] font-bold font-mono tracking-wider uppercase text-gray-500">Camada / Faixa</span>
          </div>
          {/* Track Labels */}
          <div className="flex-1">
            {layers.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              return (
                <div
                  key={`header-${layer.id}`}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`h-9 border-b border-gray-900/60 px-3 flex items-center justify-between text-[11px] cursor-pointer transition ${
                    isSelected ? 'bg-indigo-950/20 text-indigo-300 font-bold' : 'text-gray-400 hover:bg-gray-950/30'
                  }`}
                >
                  <span className="truncate max-w-[100px]">{layer.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                      className="p-0.5 text-gray-600 hover:text-red-400 hover:bg-gray-900 rounded"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track Timings Canvas */}
        <div className="flex-1 flex flex-col overflow-auto custom-scrollbar relative">
          
          {/* Timeline Time Ruler */}
          <div 
            ref={timelineRulerRef}
            onClick={handleScrubStart}
            onMouseDown={handleScrubStart}
            className="h-8 border-b border-gray-900 bg-gray-950/40 relative cursor-col-resize select-none flex-shrink-0"
            style={{ width: `${totalDuration * zoom}px`, minWidth: '100%' }}
          >
            {renderRulerTicks()}

            {/* Visual playhead line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-rose-500 z-50 pointer-events-none"
              style={{ 
                left: `${currentTime * zoom}px`,
                boxShadow: '0 0 8px rgba(244,63,94,0.8)'
              }}
            >
              {/* Playhead handle marker */}
              <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-rose-500 rounded-b rotate-45 border-r border-b border-rose-600" />
            </div>
          </div>

          {/* Timing Bars Container */}
          <div className="flex-1 relative" style={{ width: `${totalDuration * zoom}px`, minWidth: '100%' }}>
            
            {/* Background alignment rows */}
            {layers.map((layer, idx) => (
              <div 
                key={`row-${layer.id}`} 
                className="h-9 border-b border-gray-900/60 absolute left-0 right-0 pointer-events-none" 
                style={{ top: `${idx * 36}px` }}
              />
            ))}

            {/* Individual active layer timing blocks */}
            {layers.map((layer, idx) => {
              const isSelected = layer.id === selectedLayerId;
              const barLeft = layer.durationStart * zoom;
              const barWidth = (layer.durationEnd - layer.durationStart) * zoom;

              return (
                <div
                  key={`track-${layer.id}`}
                  onClick={(e) => { e.stopPropagation(); onSelectLayer(layer.id); }}
                  className={`absolute h-7 rounded-lg flex items-center justify-between border select-none cursor-grab group transition-colors duration-150 ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 text-indigo-100 font-bold'
                      : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-gray-850'
                  }`}
                  style={{
                    top: `${idx * 36 + 4}px`,
                    left: `${barLeft}px`,
                    width: `${barWidth}px`,
                  }}
                  onMouseDown={(e) => handleTrackDragStart(e, layer, 'move')}
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleTrackDragStart(e, layer, 'trim-start')}
                    className="w-1.5 h-full bg-indigo-500/40 hover:bg-indigo-500 hover:scale-x-150 rounded-l cursor-ew-resize select-none"
                  />

                  {/* Layer Label inside track block */}
                  <span className="text-[10px] font-mono px-2 truncate pointer-events-none select-none">
                    {layer.name} <span className="text-[9px] opacity-60">({(layer.durationEnd - layer.durationStart).toFixed(1)}s)</span>
                  </span>

                  {/* Right Trim Handle */}
                  <div
                    onMouseDown={(e) => handleTrackDragStart(e, layer, 'trim-end')}
                    className="w-1.5 h-full bg-indigo-500/40 hover:bg-indigo-500 hover:scale-x-150 rounded-r cursor-ew-resize select-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
