/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { motion, AnimatePresence } from 'motion/react';
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
  RefreshCw
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
    createProject
  } = useApp();

  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                  setActiveTab('projects');
                  // Quick simulated trigger to create a project
                }}
                className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-2 cursor-pointer duration-300"
              >
                <Video className="w-4 h-4" />
                <span>Novo Projeto</span>
              </button>
              
              <button
                onClick={() => setActiveTab('renderings')}
                className="py-2.5 px-5 bg-gray-900 hover:bg-gray-850 text-gray-200 border border-gray-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer duration-300 hover:border-gray-700"
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
          <h4 className="text-xs font-bold text-gray-200">Dispare os FFmpeg Jobs</h4>
          <p className="text-[11px] text-gray-500">Inicie renders em lote e baixe tudo empacotado em ZIP.</p>
        </div>
      </motion.div>

      {/* 3. METRICS CARDS WITH CLEAR HIERARCHY */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rendered Videos */}
        <div className="glass-panel rounded-xl p-5 border border-gray-900 flex items-center justify-between group hover:border-indigo-500/20 transition-all duration-300">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Total Renderizado</p>
            <h3 className="text-2xl font-bold font-mono text-gray-100 mt-1.5">{stats.totalVideosRendered}</h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
              <TrendingUp className="w-3 h-3" /> +14% essa semana
            </p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <Film className="w-5 h-5" />
          </div>
        </div>

        {/* Minutes Consumed */}
        <div className="glass-panel rounded-xl p-5 border border-gray-900 flex items-center justify-between group hover:border-purple-500/20 transition-all duration-300">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Minutos de Processamento</p>
            <h3 className="text-2xl font-bold font-mono text-gray-100 mt-1.5">{stats.totalRenderingMinutes} min</h3>
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 font-mono">
              <Clock className="w-3 h-3" /> Limite renova em 15 dias
            </p>
          </div>
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Templates Count */}
        <div className="glass-panel rounded-xl p-5 border border-gray-900 flex items-center justify-between group hover:border-pink-500/20 transition-all duration-300">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Templates Prontos</p>
            <h3 className="text-2xl font-bold font-mono text-gray-100 mt-1.5">{stats.activeTemplates}</h3>
            <p className="text-[10px] text-pink-400 flex items-center gap-1 mt-1 font-mono">
              Pronto para replicação
            </p>
          </div>
          <div className="p-3 rounded-lg bg-pink-950/30 border border-pink-500/10 text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Render Success Rate */}
        <div className="glass-panel rounded-xl p-5 border border-gray-900 flex items-center justify-between group hover:border-emerald-500/20 transition-all duration-300">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">Taxa de Sucesso</p>
            <h3 className="text-2xl font-bold font-mono text-gray-100 mt-1.5">{stats.renderSuccessRate}%</h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
              Estabilidade de Worker ideal
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
            <Activity className="w-5 h-5" />
          </div>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerRender(project.id);
                          }}
                          className="p-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-pink-600/20"
                          title="Iniciar Renderizador FFmpeg"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Render</span>
                        </button>
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
              <span>Jobs Ativos (FFmpeg Worker)</span>
            </h2>

            <div className="glass-panel rounded-xl p-5 border border-gray-900 space-y-4">
              {activeRenders.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-medium">Fila de render vazia</p>
                  <p className="text-[10px] text-gray-600 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Nenhum vídeo sendo processado neste momento. Crie um projeto e inicie o render.
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
    </motion.div>
  );
};
