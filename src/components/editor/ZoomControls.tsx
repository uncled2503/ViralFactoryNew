/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ZoomIn, ZoomOut, Maximize, Grid, Compass, LayoutGrid } from 'lucide-react';
import { CanvasSettings } from './types';

interface ZoomControlsProps {
  scale: number;
  onScaleChange: (newScale: number) => void;
  onFitScreen: () => void;
  settings: CanvasSettings;
  onUpdateSettings: (updates: Partial<CanvasSettings>) => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  onScaleChange,
  onFitScreen,
  settings,
  onUpdateSettings,
}) => {
  const percentage = Math.round(scale * 100);

  return (
    <div className="absolute bottom-6 right-6 bg-gray-950/90 border border-gray-900/80 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-3 backdrop-blur-md z-50">
      {/* Grid toggle button */}
      <button
        onClick={() => onUpdateSettings({ gridEnabled: !settings.gridEnabled })}
        className={`p-1.5 rounded-lg transition cursor-pointer ${
          settings.gridEnabled ? 'bg-indigo-950 text-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
        }`}
        title="Grade de Alinhamento"
      >
        <Grid className="w-4 h-4" />
      </button>

      {/* Safe Area toggle button */}
      <button
        onClick={() => onUpdateSettings({ safeAreaEnabled: !settings.safeAreaEnabled })}
        className={`p-1.5 rounded-lg transition cursor-pointer ${
          settings.safeAreaEnabled ? 'bg-indigo-950 text-indigo-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
        }`}
        title="Margens de Segurança (Safe Area)"
      >
        <Compass className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-gray-800" />

      {/* Zoom Out */}
      <button
        onClick={() => onScaleChange(Math.max(0.1, scale - 0.1))}
        className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-900 rounded-lg transition cursor-pointer"
        title="Diminuir Zoom"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <span className="text-xs font-mono font-semibold text-gray-400 select-none min-w-[42px] text-center">
        {percentage}%
      </span>

      {/* Zoom In */}
      <button
        onClick={() => onScaleChange(Math.min(3.0, scale + 0.1))}
        className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-900 rounded-lg transition cursor-pointer"
        title="Aumentar Zoom"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      {/* Fit Screen */}
      <button
        onClick={onFitScreen}
        className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-900 rounded-lg transition cursor-pointer"
        title="Ajustar à Tela"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
};
