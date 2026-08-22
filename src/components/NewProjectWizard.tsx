/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { VideoAreaEditor, VideoZoneData } from './VideoAreaEditor';
import {
  Layout,
  Check,
  Zap,
  X,
  RefreshCw,
  CheckCircle2,
  UploadCloud,
  FileVideo,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { uploadFileToServer } from '../utils/uploadFile';
import { StorageFilePicker } from './StorageFilePicker';
import { StorageFile } from '../types';

interface NewProjectWizardProps {
  isOpen: boolean;
  flowType: 'project' | 'mass_render';
  onClose: () => void;
}

// The real "template → position → batch of videos → render" pipeline. Extracted out
// of DashboardOverview so both the Dashboard's hero CTAs and the Projetos screen's
// "Novo Projeto" button open the exact same, actually-working flow instead of two
// diverging implementations (one real, one simulated).
export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({ isOpen, flowType, onClose }) => {
  const { triggerRender, createProject, templates, showToast, setActiveTab } = useApp();

  const [flowStep, setFlowStep] = useState(1); // 1: Enviar Template, 2: Posicionar Vídeo, 3: Enviar Vídeos, 4: Revisão, 5: Sucesso

  // Step 1 States
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateFile, setTemplateFile] = useState<{ name: string; size: string; url?: string; uploading?: boolean } | null>(null);
  const [templateUploadProgress, setTemplateUploadProgress] = useState<number | null>(null);
  const [templateDragActive, setTemplateDragActive] = useState(false);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Step 2 States (Custom Figma/Canva Video Area Editor)
  const [templateFileUrl, setTemplateFileUrl] = useState<string | null>(null);
  const [videoZone, setVideoZone] = useState<VideoZoneData>({
    x: 145,
    y: 320,
    width: 760,
    height: 980,
    rotation: 0,
    opacity: 100,
    scaleMode: 'cover',
    borderRadius: 0,
    zIndex: 1
  });
  const [videoPosition, setVideoPosition] = useState<'bottom_half' | 'top_half' | 'full_bg' | 'pip' | 'custom'>('custom');

  // Step 3 States
  const [sourceVideos, setSourceVideos] = useState<Array<{ id: string; name: string; size: string; progress: number; status: 'uploading' | 'completed' | 'error'; url?: string }>>([]);
  const [sourceDragActive, setSourceDragActive] = useState(false);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<{ total: number; successCount: number; blocked: boolean } | null>(null);
  const [showVideoPicker, setShowVideoPicker] = useState(false);

  // Template Drag & Drop Handlers
  const handleTemplateDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setTemplateDragActive(true);
    } else if (e.type === "dragleave") {
      setTemplateDragActive(false);
    }
  };

  const handleTemplateDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTemplateDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadTemplateFile(e.dataTransfer.files[0]);
    }
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadTemplateFile(e.target.files[0]);
    }
  };

  const uploadTemplateFile = async (file: File) => {
    setTemplateFile({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(1) + " MB", uploading: true });
    try {
      setTemplateFileUrl(URL.createObjectURL(file));
    } catch (err) {
      console.error(err);
    }
    setTemplateUploadProgress(1);

    try {
      const assetUrl = await uploadFileToServer(file, (pct) => setTemplateUploadProgress(pct));
      setTemplateFile({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(1) + " MB", url: assetUrl, uploading: false });
      setTemplateUploadProgress(100);
      setTimeout(() => setTemplateUploadProgress(null), 500);
    } catch (err: any) {
      console.error('Template upload failed:', err);
      setTemplateFile(null);
      setTemplateUploadProgress(null);
      showToast(`Falha ao enviar o template: ${err.message || 'erro desconhecido'}`, 'error');
    }
  };

  // Source Videos Drag & Drop Handlers
  const handleSourceDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setSourceDragActive(true);
    } else if (e.type === "dragleave") {
      setSourceDragActive(false);
    }
  };

  const handleSourceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSourceDragActive(false);
    if (e.dataTransfer.files) {
      addSourceFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addSourceFiles(Array.from(e.target.files));
    }
  };

  const addSourceFiles = (files: File[]) => {
    const newFiles = files.map(file => ({
      id: `src-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
      progress: 0,
      status: 'uploading' as const,
      file
    }));

    setSourceVideos(prev => [...prev, ...newFiles.map(({ file, ...rest }) => rest)]);

    newFiles.forEach(async (newFile) => {
      try {
        const assetUrl = await uploadFileToServer(newFile.file, (pct) => {
          setSourceVideos(prev => prev.map(f => f.id === newFile.id ? { ...f, progress: pct } : f));
        });
        setSourceVideos(prev => prev.map(f => f.id === newFile.id ? { ...f, progress: 100, status: 'completed' as const, url: assetUrl } : f));
      } catch (err: any) {
        console.error('Source video upload failed:', err);
        setSourceVideos(prev => prev.map(f => f.id === newFile.id ? { ...f, status: 'error' as const } : f));
        showToast(`Falha ao enviar "${newFile.name}": ${err.message || 'erro desconhecido'}`, 'error');
      }
    });
  };

  const removeSourceVideo = (id: string) => {
    setSourceVideos(prev => prev.filter(v => v.id !== id));
  };

  // A file picked from Arquivos is already uploaded — use its real URL directly,
  // no re-upload needed.
  const handlePickTemplateFile = (files: StorageFile[]) => {
    const file = files[0];
    if (!file) return;
    setSelectedTemplateId('');
    setTemplateFile({ name: file.name, size: file.size, url: file.url });
    setTemplateFileUrl(file.url);
  };

  const handlePickSourceVideos = (files: StorageFile[]) => {
    setSourceVideos(prev => [
      ...prev,
      ...files.map((file) => ({
        id: `saved-${file.id}`,
        name: file.name,
        size: file.size,
        progress: 100,
        status: 'completed' as const,
        url: file.url
      }))
    ]);
  };

  const handleStartBatchProcessing = async () => {
    if (sourceVideos.length === 0) return;
    setIsProcessingBatch(true);

    const defaultTemplate = templates[0] || { id: 'tmp-reels-subtitles', name: 'Legendas Dinâmicas Neon' };
    const templateId = selectedTemplateId || defaultTemplate.id;

    let successCount = 0;
    let blocked = false;

    for (const video of sourceVideos) {
      if (!video.url) {
        blocked = true;
        continue;
      }

      const projectName = `Render [Customizado] - ${video.name.replace(/\.[^/.]+$/, "")}`;
      const description = `Vídeo renderizado via Pipeline Inteligente. Moldura: Customizada (${videoZone.width}x${videoZone.height}).`;

      const createdProject = createProject(
        projectName,
        description,
        templateId,
        '9:16',
        {
          layoutPosition: 'custom',
          videoZone: { ...videoZone },
          backgroundImageUrl: templateFile?.url,
          backgroundVideoUrl: video.url,
          // This wizard only composites template + video — no on-screen text unless the
          // user explicitly adds it later in an editor. Override createProject's defaults
          // (which otherwise burn the project name in as a headline).
          title: undefined,
          subtitles: undefined
        }
      );

      if (createdProject) {
        const renderSuccess = triggerRender(createdProject);
        if (renderSuccess) {
          successCount++;
        } else {
          blocked = true;
        }
      } else {
        blocked = true;
      }
    }

    setBatchResult({
      total: sourceVideos.length,
      successCount,
      blocked
    });

    setIsProcessingBatch(false);
    setFlowStep(5);
  };

  const resetFlow = () => {
    onClose();
    setFlowStep(1);
    setTemplateFile(null);
    setTemplateFileUrl(null);
    setTemplateUploadProgress(null);
    setSelectedTemplateId('');
    setVideoZone({
      x: 145,
      y: 320,
      width: 760,
      height: 980,
      rotation: 0,
      opacity: 100,
      scaleMode: 'cover',
      borderRadius: 0,
      zIndex: 1
    });
    setVideoPosition('custom');
    setSourceVideos([]);
    setIsProcessingBatch(false);
    setBatchResult(null);
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
          onClick={resetFlow}
        >
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-4xl bg-gray-950 border border-gray-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[620px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar do Modal (Status dos passos) */}
            <div className="w-full md:w-64 bg-slate-950 p-6 border-b md:border-b-0 md:border-r border-gray-900 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                    <Layout className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Pipeline Inteligente</h3>
                    <p className="text-[10px] text-gray-500 font-mono">
                      {flowType === 'project' ? 'Criador de Projetos' : 'Fábrica em Massa'}
                    </p>
                  </div>
                </div>

                {/* Passos */}
                <div className="space-y-4 pt-4">
                  {[
                    { step: 1, label: 'Enviar Template' },
                    { step: 2, label: 'Posicionar Vídeo' },
                    { step: 3, label: 'Enviar Vídeos' },
                    { step: 4, label: 'Revisar & Confirmar' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold border transition-all duration-300 ${
                          flowStep === s.step
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                            : flowStep > s.step
                            ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-400'
                            : 'bg-transparent border-gray-800 text-gray-500'
                        }`}
                      >
                        {flowStep > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
                      </div>
                      <span
                        className={`text-xs font-semibold font-sans transition-colors duration-300 ${
                          flowStep === s.step ? 'text-white font-bold' : 'text-gray-500'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Rodapé Sidebar */}
              <div className="hidden md:block pt-4 border-t border-gray-900">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                  <Zap className="w-3.5 h-3.5 text-indigo-400 fill-current animate-pulse" />
                  <span>Estação de Trabalho Ativa</span>
                </div>
              </div>
            </div>

            {/* Conteúdo Principal do Modal */}
            <div className="flex-1 flex flex-col justify-between bg-gray-950 relative h-full">
              {/* Botão de Fechar */}
              <button
                onClick={resetFlow}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-400 hover:text-white transition duration-200 cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Área de conteúdo que muda por passo */}
              <div className="flex-1 p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {flowStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Passo 1 de 4</span>
                        <h2 className="text-xl font-bold text-white tracking-tight mt-1">Carregar o Template/Overlay</h2>
                        <p className="text-xs text-gray-400 mt-1">
                          Envie a moldura visual que servirá de template para seus cortes, ou utilize nossas predefinições integradas.
                        </p>
                      </div>

                      {/* Drag & Drop Area */}
                      <div
                        onDragEnter={handleTemplateDrag}
                        onDragOver={handleTemplateDrag}
                        onDragLeave={handleTemplateDrag}
                        onDrop={handleTemplateDrop}
                        onClick={() => templateFileInputRef.current?.click()}
                        className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 relative ${
                          templateDragActive
                            ? 'border-indigo-500 bg-indigo-950/20'
                            : templateFile
                            ? 'border-emerald-500/40 bg-emerald-950/5'
                            : 'border-gray-850 bg-slate-950/40 hover:border-indigo-500/30'
                        }`}
                      >
                        <input
                          ref={templateFileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleTemplateFileChange}
                          accept="video/*,image/*"
                        />

                        {templateUploadProgress !== null ? (
                          <div className="w-full max-w-xs space-y-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-1" />
                            <div className="flex justify-between text-[11px] font-mono text-gray-400">
                              <span className="truncate max-w-[150px]">{templateFile?.name}</span>
                              <span>{templateUploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full" style={{ width: `${templateUploadProgress}%` }} />
                            </div>
                          </div>
                        ) : templateFile ? (
                          <div className="space-y-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-emerald-300">Template Carregado!</p>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {templateFile.name} ({templateFile.size})
                              </p>
                            </div>
                            <span className="text-[9px] text-indigo-400 font-mono underline block hover:text-indigo-300">Clique para substituir</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-950/40 border border-indigo-500/15 flex items-center justify-center text-indigo-400 mx-auto">
                              <UploadCloud className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-200">Arraste ou clique para enviar o Template</p>
                              <p className="text-[10px] text-gray-500 mt-1">Suporta vídeos (.mp4, .mov) ou overlays transparentes (.png)</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowTemplatePicker(true)}
                        className="w-full py-2 px-3 bg-gray-900/60 hover:bg-gray-900 border border-gray-850 rounded-lg text-[11px] font-mono text-gray-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ou escolha um arquivo salvo em Arquivos</span>
                      </button>

                      {/* Templates Rápidos */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Ou use um template existente</label>
                        <div className="grid grid-cols-2 gap-2">
                          {templates.slice(0, 4).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedTemplateId(t.id);
                                setTemplateFile({ name: `${t.name} (Sistema)`, size: '0.0 MB' });
                                setTemplateFileUrl(t.backgroundImageUrl || null);
                              }}
                              className={`p-3 rounded-lg border text-left transition duration-200 cursor-pointer ${
                                selectedTemplateId === t.id
                                  ? 'bg-indigo-950/30 border-indigo-500 text-white'
                                  : 'bg-slate-950/40 border-gray-900 text-gray-400 hover:border-gray-850 hover:text-gray-300'
                              }`}
                            >
                              <span className="block text-xs font-semibold truncate">{t.name}</span>
                              <span className="text-[9px] font-mono text-gray-500 mt-1 block">Estilo: {t.aspect}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {flowStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Passo 2 de 4</span>
                          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">Editor de Área do Vídeo</h2>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Arraste e redimensione para definir com precisão de pixels onde o vídeo será renderizado sobre o template.
                          </p>
                        </div>

                        {/* Quick presets inside wizard */}
                        <div className="flex flex-wrap gap-1.5 self-start md:self-center">
                          <button
                            onClick={() => setVideoZone({ x: 0, y: 460, width: 1080, height: 1000, rotation: 0, opacity: 100, scaleMode: 'cover', borderRadius: 0, zIndex: 1 })}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-gray-800 text-gray-300 hover:text-white rounded text-[10px] font-mono font-bold transition cursor-pointer"
                          >
                            Dividido (Metade)
                          </button>
                          <button
                            onClick={() => setVideoZone({ x: 0, y: 0, width: 1080, height: 1920, rotation: 0, opacity: 100, scaleMode: 'cover', borderRadius: 0, zIndex: 1 })}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-gray-800 text-gray-300 hover:text-white rounded text-[10px] font-mono font-bold transition cursor-pointer"
                          >
                            Tela Cheia
                          </button>
                          <button
                            onClick={() => setVideoZone({ x: 680, y: 1300, width: 360, height: 500, rotation: 0, opacity: 100, scaleMode: 'cover', borderRadius: 20, zIndex: 2 })}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-gray-800 text-gray-300 hover:text-white rounded text-[10px] font-mono font-bold transition cursor-pointer"
                          >
                            PIP (Canto)
                          </button>
                        </div>
                      </div>

                      <div className="border border-gray-900 rounded-2xl bg-slate-950 p-2 overflow-hidden">
                        <VideoAreaEditor
                          value={videoZone}
                          onChange={setVideoZone}
                          backgroundUrl={templateFileUrl}
                          templateName={templateFile ? templateFile.name : (selectedTemplateId || 'Legenda Padrão')}
                        />
                      </div>
                    </motion.div>
                  )}

                  {flowStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">Passo 3 de 4</span>
                        <h2 className="text-xl font-bold text-white tracking-tight mt-1">Carregar Vídeos de Origem</h2>
                        <p className="text-xs text-gray-400 mt-1">
                          Selecione ou arraste um ou mais vídeos (gameplays, takes brutos) que deseja injetar na moldura configurada.
                        </p>
                      </div>

                      {/* Source Drag & Drop */}
                      <div
                        onDragEnter={handleSourceDrag}
                        onDragOver={handleSourceDrag}
                        onDragLeave={handleSourceDrag}
                        onDrop={handleSourceDrop}
                        onClick={() => sourceFileInputRef.current?.click()}
                        className={`h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-300 relative ${
                          sourceDragActive
                            ? 'border-indigo-500 bg-indigo-950/20'
                            : 'border-gray-850 bg-slate-950/40 hover:border-indigo-500/30'
                        }`}
                      >
                        <input
                          ref={sourceFileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleSourceFileChange}
                          multiple
                          accept="video/*"
                        />
                        <div className="space-y-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-950/40 border border-indigo-500/15 flex items-center justify-center text-indigo-400 mx-auto">
                            <Plus className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-200">Arraste ou clique para adicionar Vídeos de Origem</p>
                            <p className="text-[9px] text-gray-500 mt-0.5">Permite múltiplos arquivos simultâneos em lote (.mp4, .mov)</p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowVideoPicker(true)}
                        className="w-full py-2 px-3 bg-gray-900/60 hover:bg-gray-900 border border-gray-850 rounded-lg text-[11px] font-mono text-gray-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ou escolha vídeos salvos em Arquivos</span>
                      </button>

                      {/* Lista de vídeos de origem carregados */}
                      {sourceVideos.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono flex justify-between">
                            <span>Fila de Mídias de Origem ({sourceVideos.length})</span>
                            <span className="text-indigo-400 font-bold">
                              {sourceVideos.some(v => v.status === 'uploading') ? 'Enviando para a nuvem' : 'Pronto'}
                            </span>
                          </label>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-gray-900 rounded-lg p-2 bg-slate-950/50">
                            {sourceVideos.map((video) => (
                              <div key={video.id} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-gray-900 text-xs">
                                <div className="flex items-center gap-2 truncate max-w-xs">
                                  <FileVideo className="w-4 h-4 text-indigo-400 shrink-0" />
                                  <div className="truncate">
                                    <p className="font-semibold text-gray-200 truncate">{video.name}</p>
                                    <p className="text-[9px] text-gray-500 font-mono mt-0.5">{video.size}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {video.status === 'uploading' ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono text-indigo-400 font-bold">{video.progress}%</span>
                                      <div className="w-12 bg-gray-900 h-1 rounded-full overflow-hidden">
                                        <div className="bg-indigo-500 h-full" style={{ width: `${video.progress}%` }} />
                                      </div>
                                    </div>
                                  ) : video.status === 'error' ? (
                                    <span className="text-[9px] font-mono bg-red-950/30 text-red-400 px-1.5 py-0.5 border border-red-500/10 rounded font-bold">FALHOU</span>
                                  ) : (
                                    <span className="text-[9px] font-mono bg-emerald-950/30 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/10 rounded font-bold">PRONTO</span>
                                  )}

                                  <button
                                    onClick={() => removeSourceVideo(video.id)}
                                    className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-900 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {flowStep === 4 && (
                    <motion.div
                      key="step-4"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4"
                    >
                      <div className="w-14 h-14 rounded-full bg-indigo-950/50 border border-indigo-500/35 flex items-center justify-center text-indigo-400 shadow-2xl shadow-indigo-500/25 animate-bounce">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div className="space-y-2 max-w-md">
                        <h2 className="text-xl font-bold text-white tracking-tight">Fábrica Pronta para Renderizar!</h2>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          O template de layout <strong className="text-indigo-400">"{templateFile?.name || 'Personalizado'}"</strong> foi configurado com sucesso na posição <strong className="text-indigo-400">"{videoPosition.toUpperCase()}"</strong>.
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono">
                          Deseja disparar a renderização em lote para os <strong className="text-white">{sourceVideos.length} vídeos</strong> carregados na fila?
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {flowStep === 5 && (
                    <motion.div
                      key="step-5"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4"
                    >
                      {batchResult?.successCount === 0 ? (
                        <>
                          <div className="w-14 h-14 rounded-full bg-red-950/50 border border-red-500/35 flex items-center justify-center text-red-400 shadow-2xl shadow-red-500/25">
                            <AlertCircle className="w-7 h-7" />
                          </div>
                          <div className="space-y-2 max-w-md">
                            <h2 className="text-xl font-bold text-white tracking-tight">Limite de Projetos Atingido!</h2>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Nenhum dos seus <strong className="text-white">{batchResult.total} vídeos</strong> pôde ser renderizado devido às limitações do plano atual.
                            </p>
                            <div className="p-3 bg-red-950/20 border border-red-500/10 rounded-lg text-[11px] text-red-400 text-left space-y-1 mt-2">
                              <p className="font-semibold">O que aconteceu?</p>
                              <p className="text-gray-400 leading-relaxed">
                                No <strong>Plano Gratuito (Free)</strong>, você tem um limite de <strong>1 projeto ativo simultâneo</strong>. Para renderizar novos vídeos em lote ou liberar mais slots, você precisa limpar projetos antigos ou realizar o upgrade da sua assinatura.
                              </p>
                            </div>
                          </div>
                        </>
                      ) : batchResult && batchResult.successCount < batchResult.total ? (
                        <>
                          <div className="w-14 h-14 rounded-full bg-amber-950/50 border border-amber-500/35 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/25">
                            <AlertCircle className="w-7 h-7" />
                          </div>
                          <div className="space-y-2 max-w-md">
                            <h2 className="text-xl font-bold text-white tracking-tight">Fila Ativada Parcialmente!</h2>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Apenas <strong className="text-white">{batchResult.successCount} de {batchResult.total} vídeos</strong> foram injetados na fazenda de renderização.
                            </p>
                            <div className="p-3 bg-amber-950/20 border border-amber-500/10 rounded-lg text-[11px] text-amber-400 text-left space-y-1 mt-2">
                              <p className="font-semibold">Limitação de Assinatura Detectada:</p>
                              <p className="text-gray-400 leading-relaxed">
                                Alguns vídeos foram ignorados para evitar ultrapassar o limite de projetos ativos permitidos pelo seu plano atual (Free: 1 projeto ativo, Starter: 3 projetos).
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-full bg-emerald-950/50 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/25 animate-pulse">
                            <CheckCircle2 className="w-7 h-7" />
                          </div>
                          <div className="space-y-2 max-w-md">
                            <h2 className="text-xl font-bold text-white tracking-tight">Fila de Geração Ativada!</h2>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Os <strong className="text-white">{sourceVideos.length} vídeos</strong> foram injetados com sucesso na fazenda de renderização com a posição de layout <strong className="text-indigo-400">"{videoPosition.toUpperCase()}"</strong>!
                            </p>
                          </div>
                        </>
                      )}

                      <div className="flex gap-2.5 pt-4">
                        {batchResult && batchResult.successCount > 0 && (
                          <button
                            onClick={() => {
                              resetFlow();
                              setActiveTab('renderings');
                            }}
                            className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg"
                          >
                            Ir para Gerenciador de Renderização
                          </button>
                        )}
                        <button
                          onClick={() => {
                            resetFlow();
                            if (batchResult && batchResult.successCount === 0) {
                              setActiveTab('subscription');
                            }
                          }}
                          className={`py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            batchResult && batchResult.successCount === 0
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                              : 'bg-gray-900 hover:bg-gray-850 text-gray-300 border border-gray-800'
                          }`}
                        >
                          {batchResult && batchResult.successCount === 0 ? 'Ver Planos & Upgrade' : 'Voltar para o Início'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Barra de Navegação de Rodapé */}
              <div className="p-6 border-t border-gray-900 bg-slate-950/50 flex items-center justify-between">
                {flowStep > 1 && flowStep < 4 ? (
                  <button
                    onClick={() => setFlowStep((prev) => prev - 1)}
                    className="py-2 px-4 bg-gray-950 hover:bg-gray-900 text-gray-400 hover:text-white border border-gray-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                ) : (
                  <div />
                )}

                {flowStep < 3 ? (
                  <button
                    onClick={() => setFlowStep((prev) => prev + 1)}
                    disabled={flowStep === 1 && !templateFile}
                    className={`py-2 px-5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      flowStep === 1 && !templateFile
                        ? 'bg-gray-900 text-gray-600 border border-gray-950 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    }`}
                  >
                    <span>Avançar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : flowStep === 3 ? (
                  <button
                    onClick={() => setFlowStep(4)}
                    disabled={sourceVideos.length === 0 || sourceVideos.some((v) => v.status === 'uploading' || v.status === 'error')}
                    className={`py-2 px-5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      sourceVideos.length === 0 || sourceVideos.some((v) => v.status === 'uploading' || v.status === 'error')
                        ? 'bg-gray-900 text-gray-600 border border-gray-950 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    }`}
                  >
                    <span>Revisar Renderização</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : flowStep === 4 ? (
                  <div className="flex gap-2 w-full justify-end">
                    <button
                      onClick={resetFlow}
                      className="py-2 px-4 bg-gray-950 hover:bg-gray-900 text-gray-400 hover:text-white border border-gray-900 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleStartBatchProcessing}
                      disabled={isProcessingBatch}
                      className="py-2 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
                    >
                      {isProcessingBatch ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Iniciando Fábrica...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Iniciar Fábrica Viral agora!</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <StorageFilePicker
      isOpen={showTemplatePicker}
      onClose={() => setShowTemplatePicker(false)}
      fileTypes={['image', 'video']}
      title="Escolher template salvo"
      onSelect={handlePickTemplateFile}
    />

    <StorageFilePicker
      isOpen={showVideoPicker}
      onClose={() => setShowVideoPicker(false)}
      fileTypes={['video']}
      multiple
      title="Escolher vídeos salvos"
      onSelect={handlePickSourceVideos}
    />
    </>
  );
};
