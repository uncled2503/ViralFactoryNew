/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { StorageFile, StorageFolder } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { uploadFileToServer } from '../utils/uploadFile';
import { EmptyState } from './ui/EmptyState';
import { PageHeader } from './ui/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
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
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  ArrowUpDown,
  Filter,
  Eye,
  Download,
  FolderPlus,
  ChevronRight,
  ExternalLink,
  Edit3
} from 'lucide-react';

// Real thumbnail — plays the actual video/image from `file.url` instead of a generic
// icon. Falls back to an icon if the URL fails to load (e.g. a stale record from
// before real uploads existed).
export const FileThumbnail: React.FC<{ file: StorageFile }> = ({ file }) => {
  const [errored, setErrored] = useState(false);

  if (!errored && (file.type === 'video' || file.type === 'render')) {
    return (
      <video
        src={file.url}
        className="absolute inset-0 w-full h-full object-cover bg-slate-950"
        muted
        preload="metadata"
        playsInline
        onError={() => setErrored(true)}
        onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
        onMouseOut={(e) => {
          const v = e.currentTarget as HTMLVideoElement;
          v.pause();
          v.currentTime = 0;
        }}
      />
    );
  }

  if (!errored && file.type === 'image') {
    return (
      <img
        src={file.url}
        alt={file.name}
        className="absolute inset-0 w-full h-full object-cover bg-slate-950"
        loading="lazy"
        onError={() => setErrored(true)}
      />
    );
  }

  if (file.type === 'audio') {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 to-slate-900 flex items-center justify-center">
        <div className="flex gap-0.5 items-end h-5">
          <span className="w-1 bg-blue-500 h-2 animate-pulse" />
          <span className="w-1 bg-blue-400 h-4 animate-pulse" />
          <span className="w-1 bg-blue-500 h-3 animate-pulse" />
          <span className="w-1 bg-blue-300 h-1 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
      <File className="w-8 h-8 text-gray-700" />
    </div>
  );
};

