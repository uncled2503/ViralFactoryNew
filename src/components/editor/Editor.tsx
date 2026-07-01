/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CanvasAspectRatio, CanvasSettings, EditorLayer, EditorLayerType } from './types';
import { Toolbar } from './Toolbar';
import { AssetsPanel } from './AssetsPanel';
import { LayerPanel } from './LayerPanel';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { useHistory } from './useHistory';

interface EditorProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSaveProjectData: (projectData: { canvas: CanvasSettings; layers: EditorLayer[]; totalDuration: number }) => void;
}

// Map aspect ratio to standard resolution bounds (absolute rendering dimensions)
const RESOLUTIONS_MAP: Record<CanvasAspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '3:4': { width: 1080, height: 1440 },
};

export const Editor: React.FC<EditorProps> = ({
  projectId,
  projectName,
  onClose,
  onSaveProjectData,
}) => {
  // 1. Core State Definition
  const [name, setName] = useState(projectName);
  const [totalDuration, setTotalDuration] = useState(30); // 30 seconds default
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.35); // Viewport scale multiplier
  const [isSaving, setIsSaving] = useState(false);

  // Playback timer ref
  const playTimerRef = useRef<number | null>(null);

  // 2. Initial Setup: Canvas configuration
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    backgroundColor: 'transparent',
    gridEnabled: true,
    guidesEnabled: true,
    snapEnabled: true,
    safeAreaEnabled: true,
  });

  // 3. Initial Setup: Layers state
  const [layers, setLayers] = useState<EditorLayer[]>([
    {
      id: 'layer-video-bg',
      name: 'Fundo (Vídeo Dinâmico)',
      type: 'video',
      x: 0,
      y: 0,
      width: 1080,
      height: 1920,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      order: 1,
      placeholder: '{{VIDEO}}',
      durationStart: 0,
      durationEnd: 30,
    },
    {
      id: 'layer-overlay-grad',
      name: 'Sombreamento Inferior',
      type: 'overlay',
      x: 0,
      y: 1300,
      width: 1080,
      height: 620,
      rotation: 0,
      opacity: 90,
      visible: true,
      locked: true,
      order: 2,
      overlayType: 'gradient',
      gradientColorStart: 'transparent',
      gradientColorEnd: 'rgba(0,0,0,0.95)',
      durationStart: 0,
      durationEnd: 30,
    },
    {
      id: 'layer-headline-txt',
      name: 'Título Principal',
      type: 'headline',
      x: 90,
      y: 180,
      width: 900,
      height: 250,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      order: 3,
      placeholder: '{{HEADLINE}}',
      font: 'Anton',
      color: '#ffffff',
      size: 82,
      align: 'center',
      weight: 'bold',
      strokeEnabled: true,
      strokeColor: '#000000',
      strokeWidth: 3,
      durationStart: 0,
      durationEnd: 30,
    },
    {
      id: 'layer-subtitle-txt',
      name: 'Legenda de Destaque',
      type: 'subtitle',
      x: 90,
      y: 1400,
      width: 900,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      order: 4,
      text: 'Toque para assistir até o final! 🚀',
      font: 'Space Grotesk',
      color: '#f59e0b',
      size: 48,
      align: 'center',
      weight: 'bold',
      glowEnabled: true,
      glowColor: 'rgba(245,158,11,0.5)',
      glowBlur: 15,
      durationStart: 2,
      durationEnd: 28,
    },
    {
      id: 'layer-progress-bar',
      name: 'Barra de Progresso',
      type: 'progressBar',
      x: 90,
      y: 1840,
      width: 900,
      height: 12,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: true,
      order: 5,
      color: '#6366f1',
      radius: 6,
      durationStart: 0,
      durationEnd: 30,
    }
  ]);

  // Load from local storage if existing editor session found for this project
  useEffect(() => {
    const saved = localStorage.getItem(`viral_editor_proj_${projectId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.canvas) setCanvasSettings(parsed.canvas);
        if (parsed.layers) setLayers(parsed.layers);
        if (parsed.totalDuration) setTotalDuration(parsed.totalDuration);
        resetHistory(parsed.layers, parsed.canvas);
      } catch (e) {
        console.error('Falha ao restaurar dados salvos do editor local', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // 4. History Tracking Initialization
  const {
    current,
    pushState,
    undo: triggerUndo,
    redo: triggerRedo,
    resetHistory,
    canUndo,
    canRedo,
  } = useHistory(layers, canvasSettings);

  // Sync state with history updates
  const handleUndo = () => {
    const previous = triggerUndo();
    if (previous) {
      setLayers(previous.layers);
      setCanvasSettings(previous.canvas);
    }
  };

  const handleRedo = () => {
    const next = triggerRedo();
    if (next) {
      setLayers(next.layers);
      setCanvasSettings(next.canvas);
    }
  };

  // Push to history helper (debounced/controlled)
  const pushStateUpdate = (newLayers: EditorLayer[], newCanvas: CanvasSettings) => {
    setLayers(newLayers);
    setCanvasSettings(newCanvas);
    pushState(newLayers, newCanvas);

    // Auto save triggers
    triggerAutoSave(newLayers, newCanvas, totalDuration);
  };

  // 5. Playback Timer Controller
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            return 0; // Loop playback
          }
          return Number((prev + 0.1).toFixed(2));
        });
      }, 100);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  // Auto scale / Fit to screen helper
  const handleFitScreen = () => {
    // Standard workspace container is roughly 1200x800 bounding area minus sidebars
    const containerW = window.innerWidth - 650; // account for sidebars
    const containerH = window.innerHeight - 320; // account for toolbar & timeline

    const scaleX = containerW / canvasSettings.width;
    const scaleY = containerH / canvasSettings.height;
    setScale(Number(Math.min(scaleX, scaleY, 0.9).toFixed(2)));
  };

  // Run Fit Screen on mount
  useEffect(() => {
    handleFitScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSettings.aspectRatio]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Shift+Z, Space to play)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Ignore inside input fields
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selectedLayerId) {
          handleDuplicateLayer(selectedLayerId);
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedLayerId) {
          handleDeleteLayer(selectedLayerId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // 6. Project Autosaver
  const triggerAutoSave = (currentLayers: EditorLayer[], currentCanvas: CanvasSettings, currentDur: number) => {
    setIsSaving(true);
    const saveObj = {
      canvas: currentCanvas,
      layers: currentLayers,
      totalDuration: currentDur,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(`viral_editor_proj_${projectId}`, JSON.stringify(saveObj));
    onSaveProjectData(saveObj);

    // Simulate short loader
    setTimeout(() => {
      setIsSaving(false);
    }, 600);
  };

  // Manual save trigger
  const handleManualSave = () => {
    triggerAutoSave(layers, canvasSettings, totalDuration);
  };

  // Render trigger
  const handleRenderProduction = () => {
    triggerAutoSave(layers, canvasSettings, totalDuration);
    alert(`Renderização em lote iniciada! O JSON de layout foi compilado e enviado para a fila do FFmpeg:\n\n${JSON.stringify({ canvas: canvasSettings, layers, totalDuration }, null, 2)}`);
  };

  // 7. Layer Action Handlers
  const handleAddLayer = (type: EditorLayerType, params: Partial<EditorLayer> = {}) => {
    const isOverlayType = type === 'overlay' || type === 'progressBar';
    
    // Default centering positions
    const centerX = canvasSettings.width / 2;
    const centerY = canvasSettings.height / 2;
    const defW = type === 'video' ? 1080 : isOverlayType ? canvasSettings.width : 500;
    const defH = type === 'video' ? 1920 : type === 'progressBar' ? 12 : isOverlayType ? 300 : 150;

    const newLayer: EditorLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${layers.length + 1}`,
      type,
      x: params.x !== undefined ? params.x : Math.round(centerX - defW / 2),
      y: params.y !== undefined ? params.y : Math.round(centerY - defH / 2),
      width: params.width || defW,
      height: params.height || defH,
      rotation: params.rotation || 0,
      opacity: params.opacity || 100,
      visible: true,
      locked: false,
      order: layers.length + 1,
      durationStart: 0,
      durationEnd: totalDuration,
      ...params,
    };

    const nextLayers = [...layers, newLayer];
    pushStateUpdate(nextLayers, canvasSettings);
    setSelectedLayerId(newLayer.id);
  };

  const handleUpdateLayer = (layerId: string, updates: Partial<EditorLayer>) => {
    const nextLayers = layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l));
    pushStateUpdate(nextLayers, canvasSettings);
  };

  const handleDeleteLayer = (layerId: string) => {
    const nextLayers = layers.filter((l) => l.id !== layerId);
    pushStateUpdate(nextLayers, canvasSettings);
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  const handleDuplicateLayer = (layerId: string) => {
    const source = layers.find((l) => l.id === layerId);
    if (!source) return;

    const clone: EditorLayer = {
      ...source,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${source.name} (Cópia)`,
      x: source.x + 30, // Offset position slightly so it sits visibly off the original
      y: source.y + 30,
      order: layers.length + 1,
    };

    const nextLayers = [...layers, clone];
    pushStateUpdate(nextLayers, canvasSettings);
    setSelectedLayerId(clone.id);
  };

  const handleAspectRatioChange = (aspect: CanvasAspectRatio) => {
    const dims = RESOLUTIONS_MAP[aspect];
    const updatedSettings: CanvasSettings = {
      ...canvasSettings,
      aspectRatio: aspect,
      width: dims.width,
      height: dims.height,
    };

    // Responsive adaptation helper: scale layer bounding boxes to fit new aspect ratios
    const ratioX = dims.width / canvasSettings.width;
    const ratioY = dims.height / canvasSettings.height;

    const nextLayers = layers.map((l) => {
      if (l.locked) return l;
      return {
        ...l,
        x: Math.round(l.x * ratioX),
        y: Math.round(l.y * ratioY),
        width: Math.round(l.width * ratioX),
        height: Math.round(l.height * ratioY),
      };
    });

    pushStateUpdate(nextLayers, updatedSettings);
  };

  return (
    <div className="fixed inset-0 bg-[#03050a] flex flex-col z-[100] overflow-hidden select-none text-gray-200 font-sans">
      {/* Upper Global Navigation & Action Toolbar */}
      <Toolbar
        projectName={name}
        onRenameProject={setName}
        aspectRatio={canvasSettings.aspectRatio}
        onAspectRatioChange={handleAspectRatioChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleManualSave}
        onRender={handleRenderProduction}
        onDuplicate={() => handleDuplicateLayer(selectedLayerId || '')}
        onClose={onClose}
        isSaving={isSaving}
      />

      {/* Center visual layout splitting Panels and Screen canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Preset Assets Picker */}
        <AssetsPanel onAddLayer={handleAddLayer} />

        {/* Mid-Left Side: Layer List tree */}
        <LayerPanel
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayer={handleUpdateLayer}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onReorderLayers={(reordered) => pushStateUpdate(reordered, canvasSettings)}
        />

        {/* Central Display: Visual Canvas rendering stage */}
        <div className="flex-1 flex flex-col relative h-full">
          <Canvas
            settings={canvasSettings}
            layers={layers}
            selectedLayerId={selectedLayerId}
            currentTime={currentTime}
            scale={scale}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayer={handleUpdateLayer}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
          />

          {/* Canvas specific overlay helper to manually adjust Zoom Scale */}
          <div className="absolute bottom-6 right-6">
            <ToolbarZoomControlsOnly
              scale={scale}
              onScaleChange={setScale}
              onFitScreen={handleFitScreen}
              settings={canvasSettings}
              onUpdateSettings={(updates) => pushStateUpdate(layers, { ...canvasSettings, ...updates })}
            />
          </div>
        </div>

        {/* Right Side: Inspector Control Form */}
        <Inspector
          selectedLayerId={selectedLayerId}
          layers={layers}
          onUpdateLayer={handleUpdateLayer}
          totalDuration={totalDuration}
        />
      </div>

      {/* Lower timeline controller */}
      <Timeline
        layers={layers}
        selectedLayerId={selectedLayerId}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        onSelectLayer={setSelectedLayerId}
        onUpdateLayer={handleUpdateLayer}
        onTimeChange={setCurrentTime}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onDeleteLayer={handleDeleteLayer}
        onDuplicateLayer={handleDuplicateLayer}
        onUpdateTotalDuration={(dur) => {
          setTotalDuration(dur);
          // Auto stretch/trim progress bars to new duration
          const stretched = layers.map((l) => {
            if (l.durationEnd === totalDuration) {
              return { ...l, durationEnd: dur };
            }
            return l;
          });
          pushStateUpdate(stretched, canvasSettings);
        }}
      />
    </div>
  );
};

// Internal minimal zoom controls floating on the canvas
interface ZoomProps {
  scale: number;
  onScaleChange: (s: number) => void;
  onFitScreen: () => void;
  settings: CanvasSettings;
  onUpdateSettings: (updates: Partial<CanvasSettings>) => void;
}

const ToolbarZoomControlsOnly: React.FC<ZoomProps> = ({
  scale,
  onScaleChange,
  onFitScreen,
  settings,
  onUpdateSettings,
}) => {
  const pct = Math.round(scale * 100);
  return (
    <div className="bg-gray-950/90 border border-gray-900 rounded-xl px-3 py-1.5 shadow-2xl flex items-center gap-2.5 backdrop-blur-md">
      <button
        onClick={() => onUpdateSettings({ gridEnabled: !settings.gridEnabled })}
        className={`p-1 rounded-lg text-xs font-semibold ${settings.gridEnabled ? 'bg-indigo-950 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
        title="Grade de Alinhamento"
      >
        #
      </button>
      <button
        onClick={() => onUpdateSettings({ safeAreaEnabled: !settings.safeAreaEnabled })}
        className={`p-1 rounded-lg text-xs font-semibold ${settings.safeAreaEnabled ? 'bg-indigo-950 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
        title="Áreas de Segurança"
      >
        O
      </button>
      <div className="w-px h-4 bg-gray-800" />
      <button onClick={() => onScaleChange(Math.max(0.1, scale - 0.05))} className="p-1 text-gray-400 hover:text-white rounded">
        -
      </button>
      <span className="text-[10px] font-mono font-bold text-gray-400 min-w-[34px] text-center">{pct}%</span>
      <button onClick={() => onScaleChange(Math.min(2.0, scale + 0.05))} className="p-1 text-gray-400 hover:text-white rounded">
        +
      </button>
      <button onClick={onFitScreen} className="p-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 rounded ml-1 uppercase">
        Fit
      </button>
    </div>
  );
};
