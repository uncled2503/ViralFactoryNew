/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { motion, AnimatePresence } from 'motion/react';
import { VideoAreaEditor, VideoZoneData } from './VideoAreaEditor';
import {
  Video,
  Layers,
  Film,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  HardDrive,
  Play,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  Zap,
  Sparkles,
  MousePointerClick,
  Copy,
  Edit3,
  ExternalLink,
  RefreshCw,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Layout,
  Check
} from 'lucide-react';
import { AspectRatio, Project } from '../types';

export const DashboardOverview: React.FC = () => {
  const { navigate } = useRouter();
  const { 
    stats, 
    projects, 
    renderingTasks, 
    setActiveTab, 
    triggerRender, 
    user, 
    folders, 
    uploadFileToFolder,
    createProject,
    templates
  } = useApp();

  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: Wizard Flow for Template & Mass Rendering
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [flowType, setFlowType] = useState<'project' | 'mass_render'>('project');
  const [flowStep, setFlowStep] = useState(1); // 1: Enviar Template, 2: Posicionar Vídeo, 3: Enviar Vídeos, 4: Revisão, 5: Sucesso

  // Step 1 States
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateFile, setTemplateFile] = useState<{ name: string; size: string } | null>(null);
  const [templateUploadProgress, setTemplateUploadProgress] = useState<number | null>(null);
  const [templateDragActive, setTemplateDragActive] = useState(false);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

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
  const [sourceVideos, setSourceVideos] = useState<Array<{ id: string; name: string; size: string; progress: number; status: 'uploading' | 'completed' }>>([]);
  const [sourceDragActive, setSourceDragActive] = useState(false);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<{ total: number; successCount: number; blocked: boolean } | null>(null);

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

  const uploadTemplateFile = (file: File) => {
    setTemplateFile({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(1) + " MB" });
    try {
      setTemplateFileUrl(URL.createObjectURL(file));
    } catch (err) {
      console.error(err);
    }
    setTemplateUploadProgress(1);
    
    let progress = 1;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 10;
      if (progress >= 100) {
        clearInterval(interval);
        setTemplateUploadProgress(100);
        setTimeout(() => setTemplateUploadProgress(null), 500);
      } else {
        setTemplateUploadProgress(progress);
      }
    }, 100);
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
      status: 'uploading' as const
    }));

    setSourceVideos(prev => [...prev, ...newFiles]);

    newFiles.forEach(newFile => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 25) + 15;
        if (progress >= 100) {
          clearInterval(interval);
          setSourceVideos(prev => prev.map(f => f.id === newFile.id ? { ...f, progress: 100, status: 'completed' as const } : f));
        } else {
          setSourceVideos(prev => prev.map(f => f.id === newFile.id ? { ...f, progress } : f));
        }
      }, 150);
    });
  };

  const removeSourceVideo = (id: string) => {
    setSourceVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleStartBatchProcessing = async () => {
    if (sourceVideos.length === 0) return;
    setIsProcessingBatch(true);

    const defaultTemplate = templates[0] || { id: 'tmp-reels-subtitles', name: 'Legendas Dinâmicas Neon' };
    const templateId = selectedTemplateId || defaultTemplate.id;

    let successCount = 0;
    let blocked = false;

    for (const video of sourceVideos) {
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
          backgroundVideo: templateFile ? templateFile.name : undefined,
          mainVideo: video.name
        }
      );

      if (createdProject) {
        const renderSuccess = triggerRender(createdProject.id);
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
    setIsFlowOpen(false);
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

  const activeRenders = renderingTasks.filter(t => t.status === 'queued' || t.status === 'processing');
  const recentProjects = projects.slice(0, 3);

  // Drag & Drop simulation
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateUpload(e.dataTransfer.files[0].name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateUpload(e.target.files[0].name);
    }
  };

  const simulateUpload = (fileName: string) => {
    setUploadedFileName(fileName);
    setUploadProgress(1);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Upload to videos or uploads folder
            const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi');
            const folderId = isVideo ? 'fld-videos' : 'fld-uploads';
            const size = (Math.random() * 20 + 2).toFixed(1) + " MB";
            const type = isVideo ? 'video' : 'audio';
            
            uploadFileToFolder(folderId, fileName, size, type);
            setUploadProgress(null);
          }, 800);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 10;
      });
    }, 150);
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleDuplicateProject = (project: Project) => {
    const duplicatedName = `${project.name} (Cópia)`;
    createProject(
      duplicatedName, 
      project.description, 
      project.templateId, 
      project.aspect,
      { ...project.variables }
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  const hoursSaved = (stats.totalVideosRendered * 2) / 60;
  const hoursSavedStr = hoursSaved === 0 ? '0h' : `${hoursSaved.toFixed(1)}h`;

  return (
    <motion.div 
      className="space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* 1. HERO SECTION ORIENTED FOR ACTION */}
      <motion.div 
        variants={itemVariants}
        className="relative rounded-2xl p-8 border border-indigo-950/40 bg-gradient-to-br from-gray-950 via-indigo-950/15 to-gray-950 overflow-hidden shadow-2xl shadow-indigo-500/5"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-10 left-10 w-64 h-64 rounded-full bg-purple-500/5 blur-[100px] pointer-events-none"></div>
        
        {/* Decorative Grid Line */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main message */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/40 border border-indigo-500/20 rounded-full">
              <Zap className="w-3.5 h-3.5 text-indigo-400 fill-current" />
              <span className="text-[10px] font-mono text-indigo-200 uppercase tracking-widest font-bold">Viral Factory Engine v3.2™</span>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-none">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">{user?.name || 'Gabriel Moura'}</span>!
            </h1>
            
            <p className="text-sm text-gray-400 max-w-lg leading-relaxed">
              Pronto para dominar as redes sociais? Produza centenas de vídeos curtos magnéticos de alta conversão para TikTok, Reels e Shorts em lote com o nosso <strong>Smart Pipeline™</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => {
                  setFlowType('project');
                  setIsFlowOpen(true);
                }}
                className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-2 cursor-pointer duration-300 hover:scale-[1.02]"
              >
                <Video className="w-4 h-4" />
                <span>Novo Projeto</span>
              </button>
              
              <button
                onClick={() => {
                  setFlowType('mass_render');
                  setIsFlowOpen(true);
                }}
                className="py-2.5 px-5 bg-gray-900 hover:bg-gray-850 text-gray-200 border border-gray-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer duration-300 hover:border-gray-700 hover:text-white"
              >
                <Film className="w-4 h-4 text-purple-400" />
                <span>Renderização em Massa</span>
              </button>
            </div>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div className="lg:col-span-5">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerSelectFile}
              className={`relative h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-300 ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10 scale-[1.02]' 
                  : 'border-gray-800 bg-gray-950/40 hover:border-indigo-500/40 hover:bg-indigo-950/5'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="video/*,audio/*"
              />

              <AnimatePresence mode="wait">
                {uploadProgress !== null ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full px-4 space-y-3"
                    onClick={(e) => e.stopPropagation()} // stop trigger click
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gray-400 truncate max-w-[180px]">{uploadedFileName}</span>
                      <span className="font-mono text-indigo-400 font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 animate-pulse font-mono flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                      Injetando mídias no smart pipeline...
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2 flex flex-col items-center"
                  >
                    <div className="h-10 w-10 rounded-full bg-indigo-950/40 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shadow-md">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-200">Arraste gameplays ou áudios aqui</p>
                      <p className="text-[10px] text-gray-500 mt-1">Suporta arquivos .mp4, .mov, .mp3, .wav</p>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-900/60 border border-gray-800 rounded text-[9px] font-mono text-gray-400 hover:text-indigo-300 transition-colors">
                      <MousePointerClick className="w-3 h-3" />
                      <span>Simular Upload Rápido</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. CORE CTA: "O que o usuário deve fazer agora?" */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-xl border border-gray-900 bg-gray-950/40">
        <div className="col-span-full pb-1 border-b border-gray-900 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-300 tracking-wider font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>O QUE FAZER AGORA? PIPELINE RECOMENDADO</span>
          </h2>
          <span className="text-[10px] font-mono text-gray-500">Fluxo otimizado para escala</span>
        </div>

        <div className="space-y-1.5 p-3 rounded-lg hover:bg-gray-900/30 transition-all border border-transparent hover:border-gray-900">
          <span className="text-[10px] font-mono text-indigo-400 font-bold block">01 / ENVIAR</span>
          <h4 className="text-xs font-bold text-gray-200">Upload dos vídeos</h4>
          <p className="text-[11px] text-gray-500">Envie gameplays ou clipes de fundo na aba Arquivos.</p>
        </div>

        <div className="space-y-1.5 p-3 rounded-lg hover:bg-gray-900/30 transition-all border border-transparent hover:border-gray-900">
          <span className="text-[10px] font-mono text-purple-400 font-bold block">02 / MODELAR</span>
          <h4 className="text-xs font-bold text-gray-200">Escolha o Template</h4>
          <p className="text-[11px] text-gray-500">Defina o layout de legendas e áudio nas predefinições.</p>
        </div>

        <div className="space-y-1.5 p-3 rounded-lg hover:bg-gray-900/30 transition-all border border-transparent hover:border-gray-900">
          <span className="text-[10px] font-mono text-pink-400 font-bold block">03 / PARAMETRIZAR</span>
          <h4 className="text-xs font-bold text-gray-200">Cole as Headlines</h4>
          <p className="text-[11px] text-gray-500">Crie o projeto e cole o roteiro em lote ou use CSV.</p>
        </div>

        <div className="space-y-1.5 p-3 rounded-lg hover:bg-gray-900/30 transition-all border border-transparent hover:border-gray-900">
          <span className="text-[10px] font-mono text-emerald-400 font-bold block">04 / RENDERIZAR</span>
          <h4 className="text-xs font-bold text-gray-200">Gere seus Vídeos</h4>
          <p className="text-[11px] text-gray-500">Inicie a criação em lote e baixe tudo empacotado em ZIP.</p>
        </div>
      </motion.div>

      {/* 3. METRICS CARDS WITH CLEAR HIERARCHY */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        {/* Horas Economizadas */}
        <div className="glass-panel rounded-xl p-4 border border-gray-900 flex flex-col justify-between group hover:border-indigo-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Horas Economizadas</p>
            <span className="p-1.5 rounded-lg bg-indigo-950/30 border border-indigo-500/10 text-indigo-400">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-xl font-bold font-mono text-gray-100 mt-4">{hoursSavedStr}</h3>
        </div>

        {/* Vídeos Gerados */}
        <div className="glass-panel rounded-xl p-4 border border-gray-900 flex flex-col justify-between group hover:border-purple-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Vídeos Gerados</p>
            <span className="p-1.5 rounded-lg bg-purple-950/30 border border-purple-500/10 text-purple-400">
              <Film className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-xl font-bold font-mono text-gray-100 mt-4">{stats.totalVideosRendered}</h3>
        </div>

        {/* Templates */}
        <div className="glass-panel rounded-xl p-4 border border-gray-900 flex flex-col justify-between group hover:border-pink-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Templates</p>
            <span className="p-1.5 rounded-lg bg-pink-950/30 border border-pink-500/10 text-pink-400">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-xl font-bold font-mono text-gray-100 mt-4">{stats.activeTemplates}</h3>
        </div>

        {/* Projetos */}
        <div className="glass-panel rounded-xl p-4 border border-gray-900 flex flex-col justify-between group hover:border-blue-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Projetos</p>
            <span className="p-1.5 rounded-lg bg-blue-950/30 border border-blue-500/10 text-blue-400">
              <Video className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-xl font-bold font-mono text-gray-100 mt-4">{stats.activeProjects}</h3>
        </div>

        {/* Renderizações */}
        <div className="glass-panel rounded-xl p-4 border border-gray-900 flex flex-col justify-between group hover:border-yellow-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Renderizações</p>
            <span className="p-1.5 rounded-lg bg-yellow-950/30 border border-yellow-500/10 text-yellow-400">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-xl font-bold font-mono text-gray-100 mt-4">{renderingTasks.length}</h3>
        </div>

        {/* Armazenamento */}
        <div className="glass-panel rounded-xl p-4 border border-gray-900 flex flex-col justify-between group hover:border-teal-500/20 transition-all duration-300 col-span-1">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Armazenamento</p>
            <span className="p-1.5 rounded-lg bg-teal-950/30 border border-teal-500/10 text-teal-400">
              <HardDrive className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-[11px] font-bold font-mono text-gray-100 mt-4 truncate" title={stats.storageUsed}>
            {stats.storageUsed.split(' / ')[0]} <span className="text-gray-500 text-[9px]">/ {stats.storageUsed.split(' / ')[1]}</span>
          </h3>
        </div>

        {/* Fila */}
        <div className="glass-panel rounded-xl p-4 border border-gray-900 flex flex-col justify-between group hover:border-orange-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Fila</p>
            <span className="p-1.5 rounded-lg bg-orange-950/30 border border-orange-500/10 text-orange-400">
              <Zap className="w-3.5 h-3.5" />
            </span>
          </div>
          <h3 className="text-xl font-bold font-mono text-gray-100 mt-4">{activeRenders.length}</h3>
        </div>
      </motion.div>

      {/* 4. RECENT PROJECTS & LIVE JOBS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Projects list with customized Canva-style card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Projetos de Vídeos Recentes</span>
            </h2>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono transition flex items-center gap-1 cursor-pointer font-semibold"
            >
              <span>Ver todos os projetos</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentProjects.length === 0 ? (
              <div className="col-span-full glass-panel rounded-xl p-8 text-center border border-gray-900">
                <p className="text-xs text-gray-500">Nenhum projeto criado ainda.</p>
              </div>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="group relative bg-gray-950 border border-gray-900/60 rounded-xl overflow-hidden flex flex-col justify-between h-56 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 cursor-pointer"
                >
                  {/* Aspect Ratio Small Badge */}
                  <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1">
                    <span className="text-[9px] font-mono font-bold bg-gray-950/95 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-900/40">
                      {project.aspect}
                    </span>
                    <span className="text-[9px] font-mono bg-gray-950/95 text-gray-400 px-2 py-0.5 rounded-full border border-gray-900">
                      ~30s
                    </span>
                  </div>

                  {/* Rendering Status badge inside header */}
                  <div className="absolute top-3 right-3 z-10">
                    {project.status === 'completed' && (
                      <span className="text-[8px] font-mono font-extrabold bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        PRONTO
                      </span>
                    )}
                    {project.status === 'draft' && (
                      <span className="text-[8px] font-mono font-extrabold bg-gray-900/80 text-gray-400 px-2 py-0.5 rounded-full border border-gray-800">
                        RASCUNHO
                      </span>
                    )}
                    {project.status === 'rendering' && (
                      <span className="text-[8px] font-mono font-extrabold bg-indigo-950/80 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 animate-pulse">
                        PROCESSANDO
                      </span>
                    )}
                  </div>

                  {/* Thumbnail / Creative Layer Preview Container */}
                  <div className="h-28 bg-gray-900/40 border-b border-gray-900/60 relative overflow-hidden flex items-center justify-center">
                    {project.status === 'completed' && project.videoUrl ? (
                      <video
                        src={project.videoUrl}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity"
                        muted
                        playsInline
                        loop
                        onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                        onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-950/30 to-purple-950/10 flex flex-col items-center justify-center gap-1 p-3">
                        <FileVideo className="w-8 h-8 text-gray-700 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-[9px] text-gray-500 font-mono text-center truncate w-full">
                          {project.variables.title}
                        </span>
                      </div>
                    )}

                    {/* Smooth Hover overlay with action buttons */}
                    <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project/${project.id}`);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-600/20"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateProject(project);
                        }}
                        className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Duplicar Projeto"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicar</span>
                      </button>

                      {project.status === 'draft' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerRender(project.id, true);
                              setActiveTab('renderings');
                            }}
                            className="p-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-pink-600/10"
                            title="Renderizar Sandbox de 3 segundos para teste rápido de layout"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Sandbox</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerRender(project.id);
                              setActiveTab('renderings');
                            }}
                            className="p-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-pink-600/20"
                            title="Gerar Vídeo Completo"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Gerar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Metadata Details */}
                  <div className="p-4 space-y-1 bg-gray-950">
                    <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono">
                      <span>TEMPLATE: {project.templateId === 'tpl-reddit-stories' ? 'Reddit Stories' : 'Motivational'}</span>
                      <span>Exports: 12</span>
                    </div>
                    <h3 className="text-xs font-bold text-gray-200 truncate group-hover:text-indigo-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-[10px] text-gray-500 truncate">
                      {project.description || 'Sem descrição.'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: active jobs and fast shortcuts */}
        <div className="space-y-6">
          {/* Active Jobs panel with a live feed layout */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Processamentos Ativos</span>
            </h2>

            <div className="glass-panel rounded-xl p-5 border border-gray-900 space-y-4">
              {activeRenders.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-medium">Nenhum processamento ativo</p>
                  <p className="text-[10px] text-gray-600 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Nenhum vídeo sendo processado neste momento. Crie um projeto e inicie a geração do vídeo.
                  </p>
                </div>
              ) : (
                activeRenders.map((task) => (
                  <div key={task.id} className="space-y-2 pb-3 border-b border-gray-900/60 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <h4 className="font-semibold text-gray-200 truncate max-w-36">{task.projectName}</h4>
                        <span className="text-[9px] font-mono text-gray-500 mt-0.5 block">{task.templateName}</span>
                      </div>
                      <span className="font-mono text-[10px] bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded animate-pulse font-bold">
                        {task.progress}%
                      </span>
                    </div>

                    {/* Progress with custom color and glow */}
                    <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden border border-gray-900/60">
                      <div
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick links folders */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>SaaS Storage Browser</span>
            </h2>

            <div className="glass-panel rounded-xl p-5 border border-gray-900 space-y-3.5">
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex justify-between">
                <span>Diretório Virtual</span>
                <span className="text-emerald-400 font-semibold">{stats.storageUsed}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('storage')}
                  className="p-3 rounded-lg bg-gray-950/60 border border-gray-900 text-left hover:border-indigo-500/20 hover:bg-indigo-950/5 transition duration-300 cursor-pointer"
                >
                  <span className="block text-xs font-semibold text-gray-300">/uploads</span>
                  <span className="text-[9px] text-gray-500 font-mono mt-1 block">Recursos brutos</span>
                </button>
                <button
                  onClick={() => setActiveTab('storage')}
                  className="p-3 rounded-lg bg-gray-950/60 border border-gray-900 text-left hover:border-indigo-500/20 hover:bg-indigo-950/5 transition duration-300 cursor-pointer"
                >
                  <span className="block text-xs font-semibold text-gray-300">/rendered</span>
                  <span className="text-[9px] text-gray-500 font-mono mt-1 block">Vídeos finais</span>
                </button>
              </div>

              <button
                onClick={() => setActiveTab('storage')}
                className="w-full text-center py-2 bg-gray-900/40 hover:bg-gray-900 border border-gray-850 rounded-lg text-xs font-semibold text-gray-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:text-white"
              >
                <span>Navegar no Dropbox SaaS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 5. PORTAL DE MODELAGEM INTELIGENTE (MODAL WIZARD) */}
      <AnimatePresence>
        {isFlowOpen && (
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
                                  setTemplateFileUrl(t.thumbnailUrl || t.url || null);
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
                              Arraste e redimensione para definir com precisão de pixels onde o vídeo será renderizado sobre o template pelo FFmpeg.
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

                        {/* Lista de vídeos de origem carregados */}
                        {sourceVideos.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono flex justify-between">
                              <span>Fila de Mídias de Origem ({sourceVideos.length})</span>
                              <span className="text-indigo-400 font-bold">Simulando Upload Rápido</span>
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
                      disabled={sourceVideos.length === 0 || sourceVideos.some((v) => v.status === 'uploading')}
                      className={`py-2 px-5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        sourceVideos.length === 0 || sourceVideos.some((v) => v.status === 'uploading')
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
    </motion.div>
  );
};
