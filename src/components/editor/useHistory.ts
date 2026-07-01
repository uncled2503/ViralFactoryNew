/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { EditorLayer, CanvasSettings } from './types';

interface HistoryState {
  layers: EditorLayer[];
  canvas: CanvasSettings;
}

export function useHistory(initialLayers: EditorLayer[], initialCanvas: CanvasSettings) {
  const [history, setHistory] = useState<HistoryState[]>([
    { layers: initialLayers, canvas: initialCanvas }
  ]);
  const [index, setIndex] = useState<number>(0);

  const current = history[index];

  const pushState = (layers: EditorLayer[], canvas: CanvasSettings) => {
    // If we make a change, truncate any future history we had redone over
    const nextHistory = history.slice(0, index + 1);
    
    // Check if the state actually changed to avoid duplicate history states
    const lastState = nextHistory[nextHistory.length - 1];
    if (
      lastState &&
      JSON.stringify(lastState.layers) === JSON.stringify(layers) &&
      JSON.stringify(lastState.canvas) === JSON.stringify(canvas)
    ) {
      return;
    }

    setHistory([...nextHistory, { layers, canvas }]);
    setIndex(nextHistory.length);
  };

  const undo = (): HistoryState | null => {
    if (index > 0) {
      const nextIndex = index - 1;
      setIndex(nextIndex);
      return history[nextIndex];
    }
    return null;
  };

  const redo = (): HistoryState | null => {
    if (index < history.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      return history[nextIndex];
    }
    return null;
  };

  const resetHistory = (layers: EditorLayer[], canvas: CanvasSettings) => {
    setHistory([{ layers, canvas }]);
    setIndex(0);
  };

  return {
    current,
    pushState,
    undo,
    redo,
    resetHistory,
    canUndo: index > 0,
    canRedo: index < history.length - 1
  };
}
