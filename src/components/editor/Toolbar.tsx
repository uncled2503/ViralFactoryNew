/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Save, Undo, Redo, ZoomIn, ZoomOut, Play, Pause, 
  Settings, ChevronDown, Video, Copy, Monitor, ArrowLeft,
  Sparkles, Check, RefreshCw
} from 'lucide-react';
import { CanvasAspectRatio, CanvasSettings } from './types';

interface ToolbarProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  aspectRatio: CanvasAspectRatio;
  onAspectRatioChange: (aspect: CanvasAspectRatio) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRender: () => void;
  onRenderSandbox: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  isSaving: boolean;
  presetId?: string;
  onPresetChange?: (presetId: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  projectName,
  onRenameProject,
  aspectRatio,
  onAspectRatioChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onRender,
  onRenderSandbox,
  onDuplicate,
  onClose,
  isSaving,
  presetId = 'tiktok',
  onPresetChange,
}) => {
  return (
    <div className="h-14 border-b border-gray-900 bg-gray-950 flex items-center justify-between px-4 z-50 select-none">
      
      {/* 1. Left controls: Close / Project Title & Undo/Redo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </button>

        <div className="w-px h-6 bg-gray-900" />

        {/* Project Rename Field */}
        <div className="flex flex-col">
          <input
            type="text"
            value={projectName}
            onChange={(e) => onRenameProject(e.target.value)}
            className="bg-transparent border-0 font-bold text-xs text-gray-200 outline-none w-44 focus:ring-1 focus:ring-indigo-500 rounded px-1"
            title="Renomear Projeto"
          />
          <span className="text-[9px] text-gray-600 font-bold font-mono px-1">FFMPEG WORKSPACE ENGINE</span>
        </div>

        <div className="w-px h-6 bg-gray-900" />

        {/* Undo / Redo buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-xl transition cursor-pointer ${
              canUndo ? 'text-gray-300 hover:bg-gray-900 hover:text-white' : 'text-gray-600 cursor-not-allowed'
            }`}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-xl transition cursor-pointer ${
              canRedo ? 'text-gray-300 hover:bg-gray-900 hover:text-white' : 'text-gray-600 cursor-not-allowed'
            }`}
            title="Refazer (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Center controls: Aspect Ratio Selectors */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hidden md:inline">Formato:</span>
        <div className="flex bg-gray-900/60 p-1 border border-gray-900 rounded-xl">
          {(['9:16', '16:9', '1:1', '4:5', '3:4'] as const).map((aspect) => (
            <button
              key={aspect}
              onClick={() => onAspectRatioChange(aspect)}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                aspectRatio === aspect
                  ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {aspect}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Right controls: Save, Duplicate, configurations, and RENDER! */}
      <div className="flex items-center gap-2.5">
        
        {/* Save indicator */}
        <button
          onClick={onSave}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="hidden sm:inline text-indigo-400">Salvando...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline text-emerald-400">Salvo</span>
            </>
          )}
        </button>

        {/* Duplicate */}
        <button
          onClick={onDuplicate}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-xl transition cursor-pointer"
          title="Duplicar Projeto"
        >
          <Copy className="w-4 h-4" />
        </button>

        {/* Export Preset Selection Dropdown */}
        <div className="flex items-center gap-1.5 bg-gray-900/60 border border-gray-900 px-2.5 py-1 rounded-xl">
          <Settings className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={presetId}
            onChange={(e) => onPresetChange?.(e.target.value)}
            className="bg-transparent border-none text-[10px] font-bold text-gray-300 focus:outline-none cursor-pointer uppercase font-mono py-0.5"
            title="Escolher Preset de Exportação (FFmpeg)"
          >
            <option value="tiktok" className="bg-gray-950 text-gray-300">TikTok (9:16, 30fps)</option>
            <option value="reels" className="bg-gray-950 text-gray-300">Reels (9:16, 30fps)</option>
            <option value="shorts" className="bg-gray-950 text-gray-300">Shorts (9:16, 60fps)</option>
            <option value="stories" className="bg-gray-950 text-gray-300">Stories (9:16, 30fps)</option>
            <option value="feed_square" className="bg-gray-950 text-gray-300">Feed 1:1 (1:1, 30fps)</option>
            <option value="youtube_16_9" className="bg-gray-950 text-gray-300">YouTube 16:9 (16:9, 60fps)</option>
            <option value="facebook" className="bg-gray-950 text-gray-300">Facebook (16:9, 30fps)</option>
          </select>
        </div>

        {/* Action Button: SANDBOX PREVIEW */}
        <button
          onClick={onRenderSandbox}
          className="py-1.5 px-3 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          title="Permitir renderizar apenas 3 segundos do projeto para validação de layout rápida"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-pink-200" />
          <span>Sandbox (3s)</span>
        </button>

        {/* Action Button: RENDER MASS PRODUCTION */}
        <button
          onClick={onRender}
          className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-lg cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Video className="w-4 h-4 fill-current" />
          <span>Renderizar em Lote</span>
        </button>
      </div>
    </div>
  );
};
