/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EditorLayer } from './types';
import { 
  Layers, Eye, EyeOff, Lock, Unlock, 
  Trash2, Copy, ChevronUp, ChevronDown, 
  Type, Video, Image, Play, Sliders, TypeIcon, Sparkles, HelpCircle 
} from 'lucide-react';

interface LayerPanelProps {
  layers: EditorLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<EditorLayer>) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onReorderLayers: (reordered: EditorLayer[]) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onReorderLayers,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Sort layers by order descending (top layers first)
  const sortedLayers = [...layers].sort((a, b) => b.order - a.order);

  const toggleVisible = (layer: EditorLayer) => {
    onUpdateLayer(layer.id, { visible: !layer.visible });
  };

  const toggleLock = (layer: EditorLayer) => {
    onUpdateLayer(layer.id, { locked: !layer.locked });
  };

  const startRename = (layer: EditorLayer) => {
    setEditingId(layer.id);
    setRenameValue(layer.name);
  };

  const finishRename = (id: string) => {
    if (renameValue.trim()) {
      onUpdateLayer(id, { name: renameValue.trim() });
    }
    setEditingId(null);
  };

  const moveLayer = (layer: EditorLayer, direction: 'up' | 'down') => {
    const currentIndex = layers.findIndex((l) => l.id === layer.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'up') {
      // Find the next layer with a higher order index in the list
      // Wait, in order parameter: higher index means drawn on top
      // Let's simply swap orders with the adjacent item in layers array
      targetIndex = currentIndex + 1 < layers.length ? currentIndex + 1 : currentIndex;
    } else {
      targetIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : currentIndex;
    }

    if (targetIndex === currentIndex) return;

    const newLayers = [...layers];
    // Swap orders
    const tempOrder = newLayers[currentIndex].order;
    newLayers[currentIndex].order = newLayers[targetIndex].order;
    newLayers[targetIndex].order = tempOrder;

    // Swap positions in array
    const temp = newLayers[currentIndex];
    newLayers[currentIndex] = newLayers[targetIndex];
    newLayers[targetIndex] = temp;

    onReorderLayers(newLayers);
  };

  const getLayerIcon = (type: EditorLayer['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-indigo-400" />;
      case 'image':
      case 'logo':
      case 'watermark':
        return <Image className="w-3.5 h-3.5 text-pink-400" />;
      case 'headline':
      case 'subheadline':
      case 'text':
      case 'cta':
      case 'subtitle':
        return <Type className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sliders className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="w-72 bg-[#090b14] border-r border-gray-900 flex flex-col h-full">
      {/* Header Panel */}
      <div className="h-12 border-b border-gray-900 flex items-center justify-between px-4 bg-gray-950/40">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-200">Camadas ({layers.length})</span>
        </div>
        <span className="text-[9px] font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">Z-Index</span>
      </div>

      {/* Layer List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {sortedLayers.length === 0 ? (
          <div className="text-center py-12 px-4 text-gray-500 border border-dashed border-gray-900 rounded-xl">
            <Layers className="w-8 h-8 mx-auto text-gray-700 mb-2.5" />
            <p className="text-[11px] leading-relaxed">Sem camadas no projeto.</p>
            <p className="text-[9px] text-gray-600 mt-1 font-mono">Use a barra de ativos para adicionar elementos.</p>
          </div>
        ) : (
          sortedLayers.map((layer) => {
            const isSelected = layer.id === selectedLayerId;
            const isEditing = layer.id === editingId;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`group flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                    : 'bg-gray-950/50 border-gray-900 hover:border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {/* Visual indicator bar */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-shrink-0">{getLayerIcon(layer.type)}</div>
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => finishRename(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishRename(layer.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="bg-gray-900 border border-indigo-500 text-xs text-white px-1.5 py-0.5 rounded w-full outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startRename(layer);
                      }}
                      className={`text-[11px] font-semibold truncate ${isSelected ? 'text-indigo-200' : 'text-gray-300'}`}
                      title="Clique duplo para renomear"
                    >
                      {layer.name}
                    </span>
                  )}
                </div>

                {/* Layer Control Buttons (visible on hover or when selected) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5">
                  {/* Reorder Buttons */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer, 'up');
                    }}
                    className="p-1 hover:bg-gray-900 hover:text-indigo-400 rounded transition cursor-pointer"
                    title="Mover para cima"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(layer, 'down');
                    }}
                    className="p-1 hover:bg-gray-900 hover:text-indigo-400 rounded transition cursor-pointer"
                    title="Mover para baixo"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  <div className="w-px h-3 bg-gray-800" />

                  {/* Lock Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(layer);
                    }}
                    className={`p-1 rounded transition cursor-pointer ${
                      layer.locked ? 'text-red-400 bg-red-950/20 hover:bg-red-950/40' : 'hover:bg-gray-900 text-gray-500 hover:text-gray-300'
                    }`}
                    title={layer.locked ? 'Desbloquear camada' : 'Bloquear camada'}
                  >
                    {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisible(layer);
                    }}
                    className={`p-1 rounded transition cursor-pointer ${
                      !layer.visible ? 'text-gray-600 bg-gray-900 hover:bg-gray-850' : 'hover:bg-gray-900 text-gray-500 hover:text-gray-300'
                    }`}
                    title={layer.visible ? 'Ocultar camada' : 'Mostrar camada'}
                  >
                    {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>

                  {/* Duplicate and Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateLayer(layer.id);
                    }}
                    className="p-1 hover:bg-gray-900 text-gray-500 hover:text-indigo-400 rounded transition cursor-pointer"
                    title="Duplicar"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    className="p-1 hover:bg-red-950/40 text-gray-500 hover:text-red-400 rounded transition cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Bar */}
      <div className="p-3 bg-gray-950/30 border-t border-gray-900 text-[10px] text-gray-500 font-medium flex items-center gap-1.5 select-none">
        <HelpCircle className="w-3.5 h-3.5 text-gray-600" />
        <span>Dica: Clique duplo em um item para renomear.</span>
      </div>
    </div>
  );
};
