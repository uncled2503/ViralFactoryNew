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
  onDuplicate: () => void;
  onClose: () => void;
  isSaving: boolean;
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
  onDuplicate,
  onClose,
  isSaving,
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
