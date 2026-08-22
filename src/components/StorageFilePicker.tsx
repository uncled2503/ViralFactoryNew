/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StorageFile } from '../types';
import { FileThumbnail } from './StorageManager';
import { EmptyState } from './ui/EmptyState';
import { Search, X, Check, HardDrive } from 'lucide-react';

interface StorageFilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  fileTypes: StorageFile['type'][];
  multiple?: boolean;
  title?: string;
  onSelect: (files: StorageFile[]) => void;
}

// Lets a user reuse a file already uploaded to Arquivos instead of uploading it again —
// used by the project wizard for both the template and the batch-of-videos steps.
export const StorageFilePicker: React.FC<StorageFilePickerProps> = ({
  isOpen,
  onClose,
  fileTypes,
  multiple = false,
  title = 'Escolher arquivo salvo',
  onSelect
}) => {
  const { folders } = useApp();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allFiles = useMemo(() => {
    const files = folders.flatMap((f) => f.files.filter((file) => fileTypes.includes(file.type)));
    // De-duplicate in case the same file id somehow appears in more than one folder listing
    const seen = new Set<string>();
    return files.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
  }, [folders, fileTypes]);

  const filtered = allFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  const toggleSelect = (file: StorageFile) => {
    if (!multiple) {
      onSelect([file]);
      onClose();
      return;
    }
    setSelectedIds((prev) => (prev.includes(file.id) ? prev.filter((id) => id !== file.id) : [...prev, file.id]));
  };

  const handleConfirm = () => {
    onSelect(allFiles.filter((f) => selectedIds.includes(f.id)));
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div
        className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-900/80 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-900/60 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar arquivo..."
              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-850 rounded-xl text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/40"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title={allFiles.length === 0 ? 'Nenhum arquivo compatível em Arquivos' : 'Nenhum arquivo encontrado'}
              description={allFiles.length === 0 ? 'Envie arquivos na aba Arquivos para poder reutilizá-los aqui.' : 'Ajuste a busca para ver outros arquivos.'}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((file) => {
                const isSelected = selectedIds.includes(file.id);
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => toggleSelect(file)}
                    className={`relative h-28 rounded-xl overflow-hidden border-2 text-left transition cursor-pointer ${
                      isSelected ? 'border-indigo-500' : 'border-gray-900 hover:border-gray-800'
                    }`}
                  >
                    <FileThumbnail file={file} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                      <span className="text-[9px] text-gray-200 font-mono truncate block">{file.name}</span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 border border-indigo-400/40 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {multiple && (
          <div className="p-4 border-t border-gray-900/60 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono text-gray-500">{selectedIds.length} selecionado(s)</span>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedIds.length === 0
                  ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              Usar Selecionados
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
