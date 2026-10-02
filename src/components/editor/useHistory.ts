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

// history and index are kept in ONE state atom (not two separate useState calls) so every
// update is a single, atomic functional setState — pushState/undo/redo can otherwise fire twice
// before a re-render (e.g. a keyboard-shortcut handler and a drag-triggered update landing in
// the same tick), and two separate closure-captured `history`/`index` states made the second
// call compute against stale values, silently dropping a change or desyncing index from the
// history array.
interface HistoryAtom {
  entries: HistoryState[];
  index: number;
}

export function useHistory(initialLayers: EditorLayer[], initialCanvas: CanvasSettings) {
  const [atom, setAtom] = useState<HistoryAtom>({
    entries: [{ layers: initialLayers, canvas: initialCanvas }],
    index: 0
  });

  const current = atom.entries[atom.index];

  const pushState = (layers: EditorLayer[], canvas: CanvasSettings) => {
    setAtom(prev => {
      // If we make a change, truncate any future history we had redone over
      const nextEntries = prev.entries.slice(0, prev.index + 1);

      // Check if the state actually changed to avoid duplicate history states
      const lastState = nextEntries[nextEntries.length - 1];
      if (
        lastState &&
        JSON.stringify(lastState.layers) === JSON.stringify(layers) &&
        JSON.stringify(lastState.canvas) === JSON.stringify(canvas)
      ) {
        return prev;
      }

      return {
        entries: [...nextEntries, { layers, canvas }],
        index: nextEntries.length
      };
    });
  };

  const undo = (): HistoryState | null => {
    let result: HistoryState | null = null;
    setAtom(prev => {
      if (prev.index <= 0) return prev;
      const nextIndex = prev.index - 1;
      result = prev.entries[nextIndex];
      return { ...prev, index: nextIndex };
    });
    return result;
  };

  const redo = (): HistoryState | null => {
    let result: HistoryState | null = null;
    setAtom(prev => {
      if (prev.index >= prev.entries.length - 1) return prev;
      const nextIndex = prev.index + 1;
      result = prev.entries[nextIndex];
      return { ...prev, index: nextIndex };
    });
    return result;
  };

  const resetHistory = (layers: EditorLayer[], canvas: CanvasSettings) => {
    setAtom({ entries: [{ layers, canvas }], index: 0 });
  };

  return {
    current,
    pushState,
    undo,
    redo,
    resetHistory,
    canUndo: atom.index > 0,
    canRedo: atom.index < atom.entries.length - 1
  };
}