export const StorageManager: React.FC = () => {
  const { 
    folders, 
    uploadFileToFolder, 
    deleteFileFromFolder, 
    stats,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFile,
    showToast
  } = useApp();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Controls
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'video' | 'audio' | 'image' | 'font'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');

  // Real file uploads — signed URL + PUT, same pattern used by the project wizard.
  // Every upload here actually sends the file's bytes to the server; the resulting
  // record only exists once that succeeds.
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<Array<{
    id: string;
    name: string;
    sizeLabel: string;
    type: StorageFile['type'];
    progress: number;
    status: 'uploading' | 'completed' | 'error';
  }>>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const inferFileType = (file: File): StorageFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.name.endsWith('.json')) return 'font';
    return 'video';
  };

  const startRealUpload = (files: File[], folderId: string) => {
    files.forEach((file) => {
      const id = `up-${Math.random().toString(36).substr(2, 9)}`;
      const sizeLabel = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      const type = inferFileType(file);
      setUploadQueue(prev => [...prev, { id, name: file.name, sizeLabel, type, progress: 0, status: 'uploading' }]);

      uploadFileToServer(file, (pct) => {
        setUploadQueue(prev => prev.map(u => (u.id === id ? { ...u, progress: pct } : u)));
      })
        .then((assetUrl) => {
          uploadFileToFolder(folderId, file.name, sizeLabel, type, assetUrl);
          setUploadQueue(prev => prev.map(u => (u.id === id ? { ...u, progress: 100, status: 'completed' } : u)));
        })
        .catch((err: any) => {
          console.error('Storage upload failed:', err);
          setUploadQueue(prev => prev.map(u => (u.id === id ? { ...u, status: 'error' } : u)));
          showToast(`Falha ao enviar "${file.name}": ${err.message || 'erro desconhecido'}`, 'error');
        });
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!selectedFolderId) return;

    const files = Array.from(e.dataTransfer.files) as File[];
    if (files.length > 0) startRealUpload(files, selectedFolderId);
  };

  // File Preview Modal Overlay
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);

  // Custom Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<StorageFile | null>(null);

  // Non-blocking folder/file management modals states
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<StorageFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');

  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<StorageFolder | null>(null);

  const [isMoveFileOpen, setIsMoveFileOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<StorageFile | null>(null);
  const [targetFolderId, setTargetFolderId] = useState('');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  const getFileIcon = (type: StorageFile['type']) => {
    switch (type) {
      case 'video':
      case 'render':
        return <FileVideo className="w-5 h-5 text-purple-400" />;
      case 'image':
        return <FileImage className="w-5 h-5 text-emerald-400" />;
      case 'audio':
        return <FileAudio className="w-5 h-5 text-blue-400" />;
      case 'font':
        return <FileCode className="w-5 h-5 text-indigo-400" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const getFileThumbnail = (file: StorageFile) => <FileThumbnail file={file} />;

  const handleUploadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && selectedFolderId) {
      startRealUpload(Array.from(e.target.files), selectedFolderId);
      e.target.value = '';
    }
  };

  const getFilteredAndSortedFiles = () => {
    if (!selectedFolder) return [];

    let files = selectedFolder.files;

    // 1. Search Query Filter
    if (searchQuery) {
      files = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 2. Type Filter
    if (fileTypeFilter !== 'all') {
      files = files.filter(f => {
        if (fileTypeFilter === 'video') return f.type === 'video' || f.type === 'render';
        return f.type === fileTypeFilter;
      });
    }

    // 3. Sorting
    return [...files].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'size') {
        const sizeA = parseFloat(a.size) || 0;
        const sizeB = parseFloat(b.size) || 0;
        return sizeB - sizeA;
      }
      return 0;
    });
  };

  const sortedFiles = getFilteredAndSortedFiles();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Arquivos"
        subtitle="Envie e organize templates, logos, fontes e vídeos de fundo em pastas."
        action={
          <div className="flex items-center gap-2">
            {!selectedFolderId && (
              <button
                onClick={() => {
                  setNewFolderName('');
                  setNewFolderDesc('');
                  setIsCreateFolderOpen(true);
                }}
                className="py-2.5 px-4 bg-gray-900 hover:bg-gray-800 border border-gray-850 text-gray-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                <span>Nova Pasta</span>
              </button>
            )}

            {selectedFolderId && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload em Lote</span>
              </button>
            )}
          </div>
        }
      />

      {/* Directory Path Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-mono py-2 px-3.5 bg-gray-950 border border-gray-900 rounded-xl max-w-max text-gray-400">
        <button
          onClick={() => setSelectedFolderId(null)}
          className="hover:text-white font-bold transition flex items-center gap-1"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Arquivos</span>
        </button>

        {selectedFolder && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-indigo-400 font-bold">{selectedFolder.name}</span>
          </>
        )}
      </div>

      {/* MAIN SCREEN: ROOT FOLDERS VIEW */}
      {!selectedFolderId ? (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex justify-between items-center max-w-sm">
            <span>PASTAS PRINCIPAIS</span>
            <span className="text-emerald-400 font-semibold">{stats.storageUsed}</span>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {folders.map((folder) => {
              const totalSize = folder.files.reduce((acc, f) => {
                const num = parseFloat(f.size);
                return isNaN(num) ? acc : acc + num;
              }, 0);
              return (
                <motion.div
                  key={folder.id}
                  variants={itemVariants}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className="group glass-panel rounded-2xl p-5 border border-gray-900 cursor-pointer flex flex-col justify-between h-[170px] hover:border-indigo-500/20 transition duration-300"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-indigo-950/40 border border-indigo-500/15 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                        <Folder className="w-5 h-5 fill-current opacity-80" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToRename(folder);
                            setRenameFolderName(folder.name);
                            setIsRenameFolderOpen(true);
                          }}
                          className="p-1 rounded text-gray-500 hover:text-indigo-400 hover:bg-gray-900 transition cursor-pointer"
                          title="Renomear Pasta"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folder);
                            setIsDeleteFolderOpen(true);
                          }}
                          className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-900 transition cursor-pointer"
                          title="Excluir Pasta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-[9px] font-mono text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-900">
                          {folder.path}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-200 mt-2 group-hover:text-indigo-400 transition-colors">{folder.name}</h3>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {folder.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-900/40 flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>{folder.files.length} arquivos</span>
                    <span className="text-gray-500">{totalSize > 0 ? `~${totalSize.toFixed(1)} MB` : 'Vazio'}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      ) : (
        /* INNER FOLDER FILES EXPLORER SCREEN */
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-gray-900 bg-gray-950/30">
            {/* Left: Back and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => { setSelectedFolderId(null); setSearchQuery(''); }}
                className="px-3 py-2 bg-gray-950 hover:bg-gray-900 text-gray-300 border border-gray-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Pesquisar arquivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Right: Filters, Grid/List toggle, Sorting */}
            <div className="flex flex-wrap items-center gap-3 justify-end">
              
              {/* Type Filter */}
              <div className="flex items-center bg-gray-950 border border-gray-900 rounded-lg p-0.5 text-[10px] font-semibold text-gray-400">
                {['all', 'video', 'audio', 'image'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFileTypeFilter(t as any)}
                    className={`px-2.5 py-1 rounded capitalize transition ${
                      fileTypeFilter === t ? 'bg-indigo-600 text-white shadow' : 'hover:text-gray-200'
                    }`}
                  >
                    {t === 'all' ? 'Tudo' : t}
                  </button>
                ))}
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-1.5 bg-gray-950 border border-gray-900 rounded-lg py-1 px-2 text-xs text-gray-400 font-mono">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent border-0 outline-none text-[11px] text-gray-300 font-mono"
                >
                  <option value="name">Nome (A-Z)</option>
                  <option value="date">Data (Recente)</option>
                  <option value="size">Tamanho (Maior)</option>
                </select>
              </div>

              {/* Grid vs List toggle */}
              <div className="flex items-center bg-gray-950 border border-gray-900 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded transition ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded transition ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-2 ${
              isDraggingOver 
                ? 'border-indigo-500 bg-indigo-950/15 text-indigo-400' 
                : 'border-gray-900 hover:border-gray-800 bg-gray-950/20 text-gray-500'
            }`}
          >
            <Upload className={`w-7 h-7 ${isDraggingOver ? 'animate-bounce text-indigo-400' : 'text-gray-600'}`} />
            <span className="text-xs font-bold text-gray-300">Arraste e solte arquivos aqui para fazer upload instantâneo para esta pasta</span>
            <span className="text-[10px] text-gray-500 font-mono">Suporta seleção múltipla de Vídeos, Áudios, Imagens e Fontes</span>
          </div>

          {/* Files Render Grid/List */}
          <AnimatePresence mode="popLayout">
            {sortedFiles.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <EmptyState
                  icon={Upload}
                  title="Nenhum arquivo nesta pasta"
                  description="Arraste arquivos para a área acima ou clique em Upload para enviá-los."
                  actionLabel="Enviar Arquivos"
                  onAction={() => setIsUploadOpen(true)}
                />
              </motion.div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW MODE */
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {sortedFiles.map(file => (
                  <motion.div
                    key={file.id}
                    variants={itemVariants}
                    layoutId={file.id}
                    className="group relative bg-gray-950 border border-gray-900/60 rounded-xl overflow-hidden h-36 flex flex-col justify-between transition-all duration-300 hover:border-indigo-500/20"
                  >
                    {/* Size and Type badging */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="text-[8px] font-mono bg-gray-950/90 text-gray-400 px-1.5 py-0.5 rounded border border-gray-900">
                        {file.size}
                      </span>
                    </div>

                    {/* Styled Thumbnail Preview */}
                    <div className="h-24 relative overflow-hidden bg-gray-900">
                      {getFileThumbnail(file)}

                      {/* Hover action overlay */}
                      <div className="absolute inset-0 bg-gray-950/85 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-300">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md cursor-pointer"
                          title="Visualizar Detalhado"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            const otherFolders = folders.filter(f => f.id !== selectedFolderId);
                            if (otherFolders.length === 0) {
                              showToast('Não há outras pastas disponíveis para mover.', 'error');
                              return;
                            }
                            setFileToMove(file);
                            setTargetFolderId(otherFolders[0].id);
                            setIsMoveFileOpen(true);
                          }}
                          className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-850 text-gray-300 rounded-lg transition cursor-pointer"
                          title="Mover de Pasta"
                        >
                          <Folder className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setFileToDelete(file);
                            setIsConfirmOpen(true);
                          }}
                          className="p-1.5 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/20 rounded-lg transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Header */}
                    <div className="p-3 bg-gray-950 border-t border-gray-900/40 flex items-center gap-2 min-w-0">
                      <div className="shrink-0">{getFileIcon(file.type)}</div>
                      <span className="font-semibold text-gray-200 text-[10px] truncate w-full" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* LIST VIEW MODE */
              <motion.div 
                className="glass-panel rounded-xl border border-gray-900 overflow-hidden"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                <div className="p-3 bg-gray-950/60 border-b border-gray-900 grid grid-cols-12 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                  <span className="col-span-6">Nome do Arquivo</span>
                  <span className="col-span-2 text-right">Tamanho</span>
                  <span className="col-span-2 text-right">Cadastrado em</span>
                  <span className="col-span-2 text-right">Ações</span>
                </div>

                <div className="divide-y divide-gray-900/40">
                  {sortedFiles.map(file => (
                    <motion.div
                      key={file.id}
                      variants={itemVariants}
                      layoutId={file.id}
                      className="p-3.5 grid grid-cols-12 items-center text-xs hover:bg-gray-900/10 transition group"
                    >
                      <div className="col-span-6 flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded bg-gray-950 border border-gray-900 shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <span className="font-semibold text-gray-200 truncate pr-4">{file.name}</span>
                      </div>

                      <span className="col-span-2 text-right text-gray-400 font-mono text-[11px]">{file.size}</span>

                      <span className="col-span-2 text-right text-gray-500 font-mono text-[11px]">
                        {new Date(file.createdAt).toLocaleDateString('pt-BR')}
                      </span>

                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1 rounded text-gray-400 hover:text-white transition md:opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            const otherFolders = folders.filter(f => f.id !== selectedFolderId);
                            if (otherFolders.length === 0) {
                              showToast('Não há outras pastas disponíveis para mover.', 'error');
                              return;
                            }
                            setFileToMove(file);
                            setTargetFolderId(otherFolders[0].id);
                            setIsMoveFileOpen(true);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-indigo-400 hover:bg-gray-900 transition md:opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Mover de Pasta"
                        >
                          <Folder className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setFileToDelete(file);
                            setIsConfirmOpen(true);
                          }}
                          className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/20 transition md:opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Modal: Interactive Media File Preview Overlay */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gray-950 border border-gray-850 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFileIcon(previewFile.type)}
                <h3 className="text-xs font-bold text-gray-100 truncate max-w-64">{previewFile.name}</h3>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Real media playback */}
            <div className="bg-black flex items-center justify-center relative min-h-[220px] max-h-[60vh] overflow-hidden">
              {previewFile.type === 'video' || previewFile.type === 'render' ? (
                <video src={previewFile.url} controls autoPlay className="max-h-[60vh] w-full" />
              ) : previewFile.type === 'audio' ? (
                <div className="w-full flex flex-col items-center gap-4 p-8">
                  <FileAudio className="w-10 h-10 text-blue-400" />
                  <audio src={previewFile.url} controls className="w-full" />
                </div>
              ) : previewFile.type === 'image' ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-h-[60vh] w-full object-contain" />
              ) : (
                <div className="w-full flex flex-col items-center gap-2 p-8">
                  <FileCode className="w-12 h-12 text-indigo-500" />
                  <span className="text-[11px] text-gray-400 font-mono">Pré-visualização não disponível para este tipo de arquivo.</span>
                </div>
              )}
            </div>

            {/* File Info Specs Metadata panel */}
            <div className="p-5 border-t border-gray-900 bg-gray-950 space-y-3 font-mono text-[10px] text-gray-500">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-900">
                <span>Tamanho: <strong className="text-gray-300">{previewFile.size}</strong></span>
                <span>Tipo: <strong className="text-gray-300">{previewFile.type.toUpperCase()}</strong></span>
                <span>Registrado em: <strong className="text-gray-300">{new Date(previewFile.createdAt).toLocaleDateString('pt-BR')}</strong></span>
                <span>Formato: <strong className="text-gray-300">{previewFile.name.split('.').pop()?.toUpperCase() || '—'}</strong></span>
              </div>

              {/* Actions footer */}
              <div className="pt-2 flex justify-end items-center">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Fazer Download</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Upload Files */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-100">Enviar Arquivos</h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => uploadInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  isDraggingOver
                    ? 'border-indigo-500 bg-indigo-950/15 text-indigo-400'
                    : 'border-gray-900 hover:border-gray-800 bg-gray-950/20 text-gray-500'
                }`}
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUploadInputChange}
                />
                <Upload className={`w-7 h-7 ${isDraggingOver ? 'animate-bounce text-indigo-400' : 'text-gray-600'}`} />
                <span className="text-xs font-bold text-gray-300">Arraste arquivos aqui ou clique para selecionar</span>
                <span className="text-[10px] text-gray-500 font-mono">Vídeos, áudios, imagens e fontes</span>
              </div>

              {uploadQueue.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {uploadQueue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-900 text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[220px]">
                        {getFileIcon(item.type)}
                        <div className="truncate">
                          <p className="font-semibold text-gray-200 truncate">{item.name}</p>
                          <p className="text-[9px] text-gray-500 font-mono">{item.sizeLabel}</p>
                        </div>
                      </div>
                      {item.status === 'uploading' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-indigo-400 font-bold">{item.progress}%</span>
                          <div className="w-12 bg-gray-900 h-1 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full" style={{ width: `${item.progress}%` }} />
                          </div>
                        </div>
                      ) : item.status === 'error' ? (
                        <span className="text-[9px] font-mono bg-red-950/30 text-red-400 px-1.5 py-0.5 border border-red-500/10 rounded font-bold">FALHOU</span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-gray-900 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadQueue([]);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/10 transition cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
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

      {/* Non-blocking: Create Folder Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-100">Criar Nova Pasta</h3>
              </div>
              <button
                onClick={() => setIsCreateFolderOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nome da Pasta</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex: Recursos de Campanha"
                  className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3.5 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Descrição (Opcional)</label>
                <textarea
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Descreva o propósito desta pasta..."
                  className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3.5 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-medium h-20 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      createFolder(newFolderName.trim(), newFolderDesc.trim() || undefined);
                      setIsCreateFolderOpen(false);
                    } else {
                      showToast('O nome da pasta é obrigatório.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Criar Pasta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking: Rename Folder Modal */}
      {isRenameFolderOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-100">Renomear Pasta</h3>
              </div>
              <button
                onClick={() => {
                  setIsRenameFolderOpen(false);
                  setFolderToRename(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Novo Nome da Pasta</label>
                <input
                  type="text"
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  placeholder="Ex: Novo Nome da Pasta"
                  className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3.5 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsRenameFolderOpen(false);
                    setFolderToRename(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (folderToRename && renameFolderName.trim()) {
                      renameFolder(folderToRename.id, renameFolderName.trim());
                      setIsRenameFolderOpen(false);
                      setFolderToRename(null);
                    } else {
                      showToast('O nome da pasta não pode ser vazio.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking: Delete Folder Confirmation */}
      <ConfirmModal
        isOpen={isDeleteFolderOpen}
        onClose={() => {
          setIsDeleteFolderOpen(false);
          setFolderToDelete(null);
        }}
        onConfirm={() => {
          if (folderToDelete) {
            deleteFolder(folderToDelete.id);
          }
          setIsDeleteFolderOpen(false);
          setFolderToDelete(null);
        }}
        title="Excluir Pasta"
        message={`Deseja realmente excluir a pasta "${folderToDelete?.name}" e todos os seus arquivos? Esta ação é irreversível.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Non-blocking: Move File Modal */}
      {isMoveFileOpen && fileToMove && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-100">Mover de Pasta</h3>
              </div>
              <button
                onClick={() => {
                  setIsMoveFileOpen(false);
                  setFileToMove(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-400">
                Escolha a pasta de destino para o arquivo <strong className="text-gray-200">{fileToMove.name}</strong>:
              </p>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Pasta de Destino</label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  {folders
                    .filter(f => f.id !== selectedFolderId)
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsMoveFileOpen(false);
                    setFileToMove(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (fileToMove && targetFolderId) {
                      moveFile(selectedFolderId!, targetFolderId, fileToMove.id);
                      showToast(`Arquivo "${fileToMove.name}" movido com sucesso.`, 'success');
                      setIsMoveFileOpen(false);
                      setFileToMove(null);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Mover Arquivo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
