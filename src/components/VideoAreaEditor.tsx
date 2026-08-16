import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, 
  RotateCw, 
  Eye, 
  Layers, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignStartVertical, 
  AlignEndVertical, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw,
  Sliders,
  Sparkles
} from 'lucide-react';

export interface VideoZoneData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  scaleMode: 'cover' | 'contain' | 'stretch';
  borderRadius: number;
  zIndex: number;
}

interface VideoAreaEditorProps {
  value: VideoZoneData;
  onChange: (value: VideoZoneData) => void;
  backgroundUrl: string | null;
  templateName?: string;
}

const CANVAS_VIRTUAL_WIDTH = 1080;
const CANVAS_VIRTUAL_HEIGHT = 1920;
const BASE_DISPLAY_WIDTH = 225; // 9:16 aspect ratio base width
const BASE_DISPLAY_HEIGHT = 400; // 9:16 aspect ratio base height

export const VideoAreaEditor: React.FC<VideoAreaEditorProps> = ({
  value,
  onChange,
  backgroundUrl,
  templateName
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeResizeHandle, setActiveResizeHandle] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState<{ xCenter: boolean; yCenter: boolean; xLeft: boolean; xRight: boolean; yTop: boolean; yBottom: boolean }>({
    xCenter: false,
    yCenter: false,
    xLeft: false,
    xRight: false,
    yTop: false,
    yBottom: false
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; boxX: number; boxY: number; boxW: number; boxH: number }>({
    x: 0,
    y: 0,
    boxX: 0,
    boxY: 0,
    boxW: 0,
    boxH: 0
  });

  const displayWidth = BASE_DISPLAY_WIDTH * zoom;
  const displayHeight = BASE_DISPLAY_HEIGHT * zoom;
  const scaleFactor = CANVAS_VIRTUAL_WIDTH / displayWidth; // Convert screen pixels to virtual coordinates (1080x1920)

  // Map virtual coordinates to screen pixels
  const toScreenX = (x: number) => x / scaleFactor;
  const toScreenY = (y: number) => y / scaleFactor;
  const toScreenWidth = (w: number) => w / scaleFactor;
  const toScreenHeight = (h: number) => h / scaleFactor;

  // Map screen pixels to virtual coordinates
  const toVirtualX = (x: number) => x * scaleFactor;
  const toVirtualY = (y: number) => y * scaleFactor;
  const toVirtualWidth = (w: number) => w * scaleFactor;
  const toVirtualHeight = (h: number) => h * scaleFactor;

  // Safe updates
  const updateZone = (updates: Partial<VideoZoneData>) => {
    onChange({
      ...value,
      ...updates
    });
  };

  // Quick Alignments (using virtual coordinates)
  const align = (type: 'center_h' | 'center_v' | 'center_both' | 'left' | 'right' | 'top' | 'bottom') => {
    const w = value.width;
    const h = value.height;
    let newX = value.x;
    let newY = value.y;

    switch (type) {
      case 'center_h':
        newX = Math.round((CANVAS_VIRTUAL_WIDTH - w) / 2);
        break;
      case 'center_v':
        newY = Math.round((CANVAS_VIRTUAL_HEIGHT - h) / 2);
        break;
      case 'center_both':
        newX = Math.round((CANVAS_VIRTUAL_WIDTH - w) / 2);
        newY = Math.round((CANVAS_VIRTUAL_HEIGHT - h) / 2);
        break;
      case 'left':
        newX = 0;
        break;
      case 'right':
        newX = CANVAS_VIRTUAL_WIDTH - w;
        break;
      case 'top':
        newY = 0;
        break;
      case 'bottom':
        newY = CANVAS_VIRTUAL_HEIGHT - h;
        break;
    }

    onChange({
      ...value,
      x: newX,
      y: newY
    });
  };

  // Dragger & Resizer Mouse Movement Handlers
  const handleMouseDown = (e: React.MouseEvent, handle: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canvasRef.current) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      boxX: value.x,
      boxY: value.y,
      boxW: value.width,
      boxH: value.height
    };

    if (handle) {
      setActiveResizeHandle(handle);
    } else {
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !activeResizeHandle) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      // Convert delta screen pixels to delta virtual coordinates
      const virtualDeltaX = toVirtualWidth(deltaX);
      const virtualDeltaY = toVirtualHeight(deltaY);

      let nextX = dragStartRef.current.boxX;
      let nextY = dragStartRef.current.boxY;
      let nextW = dragStartRef.current.boxW;
      let nextH = dragStartRef.current.boxH;

      if (isDragging) {
        // Dragging whole video zone box
        nextX = dragStartRef.current.boxX + virtualDeltaX;
        nextY = dragStartRef.current.boxY + virtualDeltaY;

        // Smart Snapping & Guides threshold (15 virtual pixels)
        const snapThreshold = 25;
        let snapX = false;
        let snapY = false;

        const currentGuides = {
          xCenter: false,
          yCenter: false,
          xLeft: false,
          xRight: false,
          yTop: false,
          yBottom: false
        };

        // Horizontal Centers Snap (box center aligns with canvas center X = 540)
        const boxCenterX = nextX + nextW / 2;
        if (Math.abs(boxCenterX - 540) < snapThreshold) {
          nextX = 540 - nextW / 2;
          currentGuides.xCenter = true;
          snapX = true;
        }

        // Vertical Centers Snap (box center aligns with canvas center Y = 960)
        const boxCenterY = nextY + nextH / 2;
        if (Math.abs(boxCenterY - 960) < snapThreshold) {
          nextY = 960 - nextH / 2;
          currentGuides.yCenter = true;
          snapY = true;
        }

        // Left Edge Snap
        if (Math.abs(nextX) < snapThreshold) {
          nextX = 0;
          currentGuides.xLeft = true;
          snapX = true;
        }

        // Right Edge Snap
        if (Math.abs(nextX + nextW - CANVAS_VIRTUAL_WIDTH) < snapThreshold) {
          nextX = CANVAS_VIRTUAL_WIDTH - nextW;
          currentGuides.xRight = true;
          snapX = true;
        }

        // Top Edge Snap
        if (Math.abs(nextY) < snapThreshold) {
          nextY = 0;
          currentGuides.yTop = true;
          snapY = true;
        }

        // Bottom Edge Snap
        if (Math.abs(nextY + nextH - CANVAS_VIRTUAL_HEIGHT) < snapThreshold) {
          nextY = CANVAS_VIRTUAL_HEIGHT - nextH;
          currentGuides.yBottom = true;
          snapY = true;
        }

        setShowGuides(currentGuides);

        // Constrain to slightly outside canvas range or strict inside
        nextX = Math.round(nextX);
        nextY = Math.round(nextY);

        onChange({
          ...value,
          x: nextX,
          y: nextY
        });
      } else if (activeResizeHandle) {
        // Resizing from coordinates
        const minSize = 100; // Minimum size in virtual pixels (100x100)

        // Handle Corner resizing
        if (activeResizeHandle.includes('r')) {
          nextW = Math.max(minSize, dragStartRef.current.boxW + virtualDeltaX);
        }
        if (activeResizeHandle.includes('l')) {
          const possibleW = dragStartRef.current.boxW - virtualDeltaX;
          if (possibleW >= minSize) {
            nextW = possibleW;
            nextX = dragStartRef.current.boxX + virtualDeltaX;
          }
        }
        if (activeResizeHandle.includes('b')) {
          nextH = Math.max(minSize, dragStartRef.current.boxH + virtualDeltaY);
        }
        if (activeResizeHandle.includes('t')) {
          const possibleH = dragStartRef.current.boxH - virtualDeltaY;
          if (possibleH >= minSize) {
            nextH = possibleH;
            nextY = dragStartRef.current.boxY + virtualDeltaY;
          }
        }

        onChange({
          ...value,
          x: Math.round(nextX),
          y: Math.round(nextY),
          width: Math.round(nextW),
          height: Math.round(nextH)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveResizeHandle(null);
      setShowGuides({
        xCenter: false,
        yCenter: false,
        xLeft: false,
        xRight: false,
        yTop: false,
        yBottom: false
      });
    };

    if (isDragging || activeResizeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeResizeHandle, value, zoom]);

  // Object-fit mapping
  const getObjectFitClass = () => {
    switch (value.scaleMode) {
      case 'contain': return 'object-contain';
      case 'stretch': return 'object-fill';
      case 'cover':
      default:
        return 'object-cover';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch h-full">
      {/* LEFT COLUMN: INTERACTIVE CANVAS CONTAINER */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 rounded-2xl border border-gray-900 p-4 relative overflow-hidden select-none min-h-[440px]">
        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-gray-900/90 backdrop-blur border border-gray-800 rounded-lg p-1 shadow-lg">
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition duration-200 cursor-pointer"
            title="Afastar"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-gray-400 w-10 text-center font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition duration-200 cursor-pointer"
            title="Aproximar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition duration-150 cursor-pointer"
            title="Resetar Zoom"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Dynamic Frame Canvas Container */}
        <div 
          ref={canvasRef}
          className="relative rounded-lg overflow-hidden shadow-2xl transition-all duration-150"
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            backgroundColor: '#030712',
            border: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          {/* 1. BACKGROUND: TEMPLATE / OVERLAY PREVIEW */}
          {backgroundUrl ? (
            backgroundUrl.endsWith('.mp4') || backgroundUrl.endsWith('.mov') ? (
              <video
                src={backgroundUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40"
              />
            ) : (
              <img
                src={backgroundUrl}
                alt="Template Background"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40"
              />
            )
          ) : (
            // Fallback premium procedural visual editor grid
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center opacity-30 pointer-events-none">
              <div className="w-full h-full bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:20px_20px]" />
              <div className="absolute text-[9px] font-mono text-gray-700 uppercase tracking-widest text-center">
                <span>{templateName || 'Template Sem Vídeo'}</span>
              </div>
            </div>
          )}

          {/* 2. DYNAMIC GUIDE LINES (SNAPPING VISUAL GUIDES) */}
          {showGuides.xCenter && (
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-l border-dashed border-pink-500 z-30 transform -translate-x-1/2 pointer-events-none" />
          )}
          {showGuides.yCenter && (
            <div className="absolute top-1/2 left-0 right-0 h-[1px] border-t border-dashed border-pink-500 z-30 transform -translate-y-1/2 pointer-events-none" />
          )}
          {showGuides.xLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-[1px] border-l border-solid border-pink-400 z-30 pointer-events-none" />
          )}
          {showGuides.xRight && (
            <div className="absolute right-0 top-0 bottom-0 w-[1px] border-r border-solid border-pink-400 z-30 pointer-events-none" />
          )}
          {showGuides.yTop && (
            <div className="absolute top-0 left-0 right-0 h-[1px] border-t border-solid border-pink-400 z-30 pointer-events-none" />
          )}
          {showGuides.yBottom && (
            <div className="absolute bottom-0 left-0 right-0 h-[1px] border-b border-solid border-pink-400 z-30 pointer-events-none" />
          )}

          {/* 3. RESIZABLE / DRAGGABLE VIDEO FRAME (THE VIDEO ZONE OVERLAY) */}
          <div
            onMouseDown={(e) => handleMouseDown(e, null)}
            className={`absolute border border-indigo-500 cursor-move group select-none shadow-xl transition-shadow ${
              isDragging ? 'shadow-indigo-500/20 border-pink-400' : 'hover:border-indigo-400'
            }`}
            style={{
              left: `${toScreenX(value.x)}px`,
              top: `${toScreenY(value.y)}px`,
              width: `${toScreenWidth(value.width)}px`,
              height: `${toScreenHeight(value.height)}px`,
              opacity: value.opacity / 100,
              transform: `rotate(${value.rotation}deg)`,
              borderRadius: `${value.borderRadius}px`,
              zIndex: value.zIndex,
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
            }}
          >
            {/* Live Video Preview looping in the background of active selection */}
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ borderRadius: `${value.borderRadius}px` }}>
              <video
                src="https://assets.mixkit.co/videos/preview/mixkit-gaming-video-of-a-car-race-42352-large.mp4"
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full ${getObjectFitClass()} pointer-events-none select-none`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2 pointer-events-none">
                <span className="text-[7px] font-mono text-gray-200/90 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                  Visualizador em Tempo Real
                </span>
              </div>
            </div>

            {/* Corner Resize Handles */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'tl')}
              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 hover:bg-pink-400 transition cursor-nwse-resize z-40 shadow"
            />
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'tr')}
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 hover:bg-pink-400 transition cursor-nesw-resize z-40 shadow"
            />
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'bl')}
              className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 hover:bg-pink-400 transition cursor-nesw-resize z-40 shadow"
            />
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'br')}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 hover:bg-pink-400 transition cursor-nwse-resize z-40 shadow"
            />

            {/* Side Resize Handles (Edges) */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, 't')}
              className="absolute top-0 inset-x-3 h-1 hover:bg-indigo-400/50 cursor-ns-resize z-30"
            />
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'b')}
              className="absolute bottom-0 inset-x-3 h-1 hover:bg-indigo-400/50 cursor-ns-resize z-30"
            />
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'l')}
              className="absolute left-0 inset-y-3 w-1 hover:bg-indigo-400/50 cursor-ew-resize z-30"
            />
            <div 
              onMouseDown={(e) => handleMouseDown(e, 'r')}
              className="absolute right-0 inset-y-3 w-1 hover:bg-indigo-400/50 cursor-ew-resize z-30"
            />

            {/* Realtime coordinates box shown on top */}
            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-indigo-500 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow-lg pointer-events-none select-none z-50 flex items-center gap-1">
              <span>{value.width}</span>
              <span className="text-indigo-400">×</span>
              <span>{value.height}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: INSPECTOR & CONTROLS */}
      <div className="w-full lg:w-72 bg-slate-950 p-5 rounded-2xl border border-gray-900 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          {/* Title Header */}
          <div>
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Sliders className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Inspecionar Frame</span>
            </div>
            <h4 className="text-xs text-gray-500 mt-1 font-mono leading-relaxed">
              Arraste a caixa na tela ou digite os parâmetros precisos de renderização.
            </h4>
          </div>

          {/* Quick Alignments Grid */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Alinhamento Rápido</label>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => align('left')}
                className="p-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white rounded text-[10px] font-semibold flex flex-col items-center gap-1 transition cursor-pointer"
                title="Alinhar à Esquerda"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Esquerda</span>
              </button>
              <button
                onClick={() => align('center_h')}
                className="p-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white rounded text-[10px] font-semibold flex flex-col items-center gap-1 transition cursor-pointer"
                title="Centralizar Horizontal"
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span>Centrar H</span>
              </button>
              <button
                onClick={() => align('right')}
                className="p-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white rounded text-[10px] font-semibold flex flex-col items-center gap-1 transition cursor-pointer"
                title="Alinhar à Direita"
              >
                <AlignRight className="w-3.5 h-3.5" />
                <span>Direita</span>
              </button>
              <button
                onClick={() => align('top')}
                className="p-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white rounded text-[10px] font-semibold flex flex-col items-center gap-1 transition cursor-pointer"
                title="Alinhar ao Topo"
              >
                <AlignStartVertical className="w-3.5 h-3.5" />
                <span>Topo</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => align('center_both')}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 rounded text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/10"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Centralizar Tudo</span>
              </button>
              <button
                onClick={() => align('bottom')}
                className="py-1.5 px-3 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white rounded text-[10px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <AlignEndVertical className="w-3 h-3" />
                <span>Alinhar Base</span>
              </button>
            </div>
          </div>

          {/* Coordinate Parameters */}
          <div className="space-y-3 border-t border-gray-900 pt-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Geometria (1080×1920)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] font-mono text-gray-500 block">Coordenada X (px)</span>
                <input
                  type="number"
                  value={value.x}
                  onChange={(e) => updateZone({ x: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-gray-900 border border-gray-850 rounded text-xs text-white font-mono"
                />
              </div>
              <div>
                <span className="text-[9px] font-mono text-gray-500 block">Coordenada Y (px)</span>
                <input
                  type="number"
                  value={value.y}
                  onChange={(e) => updateZone({ y: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-gray-900 border border-gray-850 rounded text-xs text-white font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] font-mono text-gray-500 block">Largura (W)</span>
                <input
                  type="number"
                  value={value.width}
                  onChange={(e) => updateZone({ width: Math.max(10, parseInt(e.target.value) || 1080) })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-gray-900 border border-gray-850 rounded text-xs text-white font-mono"
                />
              </div>
              <div>
                <span className="text-[9px] font-mono text-gray-500 block">Altura (H)</span>
                <input
                  type="number"
                  value={value.height}
                  onChange={(e) => updateZone({ height: Math.max(10, parseInt(e.target.value) || 1920) })}
                  className="w-full mt-1 px-2.5 py-1.5 bg-gray-900 border border-gray-850 rounded text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Styling Sliders */}
          <div className="space-y-3.5 border-t border-gray-900 pt-3.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Filtros & Estilos</label>
            
            {/* Rotation slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-500">Rotação</span>
                <span className="text-gray-300 font-bold">{value.rotation}°</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCw className="w-3 h-3 text-gray-500 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="270"
                  step="90"
                  value={value.rotation}
                  onChange={(e) => updateZone({ rotation: parseInt(e.target.value) as any })}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Opacity slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-500">Opacidade</span>
                <span className="text-gray-300 font-bold">{value.opacity}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-3 h-3 text-gray-500 shrink-0" />
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={value.opacity}
                  onChange={(e) => updateZone({ opacity: parseInt(e.target.value) })}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Border radius slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-500">Canto Arredondado</span>
                <span className="text-gray-300 font-bold">{value.borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="2"
                value={value.borderRadius}
                onChange={(e) => updateZone({ borderRadius: parseInt(e.target.value) })}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Scale Mode Select */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono text-gray-500 block">Modo de Escala (Aspect)</span>
              <select
                value={value.scaleMode}
                onChange={(e) => updateZone({ scaleMode: e.target.value as any })}
                className="w-full px-2 py-1.5 bg-gray-900 border border-gray-850 rounded text-xs text-white font-medium"
              >
                <option value="cover">Preencher Completo (Cover)</option>
                <option value="contain">Manter Proporção (Contain)</option>
                <option value="stretch">Esticar Vídeo (Stretch/Fill)</option>
              </select>
            </div>

            {/* Z-Index parameter */}
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-gray-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-gray-500" />
                Z-Index / Camada
              </span>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => updateZone({ zIndex: Math.max(1, value.zIndex - 1) })}
                  className="w-5 h-5 bg-gray-900 border border-gray-850 rounded text-gray-400 hover:text-white transition flex items-center justify-center font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="text-white w-6 text-center font-bold">{value.zIndex}</span>
                <button 
                  onClick={() => updateZone({ zIndex: value.zIndex + 1 })}
                  className="w-5 h-5 bg-gray-900 border border-gray-850 rounded text-gray-400 hover:text-white transition flex items-center justify-center font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Render engine telemetry badge */}
        <div className="pt-3 border-t border-gray-900 flex items-center gap-1.5 mt-4">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <div className="text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-none">
            <span>Motor de Renderização Ativo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
