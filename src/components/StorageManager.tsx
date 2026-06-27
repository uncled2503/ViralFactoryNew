/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StorageFile } from '../types';
import { ConfirmModal } from './ConfirmModal';
import {
  HardDrive,
  Folder,
  File,
  FileAudio,
  FileImage,
  FileVideo,
  FileCode,
  Trash2,
  Upload,
  Search,
  Plus,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';

export const StorageManager: React.FC = () => {
  const { folders, uploadFileToFolder, deleteFileFromFolder, stats } = useApp();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<StorageFile | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<StorageFile['type']>('image');
  const [newFileSize, setNewFileSize] = useState('2.5 MB');

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  const getFileIcon = (type: StorageFile['type']) => {
    switch (type) {
      case 'video':
      case 'render':
        return <FileVideo className="w-4 h-4 text-purple-400" />;
      case 'image':
        return <FileImage className="w-4 h-4 text-emerald-400" />;
      case 'audio':
        return <FileAudio className="w-4 h-4 text-blue-400" />;
      case 'font':
        return <FileCode className="w-4 h-4 text-indigo-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName || !selectedFolderId) return;

    // Auto append extension if missing
    let finalName = newFileName;
    const extensions: Record<StorageFile['type'], string> = {
      image: '.png',
      video: '.mp4',
      audio: '.wav',
      font: '.json',
      render: '.mp4'
    };
    
    if (!finalName.includes('.')) {
      finalName += extensions[newFileType];
    }

    uploadFileToFolder(selectedFolderId, finalName, newFileSize, newFileType);
    setNewFileName('');
    setIsUploadOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header section with active action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <span>Pastas & Mídias</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Explore a estrutura de diretórios do SaaS. Armazene e consulte áudios, logos e vídeos de gameplay.
          </p>
        </div>

        {selectedFolderId && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Simular Upload</span>
          </button>
        )}
      </div>

      {/* Main Grid: Folders or Files Browser */}
      {!selectedFolderId ? (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex justify-between items-center max-w-sm">
            <span>DIRETÓRIO RAIZ (SaaS Cloud Storage)</span>
            <span className="text-emerald-400 font-semibold">{stats.storageUsed}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {folders.map((folder) => {
              const totalSize = folder.files.reduce((acc, f) => {
                const num = parseFloat(f.size);
                return isNaN(num) ? acc : acc + num;
              }, 0);
              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className="glass-panel glass-panel-hover rounded-2xl p-5 border border-gray-900 cursor-pointer flex flex-col justify-between h-[180px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-indigo-950/40 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
                        <Folder className="w-5 h-5 fill-current opacity-80" />
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                        {folder.path}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-200 mt-2">{folder.name}</h3>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {folder.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-900/40 flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>{folder.files.length} arquivos</span>
                    <span className="text-gray-500">{totalSize > 0 ? `~${totalSize.toFixed(1)} MB` : 'Vazio'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Breadcrumb Back control */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setSelectedFolderId(null); setSearchQuery(''); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para o diretório raiz</span>
            </button>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar arquivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Directory Title Banner */}
          <div className="p-4 rounded-xl bg-gray-950 border border-gray-900 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-indigo-400 font-mono tracking-wider font-semibold">PASTA SELECIONADA</span>
              <h2 className="text-sm font-bold text-gray-200 mt-0.5">{selectedFolder?.name}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">{selectedFolder?.description}</p>
            </div>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-900 px-3 py-1 rounded border border-gray-800">
              {selectedFolder?.path}
            </span>
          </div>

          {/* Files List Table */}
          <div className="glass-panel rounded-2xl border border-gray-900 overflow-hidden">
            <div className="p-4 border-b border-gray-900/60 bg-gray-950/40 grid grid-cols-12 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              <span className="col-span-6 md:col-span-7">Nome do Arquivo</span>
              <span className="col-span-3 md:col-span-2 text-right">Tamanho</span>
              <span className="col-span-3 font-mono text-right">Data</span>
            </div>

            <div className="divide-y divide-gray-900/60">
              {selectedFolder?.files.length === 0 ? (
                <div className="p-10 text-center">
                  <CheckCircle2 className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">Pasta vazia</p>
                  <p className="text-[10px] text-gray-600 mt-1">Clique em "Simular Upload" para adicionar mídias aqui.</p>
                </div>
              ) : (
                selectedFolder?.files
                  .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((file) => (
                    <div
                      key={file.id}
                      className="p-4 grid grid-cols-12 items-center text-xs hover:bg-gray-900/20 transition group"
                    >
                      <div className="col-span-6 md:col-span-7 flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded bg-gray-950 border border-gray-900 shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <span className="font-medium text-gray-200 truncate pr-4">{file.name}</span>
                      </div>

                      <span className="col-span-3 md:col-span-2 text-right text-gray-400 font-mono">{file.size}</span>

                      <div className="col-span-3 flex items-center justify-end gap-3 font-mono text-gray-500 text-[11px] text-right">
                        <span>{new Date(file.createdAt).toLocaleDateString('pt-BR')}</span>
                        <button
                          onClick={() => {
                            setFileToDelete(file);
                            setIsConfirmOpen(true);
                          }}
                          className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/20 transition md:opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Excluir Arquivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Simulate File Upload */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-100">Simular Upload de Mídia</h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Nome do Arquivo</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Ex: gameplay_gta_v"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Tipo de Arquivo</label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  >
                    <option value="video">Vídeo (.mp4)</option>
                    <option value="audio">Áudio (.mp3 / .wav)</option>
                    <option value="image">Imagem (.png / .jpg)</option>
                    <option value="font">Fonte / Config (.json)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Tamanho do Arquivo</label>
                  <input
                    type="text"
                    required
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    placeholder="12.4 MB"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-900/60">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3.5 py-1.5 hover:bg-gray-900 text-gray-400 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/10 transition cursor-pointer"
                >
                  Concluir Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setFileToDelete(null);
        }}
        onConfirm={() => {
          if (fileToDelete && selectedFolderId) {
            deleteFileFromFolder(selectedFolderId, fileToDelete.id);
          }
        }}
        title="Excluir Arquivo"
        message={`Tem certeza que deseja excluir o arquivo "${fileToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};
