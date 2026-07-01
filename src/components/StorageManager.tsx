/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { StorageFile, StorageFolder } from '../types';
import { ConfirmModal } from './ConfirmModal';
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
  Plus,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
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
  RefreshCw,
  Edit3
} from 'lucide-react';

export const StorageManager: React.FC = () => {
  const { 
    folders, 
    uploadFileToFolder, 
    deleteFileFromFolder, 
    stats,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFile
  } = useApp();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Controls
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'video' | 'audio' | 'image' | 'font'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');

  // Drag and Drop support
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
    if (files.length > 0) {
      files.forEach(f => {
        const sizeMB = (f.size / (1024 * 1024)).toFixed(1) + ' MB';
        let type: StorageFile['type'] = 'video';
        if (f.type.startsWith('image/')) type = 'image';
        else if (f.type.startsWith('audio/')) type = 'audio';
        else if (f.name.endsWith('.json')) type = 'font';
        
        uploadFileToFolder(selectedFolderId, f.name, sizeMB, type);
      });
    }
  };

  // File Preview Modal Overlay
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);

  // Custom Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<StorageFile | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadList, setUploadList] = useState<{ name: string; type: StorageFile['type']; size: string }[]>([
    { name: '', type: 'video', size: '12.4 MB' }
  ]);
  const [isSimulatingUploadBatch, setIsSimulatingUploadBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<number | null>(null);

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

  const getFileThumbnail = (file: StorageFile) => {
    switch (file.type) {
      case 'video':
      case 'render':
        return (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-purple-950/20 to-slate-900 rounded border border-purple-500/10 flex flex-col items-center justify-center gap-1">
              <FileVideo className="w-6 h-6 text-purple-500" />
              <span className="text-[8px] font-mono text-gray-500 truncate w-[90%]">{file.name}</span>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-emerald-950/20 to-slate-900 rounded border border-emerald-500/10 flex flex-col items-center justify-center gap-1">
              <FileImage className="w-6 h-6 text-emerald-500" />
              <span className="text-[8px] font-mono text-gray-500 truncate w-[90%]">{file.name}</span>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-blue-950/20 to-slate-900 rounded border border-blue-500/10 flex flex-col items-center justify-center gap-1">
              <div className="flex gap-0.5 items-end h-5">
                <span className="w-1 bg-blue-500 h-2 animate-pulse"></span>
                <span className="w-1 bg-blue-400 h-4 animate-pulse"></span>
                <span className="w-1 bg-blue-500 h-3 animate-pulse"></span>
                <span className="w-1 bg-blue-300 h-1 animate-pulse"></span>
              </div>
              <span className="text-[8px] font-mono text-gray-500 truncate w-[90%]">{file.name}</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
            <File className="w-8 h-8 text-gray-700" />
          </div>
        );
    }
  };

  const addUploadRow = () => {
    setUploadList([...uploadList, { name: '', type: 'video', size: '5.5 MB' }]);
  };

  const removeUploadRow = (index: number) => {
    if (uploadList.length === 1) return;
    setUploadList(uploadList.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    setUploadList(uploadList.map((item, idx) => {
      if (idx === index) {
        let size = item.size;
        if (field === 'type') {
          if (value === 'video') size = '15.2 MB';
          else if (value === 'audio') size = '3.5 MB';
          else if (value === 'image') size = '420 KB';
          else size = '50 KB';
        }
        return { ...item, [field]: value, size };
      }
      return item;
    }));
  };

  const handleBatchUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) return;

    setIsSimulatingUploadBatch(true);
    setBatchProgress(5);

    const interval = setInterval(() => {
      setBatchProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Commit all items in bulk
            uploadList.forEach(item => {
              if (!item.name) return;
              let finalName = item.name;
              const extensions: Record<string, string> = {
                image: '.png',
                video: '.mp4',
                audio: '.mp3',
                font: '.json'
              };
              if (!finalName.includes('.')) {
                finalName += extensions[item.type] || '.bin';
              }
              uploadFileToFolder(selectedFolderId, finalName, item.size, item.type);
            });

            setUploadList([{ name: '', type: 'video', size: '12.4 MB' }]);
            setIsSimulatingUploadBatch(false);
            setBatchProgress(null);
            setIsUploadOpen(false);
          }, 800);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
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
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header section with active action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <span>Mídias & Diretórios Cloud</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Armazenamento de ativos inspirado em Dropbox/Google Drive. Carregue logos, fontes e gameplays de fundo em lote.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!selectedFolderId && (
            <button
              onClick={() => {
                const name = prompt('Nome da nova pasta:');
                if (name) {
                  const desc = prompt('Descrição da pasta (opcional):');
                  createFolder(name, desc || undefined);
                }
              }}
              className="py-2.5 px-4 bg-gray-900 hover:bg-gray-800 border border-gray-850 text-gray-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto animate-in fade-in"
            >
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              <span>Nova Pasta</span>
            </button>
          )}

          {selectedFolderId && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Upload className="w-4 h-4" />
              <span>Upload em Lote</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Path Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-mono py-2 px-3.5 bg-gray-950 border border-gray-900 rounded-xl max-w-max text-gray-400">
        <button
          onClick={() => setSelectedFolderId(null)}
          className="hover:text-white font-bold transition flex items-center gap-1"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>SaaS Drive</span>
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
                            const newName = prompt('Renomear pasta para:', folder.name);
                            if (newName) {
                              renameFolder(folder.id, newName);
                            }
                          }}
                          className="p-1 rounded text-gray-500 hover:text-indigo-400 hover:bg-gray-900 transition cursor-pointer"
                          title="Renomear Pasta"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja realmente excluir a pasta "${folder.name}" e todos os seus arquivos?`)) {
                              deleteFolder(folder.id);
                            }
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
                className="glass-panel rounded-2xl p-16 text-center border border-gray-900"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <CheckCircle2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-xs text-gray-400 font-semibold">Nenhum arquivo encontrado</p>
                <p className="text-[10px] text-gray-500 mt-1">Faça um upload em lote para injetar mídias simuladas.</p>
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
                              alert('Não há outras pastas disponíveis para mover.');
                              return;
                            }
                            const folderListStr = otherFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
                            const choice = prompt(`Mover "${file.name}" para qual pasta?\nDigite o número correspondente:\n${folderListStr}`);
                            if (choice) {
                              const idx = parseInt(choice) - 1;
                              if (idx >= 0 && idx < otherFolders.length) {
                                moveFile(selectedFolderId!, otherFolders[idx].id, file.id);
                              } else {
                                alert('Escolha inválida.');
                              }
                            }
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
                              alert('Não há outras pastas disponíveis para mover.');
                              return;
                            }
                            const folderListStr = otherFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
                            const choice = prompt(`Mover "${file.name}" para qual pasta?\nDigite o número correspondente:\n${folderListStr}`);
                            if (choice) {
                              const idx = parseInt(choice) - 1;
                              if (idx >= 0 && idx < otherFolders.length) {
                                moveFile(selectedFolderId!, otherFolders[idx].id, file.id);
                              } else {
                                alert('Escolha inválida.');
                              }
                            }
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

            {/* Media Body visual representation */}
            <div className="p-6 bg-black flex items-center justify-center relative min-h-[220px]">
              {previewFile.type === 'video' || previewFile.type === 'render' ? (
                <div className="w-full flex flex-col items-center gap-2 p-4 text-center">
                  <FileVideo className="w-12 h-12 text-purple-500 animate-pulse" />
                  <span className="text-[11px] text-gray-400 font-mono">[Reprodução de Vídeo .mp4]</span>
                  <div className="flex gap-2 text-[10px] text-gray-600 mt-2 font-mono">
                    <span>FPS: 24</span>
                    <span>•</span>
                    <span>1080x1920 (Vertical)</span>
                  </div>
                </div>
              ) : previewFile.type === 'audio' ? (
                <div className="w-full flex flex-col items-center gap-3 p-4">
                  <div className="flex gap-1 items-end h-10">
                    {[2, 4, 6, 8, 5, 3, 1, 4, 7, 8, 3, 5].map((h, i) => (
                      <span 
                        key={i} 
                        className="w-1.5 bg-blue-500 rounded-full animate-pulse" 
                        style={{ height: `${h * 4}px`, animationDelay: `${i * 0.08}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">[Sinal de Áudio .wav]</span>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-2 p-4">
                  <FileImage className="w-12 h-12 text-emerald-500" />
                  <span className="text-[11px] text-gray-400 font-mono">[Visualização de Imagem]</span>
                </div>
              )}
            </div>

            {/* File Info Specs Metadata panel */}
            <div className="p-5 border-t border-gray-900 bg-gray-950 space-y-3 font-mono text-[10px] text-gray-500">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-900">
                <span>Tamanho: <strong className="text-gray-300">{previewFile.size}</strong></span>
                <span>Tipo: <strong className="text-gray-300">{previewFile.type.toUpperCase()}</strong></span>
                <span>Registrado em: <strong className="text-gray-300">{new Date(previewFile.createdAt).toLocaleDateString('pt-BR')}</strong></span>
                <span>Formato: <strong className="text-gray-300">{previewFile.name.split('.').pop()?.toUpperCase() || 'MOCK'}</strong></span>
              </div>

              {/* Actions footer */}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-[9px] text-indigo-400 uppercase font-bold tracking-wider">Cloud Storage OK</span>
                <button
                  onClick={() => {
                    alert('Download simulado concluído!');
                    setPreviewFile(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Fazer Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Simulate Bulk File Upload */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-100">Upload em Lote de Mídias (Dropbox SaaS)</h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleBatchUploadSubmit} className="p-5 space-y-4">
              
              {isSimulatingUploadBatch ? (
                <div className="py-12 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-spin mx-auto mb-3">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-200">Sincronizando fatias em paralelo</h4>
                  <div className="w-full max-w-xs bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-850 mx-auto">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-150"
                      style={{ width: `${batchProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">Processando {uploadList.length} arquivos simultâneos...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {uploadList.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-gray-900/30 p-2.5 border border-gray-900 rounded-xl relative group">
                        {/* Filename Input */}
                        <div className="col-span-6">
                          <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-1">Nome do Arquivo {idx + 1}</label>
                          <input
                            type="text"
                            required
                            value={row.name}
                            onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                            placeholder="Ex: gameplay_subway"
                            className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none"
                          />
                        </div>

                        {/* File Type */}
                        <div className="col-span-4">
                          <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
                          <select
                            value={row.type}
                            onChange={(e) => handleRowChange(idx, 'type', e.target.value)}
                            className="w-full px-2 py-1.5 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none"
                          >
                            <option value="video">Vídeo (.mp4)</option>
                            <option value="audio">Áudio (.mp3 / .wav)</option>
                            <option value="image">Imagem (.png / .jpg)</option>
                            <option value="font">Fonte / Config (.json)</option>
                          </select>
                        </div>

                        {/* Size (Auto filled) */}
                        <div className="col-span-2 flex items-center justify-between pt-4 pl-1">
                          <span className="text-[10px] font-mono text-gray-500">{row.size}</span>
                          <button
                            type="button"
                            onClick={() => removeUploadRow(idx)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded-md transition"
                            title="Remover linha"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add more files row button */}
                  <button
                    type="button"
                    onClick={addUploadRow}
                    className="py-1.5 px-3 bg-gray-900/60 hover:bg-gray-900 border border-gray-850 rounded-lg text-[10px] font-mono text-gray-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Arquivo à Fila</span>
                  </button>

                  {/* Terms text */}
                  <p className="text-[10px] text-gray-500 leading-relaxed bg-indigo-950/15 border border-indigo-950/30 p-3 rounded-lg flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      Os arquivos informados serão integrados imediatamente no seu painel de mídias respeitando o limite de fatias.
                    </span>
                  </p>

                  {/* Actions */}
                  <div className="pt-3 border-t border-gray-900 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(false)}
                      className="px-3 py-1.5 hover:bg-gray-900 text-gray-400 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/10 transition cursor-pointer"
                    >
                      Iniciar Upload do Lote
                    </button>
                  </div>
                </>
              )}
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
