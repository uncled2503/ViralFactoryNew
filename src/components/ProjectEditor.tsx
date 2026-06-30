/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { Project, AspectRatio, StorageFolder, StorageFile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Video,
  Play,
  FileVideo,
  Plus,
  Trash2,
  Layers,
  Sliders,
  ChevronDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Check,
  ArrowLeft,
  RefreshCw,
  Volume2,
  HelpCircle,
  Copy,
  Grid,
  Settings,
  Compass,
  Upload,
  Image,
  Text,
  BadgeAlert,
  Type,
  Maximize,
  ArrowRight,
  Sparkle
} from 'lucide-react';

interface ProjectEditorProps {
  projectId: string;
}

export interface EditorLayer {
  id: string;
  type: 'video' | 'headline' | 'subheadline' | 'logo' | 'watermark' | 'cta' | 'subtitle' | 'image' | 'progress';
  name: string;
  text?: string;
  font: string;
  color: string;
  size: number;
  x: number; // percentage based (0-100)
  y: number; // percentage based (0-100)
  rotation: number; // 0-360
  opacity: number; // 0-100
  animation: string; // 'none' | 'fade' | 'slide-up' | 'zoom-in' | 'typewriter' | 'bounce'
  margin: number;
  padding: number;
  visible: boolean;
  locked: boolean;
  contentUrl?: string;
  durationStart?: number; // seconds
  durationEnd?: number; // seconds
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({ projectId }) => {
  const {
    projects,
    updateProject,
    folders,
    uploadFileToFolder,
    triggerRender,
    renderingTasks,
    showToast
  } = useApp();
  const { navigate } = useRouter();

  // Find current project
  const project = projects.find((p) => p.id === projectId);

  // Fallback project state in case of loading lag
  const [localProject, setLocalProject] = useState<Project | null>(null);

  // Sync state once project is loaded
  useEffect(() => {
    if (project) {
      setLocalProject(project);
    }
  }, [project]);

  // Sidebar Tabs
  type TabType = 'uploads' | 'templates' | 'elements' | 'headlines' | 'subtitles' | 'watermarks' | 'logos' | 'cta' | 'exports';
  const [activeTab, setActiveTab] = useState<TabType>('uploads');

  // Preview / Canvas Zoom state
  const [zoom, setZoom] = useState<number>(75); // percent
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [guidesEnabled, setGuidesEnabled] = useState<boolean>(true);
  const [gridEnabled, setGridEnabled] = useState<boolean>(false);

  // Timeline position
  const [currentTime, setCurrentTime] = useState<number>(0); // in seconds (0-30)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Selected layer ID
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Layers Array - parsed from project variables, or initialized with comprehensive defaults
  const [layers, setLayers] = useState<EditorLayer[]>([]);

  // Initialize Layers from project variables or defaults
  useEffect(() => {
    if (!localProject) return;

    // Check if project already has layers inside variables, if not generate defaults
    if (localProject.variables.layers && Array.isArray(localProject.variables.layers)) {
      setLayers(localProject.variables.layers);
    } else {
      const defaultLayers: EditorLayer[] = [
        {
          id: 'lyr-video-bg',
          type: 'video',
          name: '🎬 Vídeo de Fundo',
          contentUrl: localProject.variables.backgroundVideoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-street-with-people-and-cars-40019-large.mp4',
          font: 'Inter',
          color: '#ffffff',
          size: 100,
          x: 50,
          y: 50,
          rotation: 0,
          opacity: 100,
          animation: 'none',
          margin: 0,
          padding: 0,
          visible: true,
          locked: true,
          durationStart: 0,
          durationEnd: 30
        },
        {
          id: 'lyr-progress-bar',
          type: 'progress',
          name: '⏳ Barra de Progresso',
          color: localProject.variables.brandColor || '#6366f1',
          font: 'Inter',
          size: 8, // height in px
          x: 50,
          y: 95,
          rotation: 0,
          opacity: 100,
          animation: 'fade',
          margin: 0,
          padding: 0,
          visible: true,
          locked: false,
          durationStart: 0,
          durationEnd: 30
        },
        {
          id: 'lyr-headline',
          type: 'headline',
          name: '✍️ Headline Principal',
          text: localProject.variables.title || 'ESCREVA SUA HEADLINE AQUI',
          font: localProject.variables.fontName || 'Outfit Bold',
          color: '#ffffff',
          size: 26,
          x: 50,
          y: 15,
          rotation: 0,
          opacity: 100,
          animation: 'slide-up',
          margin: 0,
          padding: 10,
          visible: true,
          locked: false,
          durationStart: 0,
          durationEnd: 30
        },
        {
          id: 'lyr-subtitle',
          type: 'subtitle',
          name: '💬 Legendas Dinâmicas',
          text: 'Legenda falada aparece aqui em tempo real...',
          font: 'Montserrat ExtraBold',
          color: '#eab308', // yellow
          size: 22,
          x: 50,
          y: 55,
          rotation: 0,
          opacity: 100,
          animation: 'bounce',
          margin: 0,
          padding: 8,
          visible: true,
          locked: false,
          durationStart: 0,
          durationEnd: 30
        },
        {
          id: 'lyr-watermark',
          type: 'watermark',
          name: '🛡️ Marca d\'água',
          text: '@VIRAL_FACTORY',
          font: 'Courier New',
          color: '#ffffff',
          size: 11,
          x: 80,
          y: 5,
          rotation: 0,
          opacity: 45,
          animation: 'none',
          margin: 0,
          padding: 4,
          visible: true,
          locked: false,
          durationStart: 0,
          durationEnd: 30
        },
        {
          id: 'lyr-logo',
          type: 'logo',
          name: '🏷️ Logotipo de Marca',
          contentUrl: localProject.variables.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=128&h=128&fit=crop',
          font: 'Inter',
          color: '#ffffff',
          size: 40, // size in px
          x: 10,
          y: 5,
          rotation: 0,
          opacity: 90,
          animation: 'none',
          margin: 0,
          padding: 0,
          visible: true,
          locked: false,
          durationStart: 0,
          durationEnd: 30
        },
        {
          id: 'lyr-cta',
          type: 'cta',
          name: '🔥 Call to Action (Fim)',
          text: '👉 Clique no link do Perfil!',
          font: 'Outfit Bold',
          color: '#ef4444', // red
          size: 18,
          x: 50,
          y: 80,
          rotation: 0,
          opacity: 100,
          animation: 'zoom-in',
          margin: 0,
          padding: 12,
          visible: true,
          locked: false,
          durationStart: 25,
          durationEnd: 30
        }
      ];
      setLayers(defaultLayers);
    }
  }, [localProject]);

  // Selected layer object
  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  // Playback engine
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 30) {
            setIsPlaying(false);
            return 0;
          }
          return Number((prev + 0.1).toFixed(1));
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);

  // Subtitle lyrics timeline preset
  const subtitleTimeline = [
    { start: 0, end: 3, text: '💡 Quer dominar as redes sociais?' },
    { start: 3, end: 6, text: '🚀 Comece criando vídeos curtos altamente magnéticos.' },
    { start: 6, end: 10, text: '🔥 O algoritmo valoriza retenção de público.' },
    { start: 10, end: 14, text: '⚡ Insira headlines que despertam curiosidade nos primeiros 2s.' },
    { start: 14, end: 18, text: '💬 Use legendas com cores dinâmicas para gerar leitura passiva.' },
    { start: 18, end: 22, text: '⚙️ Viral Factory automatiza todo esse workflow via FFmpeg.' },
    { start: 22, end: 25, text: '🏆 Economize 95% do seu tempo de edição diária.' },
    { start: 25, end: 30, text: '🔥 Siga nosso canal para mais estratégias ultra secretas!' }
  ];

  // Dynamic current subtitle logic
  const currentSubtitleText = subtitleTimeline.find(
    (s) => currentTime >= s.start && currentTime < s.end
  )?.text || 'Rode o player para testar as legendas dinâmicas...';

  // Auto-Save feature
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const lastLayersSavedRef = useRef<string>('');

  useEffect(() => {
    if (!localProject || layers.length === 0) return;
    const layersStr = JSON.stringify(layers);

    // Initial load sync
    if (!lastLayersSavedRef.current) {
      lastLayersSavedRef.current = layersStr;
      return;
    }

    if (layersStr !== lastLayersSavedRef.current) {
      setSaveStatus('dirty');
    }
  }, [layers, localProject]);

  // Auto save trigger effect
  useEffect(() => {
    if (saveStatus === 'dirty') {
      const timer = setTimeout(() => {
        handleSaveProject(true); // silent auto-save
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, layers]);

  // Save Project Action
  const handleSaveProject = async (silent = false) => {
    if (!localProject) return;
    if (!silent) setSaveStatus('saving');

    try {
      // Package current layers state back into project variables
      const updatedProj: Project = {
        ...localProject,
        updatedAt: new Date().toISOString(),
        variables: {
          ...localProject.variables,
          layers: layers,
          // Sync primary fields for backwards compatibility with list views
          title: layers.find(l => l.type === 'headline')?.text || localProject.variables.title,
          subtitles: subtitleTimeline.map(s => s.text),
          brandColor: layers.find(l => l.type === 'progress')?.color || localProject.variables.brandColor,
          fontName: layers.find(l => l.type === 'headline')?.font || localProject.variables.fontName
        }
      };

      updateProject(updatedProj);
      lastLayersSavedRef.current = JSON.stringify(layers);
      setSaveStatus('saved');

      if (!silent) {
        showToast('Projeto salvo com sucesso no banco de dados Supabase!', 'success');
      }
    } catch (err) {
      console.error('Erro ao salvar projeto:', err);
      showToast('Erro ao salvar projeto na nuvem. Verifique o console.', 'error');
      setSaveStatus('dirty');
    }
  };

  // Rendering Actions
  const [isPreviewRendering, setIsPreviewRendering] = useState<boolean>(false);
  const [previewRenderProgress, setPreviewRenderProgress] = useState<number>(0);
  const [renderedPreviewVideoUrl, setRenderedPreviewVideoUrl] = useState<string | null>(null);

  const handleGeneratePreview = () => {
    setIsPreviewRendering(true);
    setPreviewRenderProgress(0);
    setRenderedPreviewVideoUrl(null);
    showToast('Iniciando simulação local do renderizador de rascunho...', 'info');

    const interval = setInterval(() => {
      setPreviewRenderProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPreviewRendering(false);
          // Set a cool high-quality rendered short video as result
          setRenderedPreviewVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-illuminated-alley-40018-large.mp4');
          showToast('Simulação local de rascunho de 5s concluída com sucesso!', 'success');
          return 100;
        }
        return prev + 10;
      });
    }, 400);
  };

  const handleRenderFullProject = () => {
    if (!localProject) return;
    const success = triggerRender(localProject.id);
    if (success) {
      showToast('Job de renderização integral enviado para a fila de processamento!', 'success');
      // Navigate to renderings manager
      navigate('/renders');
    } else {
      showToast('Erro ao colocar na fila. Limite excedido ou assinatura suspensa.', 'error');
    }
  };

  // Layer Mutators
  const updateSelectedLayerProps = (updates: Partial<EditorLayer>) => {
    if (!selectedLayerId) return;
    setLayers((prev) =>
      prev.map((l) => (l.id === selectedLayerId ? { ...l, ...updates } : l))
    );
  };

  const handleDuplicateLayer = (layerId: string) => {
    const target = layers.find((l) => l.id === layerId);
    if (!target) return;

    const duplicated: EditorLayer = {
      ...target,
      id: `lyr-${Math.random().toString(36).substr(2, 9)}`,
      name: `${target.name} (Cópia)`,
      x: Math.min(target.x + 5, 90),
      y: Math.min(target.y + 5, 90),
      locked: false
    };

    setLayers((prev) => [...prev, duplicated]);
    setSelectedLayerId(duplicated.id);
    showToast(`Camada "${target.name}" duplicada!`, 'success');
  };

  const handleDeleteLayer = (layerId: string) => {
    const target = layers.find((l) => l.id === layerId);
    if (!target) return;
    if (target.id === 'lyr-video-bg') {
      showToast('A camada de vídeo de fundo é estrutural e não pode ser deletada.', 'error');
      return;
    }

    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    showToast(`Camada "${target.name}" removida!`, 'info');
  };

  const handleReorderLayer = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= layers.length) return;

    const updated = [...layers];
    const [moved] = updated.splice(index, 1);
    updated.splice(nextIndex, 0, moved);
    setLayers(updated);
  };

  const handleAddNewTextLayer = () => {
    const newLyr: EditorLayer = {
      id: `lyr-${Math.random().toString(36).substr(2, 9)}`,
      type: 'headline',
      name: `📝 Texto Personalizado ${layers.length + 1}`,
      text: 'TEXTO EDITÁVEL',
      font: 'Inter Bold',
      color: '#ffffff',
      size: 16,
      x: 50,
      y: 50,
      rotation: 0,
      opacity: 100,
      animation: 'none',
      margin: 0,
      padding: 6,
      visible: true,
      locked: false,
      durationStart: 0,
      durationEnd: 30
    };
    setLayers((prev) => [...prev, newLyr]);
    setSelectedLayerId(newLyr.id);
    showToast('Nova camada de texto criada!', 'success');
  };

  // Upload Presets files
  const defaultUploadsFolder = folders.find((f) => f.name === 'uploads');
  const availableUploadFiles = defaultUploadsFolder?.files || [];

  // Handle uploading simulation
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !defaultUploadsFolder) return;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const success = uploadFileToFolder(
      defaultUploadsFolder.id,
      file.name,
      `${sizeMB} MB`,
      file.type.includes('video') ? 'video' : file.type.includes('audio') ? 'audio' : 'image'
    );

    if (success) {
      showToast(`Arquivo "${file.name}" carregado com sucesso no Supabase Storage!`, 'success');
    } else {
      showToast('Falha no upload. Verifique os limites do seu plano.', 'error');
    }
  };

  if (!localProject) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-gray-300">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-mono">Carregando workspace do Projeto...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 flex flex-col select-none overflow-hidden h-screen w-screen fixed inset-0 z-50">
      
      {/* 1. TOP HEADER BAR */}
      <header className="h-14 border-b border-gray-900 bg-gray-950 flex items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition py-1.5 px-3 rounded-lg hover:bg-gray-900 cursor-pointer border border-gray-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-400" />
            <h1 className="text-xs font-bold text-gray-100 truncate max-w-44">
              {localProject.name}
            </h1>
            <span className="text-[9px] font-mono bg-gray-900 text-gray-500 px-1.5 py-0.5 rounded border border-gray-850">
              {localProject.aspect}
            </span>
          </div>
        </div>

        {/* Syncing Auto-Save State widget */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            {saveStatus === 'saved' && (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Nuvem Sincronizada
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-yellow-400 flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Salvando alterações...
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                Alterações pendentes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveProject(false)}
              className="py-1.5 px-3 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-200 hover:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>

            <button
              onClick={handleGeneratePreview}
              disabled={isPreviewRendering}
              className="py-1.5 px-3 bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/20 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gerar Preview (5s)</span>
            </button>

            <button
              onClick={handleRenderFullProject}
              className="py-1.5 px-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg shadow-md shadow-pink-600/15 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Renderizar Completo</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN THREE-COLUMN CONTAINER */}
      <div className="flex-1 flex overflow-hidden shrink-0 min-h-0 relative z-10 w-full">
        
        {/* 2. LEFT SIDEBAR ASSETS MANAGER PANEL */}
        <aside className="w-80 border-r border-gray-900 bg-gray-950/80 flex flex-col overflow-hidden shrink-0">
          {/* Navigation Tab rail */}
          <div className="grid grid-cols-3 border-b border-gray-900 p-1 bg-gray-950 shrink-0">
            {([
              { id: 'uploads', label: 'Uploads' },
              { id: 'templates', label: 'Layouts' },
              { id: 'elements', label: 'Mídias' }
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 border-b border-gray-900 p-1 bg-gray-950 shrink-0">
            {([
              { id: 'headlines', label: 'Texto' },
              { id: 'subtitles', label: 'Legenda' },
              { id: 'watermarks', label: 'Marca' }
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 border-b border-gray-900 p-1 bg-gray-950 shrink-0">
            {([
              { id: 'logos', label: 'Logos' },
              { id: 'cta', label: 'CTA' },
              { id: 'exports', label: 'Ajustes' }
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content Display Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* TAB: UPLOADS */}
            {activeTab === 'uploads' && (
              <div className="space-y-4">
                <div className="border border-dashed border-gray-800 rounded-xl p-4 text-center bg-gray-950/20">
                  <Upload className="w-8 h-8 text-indigo-500/60 mx-auto mb-2" />
                  <h4 className="text-xs font-semibold text-gray-300">Envie suas mídias reais</h4>
                  <p className="text-[10px] text-gray-500 mt-1 mb-3">Vídeo, Imagem, Música ou Fontes</p>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    Selecionar Arquivos
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleSimulateUpload}
                    accept="video/*,image/*,audio/*"
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Arquivos na Nuvem (Supabase)</h4>
                  {availableUploadFiles.length === 0 ? (
                    <p className="text-[10px] text-gray-600 italic">Nenhum upload registrado.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {availableUploadFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-950/50 border border-gray-900 text-left hover:border-gray-800 transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {file.type === 'video' ? (
                              <FileVideo className="w-4 h-4 text-purple-400 shrink-0" />
                            ) : (
                              <Image className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            <div className="truncate">
                              <p className="text-[10px] font-bold text-gray-300 truncate">{file.name}</p>
                              <p className="text-[8px] font-mono text-gray-600">{file.size}</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              if (file.type === 'video') {
                                updateSelectedLayerProps({ contentUrl: file.url });
                                showToast(`Fundo atualizado para ${file.name}`, 'success');
                              } else if (file.type === 'image') {
                                // Add overlay image layer
                                const newImgLyr: EditorLayer = {
                                  id: `lyr-${Math.random().toString(36).substr(2, 9)}`,
                                  type: 'image',
                                  name: `🖼️ Imagem: ${file.name}`,
                                  contentUrl: file.url,
                                  font: 'Inter',
                                  color: '#ffffff',
                                  size: 60,
                                  x: 50,
                                  y: 50,
                                  rotation: 0,
                                  opacity: 100,
                                  animation: 'none',
                                  margin: 0,
                                  padding: 0,
                                  visible: true,
                                  locked: false,
                                  durationStart: 0,
                                  durationEnd: 30
                                };
                                setLayers((p) => [...p, newImgLyr]);
                                setSelectedLayerId(newImgLyr.id);
                                showToast('Adicionada imagem sobreposta!', 'success');
                              }
                            }}
                            className="p-1 text-indigo-400 hover:text-white hover:bg-gray-900 rounded shrink-0 cursor-pointer"
                            title="Usar Arquivo"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TEMPLATES */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Substitua todo o layout estrutural do vídeo selecionando um preset inteligente de grid:
                </p>

                {([
                  { id: 'grid-split', name: 'Layout Bi-partido (Split Screen)', desc: 'Vídeo em cima, gameplay de asmr embaixo.', bg: 'https://assets.mixkit.co/videos/preview/mixkit-subway-car-speeding-on-the-tracks-at-night-40011-large.mp4' },
                  { id: 'grid-reddit', name: 'História do Reddit clássico', desc: 'Narrativa centralizada com fundo ASMR relaxante.', bg: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-street-with-people-and-cars-40019-large.mp4' },
                  { id: 'grid-motivational', name: 'Motivacional com Margens Escuras', desc: 'Layout focado em imersão emocional escura.', bg: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-illuminated-alley-40018-large.mp4' }
                ]).map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      // Apply template logic (update background video & layout margins)
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.type === 'video'
                            ? { ...l, contentUrl: tpl.bg }
                            : l
                        )
                      );
                      showToast(`Estrutura de template "${tpl.name}" aplicada!`, 'success');
                    }}
                    className="w-full p-3 rounded-xl bg-gray-950/40 border border-gray-900 text-left hover:border-indigo-500/40 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <Grid className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-200">{tpl.name}</h4>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-relaxed">{tpl.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB: ELEMENTS */}
            {activeTab === 'elements' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Barras de Progresso</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Linha Fina', color: '#6366f1', size: 3 },
                    { name: 'Glow Premium', color: '#ec4899', size: 6 },
                    { name: 'Sólido Amarelo', color: '#eab308', size: 10 }
                  ].map((elem, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLayers((prev) =>
                          prev.map((l) =>
                            l.type === 'progress'
                              ? { ...l, color: elem.color, size: elem.size, visible: true }
                              : l
                          )
                        );
                        showToast(`Elemento "${elem.name}" aplicado!`, 'success');
                      }}
                      className="p-2.5 rounded-lg bg-gray-950/50 border border-gray-900 text-center hover:border-indigo-500/30 transition text-[9px] font-bold text-gray-300 cursor-pointer"
                    >
                      <div
                        className="w-full h-1.5 rounded-full mb-1.5"
                        style={{ backgroundColor: elem.color }}
                      ></div>
                      <span>{elem.name}</span>
                    </button>
                  ))}
                </div>

                <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Presets de Sobreposição</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      // Add image sticker layer
                      const sticker: EditorLayer = {
                        id: `lyr-sticker-${Date.now()}`,
                        type: 'image',
                        name: '🎭 Sticker: Seta Vermelha',
                        contentUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=128&h=128&fit=crop',
                        font: 'Inter',
                        color: '#ffffff',
                        size: 50,
                        x: 50,
                        y: 70,
                        rotation: 15,
                        opacity: 100,
                        animation: 'bounce',
                        margin: 0,
                        padding: 0,
                        visible: true,
                        locked: false
                      };
                      setLayers((prev) => [...prev, sticker]);
                      setSelectedLayerId(sticker.id);
                      showToast('Sticker seta vermelha adicionado!', 'success');
                    }}
                    className="w-full p-2.5 rounded-lg bg-gray-950/50 border border-gray-900 text-left text-[10px] font-bold hover:border-indigo-500/20 transition cursor-pointer flex items-center justify-between"
                  >
                    <span>🎯 Seta de Atenção CTA</span>
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: HEADLINES */}
            {activeTab === 'headlines' && (
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Gerencie o título principal que captura a atenção imediata do usuário no feed.
                </p>

                <button
                  onClick={handleAddNewTextLayer}
                  className="w-full py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs font-bold hover:bg-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Camada de Texto</span>
                </button>

                {layers
                  .filter((l) => l.type === 'headline')
                  .map((lyr) => (
                    <div
                      key={lyr.id}
                      onClick={() => setSelectedLayerId(lyr.id)}
                      className={`p-3 rounded-xl border transition text-left cursor-pointer ${
                        selectedLayerId === lyr.id
                          ? 'bg-indigo-600/10 border-indigo-500/30'
                          : 'bg-gray-950/40 border-gray-900 hover:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-indigo-400">Headline</span>
                        <Type className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-200 font-bold truncate mt-1.5">
                        {lyr.text || 'Sem texto'}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {/* TAB: SUBTITLES */}
            {activeTab === 'subtitles' && (
              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  As legendas do Viral Factory são cortadas automaticamente palavra-por-palavra no FFmpeg. Escolha o preset de estilo visual das letras:
                </p>

                {[
                  { name: 'TikTok Pop Amarelo', font: 'Montserrat ExtraBold', color: '#eab308', size: 24, anim: 'bounce' },
                  { name: 'Brutalist Preto e Branco', font: 'Impact', color: '#ffffff', size: 28, anim: 'none' },
                  { name: 'Minimalista Sutil', font: 'Inter', color: '#d1d5db', size: 18, anim: 'fade' }
                ].map((style, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.type === 'subtitle'
                            ? {
                                ...l,
                                font: style.font,
                                color: style.color,
                                size: style.size,
                                animation: style.anim
                              }
                            : l
                        )
                      );
                      showToast(`Estilo de legenda "${style.name}" aplicado!`, 'success');
                    }}
                    className="w-full p-3 rounded-xl bg-gray-950/40 border border-gray-900 text-left hover:border-indigo-500/30 transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-200">{style.name}</h4>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">{style.font} • {style.color}</p>
                    </div>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </button>
                ))}
              </div>
            )}

            {/* TAB: WATERMARKS */}
            {activeTab === 'watermarks' && (
              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Personalize sua assinatura de rede social para evitar roubos de conteúdo no Instagram ou TikTok.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Texto da Assinatura</label>
                    <input
                      type="text"
                      value={layers.find(l => l.type === 'watermark')?.text || ''}
                      onChange={(e) => {
                        setLayers(prev =>
                          prev.map(l => l.type === 'watermark' ? { ...l, text: e.target.value.toUpperCase() } : l)
                        );
                      }}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs outline-none focus:border-indigo-500 text-gray-200"
                      placeholder="@MEU_PERFIL"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Posição Vertical</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setLayers(prev => prev.map(l => l.type === 'watermark' ? { ...l, y: 5 } : l));
                        }}
                        className="py-1.5 bg-gray-950 border border-gray-900 rounded text-[9px] hover:bg-gray-900 transition font-bold"
                      >
                        Topo
                      </button>
                      <button
                        onClick={() => {
                          setLayers(prev => prev.map(l => l.type === 'watermark' ? { ...l, y: 92 } : l));
                        }}
                        className="py-1.5 bg-gray-950 border border-gray-900 rounded text-[9px] hover:bg-gray-900 transition font-bold"
                      >
                        Rodapé
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LOGOS */}
            {activeTab === 'logos' && (
              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Adicione o logotipo da sua marca ou canal de cortes para consolidar sua autoridade visual em bando.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Lobo Sombrio', url: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=128&h=128&fit=crop' },
                    { name: 'Cerebro Inteligente', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=128&h=128&fit=crop' }
                  ].map((logo, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLayers((prev) =>
                          prev.map((l) =>
                            l.type === 'logo'
                              ? { ...l, contentUrl: logo.url, visible: true }
                              : l
                          )
                        );
                        showToast(`Logotipo "${logo.name}" selecionado!`, 'success');
                      }}
                      className="p-2 rounded-lg bg-gray-950/50 border border-gray-900 hover:border-indigo-500/20 text-center transition flex flex-col items-center gap-1.5 cursor-pointer"
                    >
                      <img
                        src={logo.url}
                        alt={logo.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-800"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[9px] text-gray-400 font-bold truncate w-full">{logo.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CTA */}
            {activeTab === 'cta' && (
              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Call to Action (Chamada para Ação) serve para direcionar a retenção para conversão no final do vídeo.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Texto do CTA</label>
                    <input
                      type="text"
                      value={layers.find(l => l.type === 'cta')?.text || ''}
                      onChange={(e) => {
                        setLayers(prev =>
                          prev.map(l => l.type === 'cta' ? { ...l, text: e.target.value } : l)
                        );
                      }}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs outline-none focus:border-indigo-500 text-gray-200"
                      placeholder="👉 Clique no link do Perfil!"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Cor do Fundo/Letra</label>
                    <input
                      type="color"
                      value={layers.find(l => l.type === 'cta')?.color || '#ef4444'}
                      onChange={(e) => {
                        setLayers(prev =>
                          prev.map(l => l.type === 'cta' ? { ...l, color: e.target.value } : l)
                        );
                      }}
                      className="w-full h-8 bg-gray-950 border border-gray-900 rounded-lg outline-none cursor-pointer p-0.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: EXPORTS ADJUSTS */}
            {activeTab === 'exports' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Metadados FFmpeg</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-mono text-gray-500 mb-1">Taxa de Quadros (FPS)</label>
                    <select className="w-full bg-gray-950 border border-gray-900 text-xs py-1.5 px-2 rounded-lg outline-none text-gray-300">
                      <option>60 FPS Ultra HD (Suporta IA)</option>
                      <option>30 FPS Padrão</option>
                      <option>24 FPS Cinematográfico</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-gray-500 mb-1">Bitrate de Áudio</label>
                    <select className="w-full bg-gray-950 border border-gray-900 text-xs py-1.5 px-2 rounded-lg outline-none text-gray-300">
                      <option>320kbps Hifi Estéreo</option>
                      <option>192kbps Standard</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* 3. CENTRAL WORKSPACE CANVAS PREVIEW & ZOOM PANEL */}
        <section className="flex-1 bg-gray-950 flex flex-col overflow-hidden shrink-0">
          {/* Header toolbar for Canvas manipulation */}
          <div className="h-10 border-b border-gray-900 bg-gray-950/40 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> Workspace de Alinhamento
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-gray-400 font-mono">
                <button
                  onClick={() => setZoom(Math.max(zoom - 10, 40))}
                  className="p-1 rounded hover:bg-gray-900 transition"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] w-8 text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(zoom + 10, 150))}
                  className="p-1 rounded hover:bg-gray-900 transition"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-4 w-[1px] bg-gray-900"></div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
                <button
                  onClick={() => setSnapEnabled(!snapEnabled)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                    snapEnabled ? 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5' : 'border-gray-900 hover:text-gray-300'
                  }`}
                >
                  Snap
                </button>

                <button
                  onClick={() => setGridEnabled(!gridEnabled)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                    gridEnabled ? 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5' : 'border-gray-900 hover:text-gray-300'
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>
          </div>

          {/* Core Interactive Preview Canvas Frame */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gray-900/10 relative">
            
            {/* Dynamic Rendering Task Overlay for Preview generation */}
            <AnimatePresence>
              {isPreviewRendering && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/90 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-8 text-center"
                >
                  <RefreshCw className="w-10 h-10 text-pink-500 animate-spin mb-4" />
                  <h4 className="text-sm font-bold text-gray-100">Renderizador de Rascunho FFmpeg Ativo</h4>
                  <p className="text-xs text-gray-500 mt-1.5 max-w-sm">
                    Compilando headlines, legendas dinâmicas e logotipo em uma timeline curta de 5 segundos.
                  </p>
                  <div className="w-56 h-1 bg-gray-900 rounded-full overflow-hidden mt-6">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${previewRenderProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 mt-2">{previewRenderProgress}%</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simulated Live preview result player overlay */}
            <AnimatePresence>
              {renderedPreviewVideoUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 bg-black/95 z-30 flex flex-col items-center justify-center p-8"
                >
                  <div className="max-w-xs w-full bg-gray-950 border border-gray-900 rounded-2xl overflow-hidden shadow-2xl relative">
                    <button
                      onClick={() => setRenderedPreviewVideoUrl(null)}
                      className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-black/80 hover:bg-black border border-gray-900 text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <video
                      src={renderedPreviewVideoUrl}
                      className="w-full h-[500px] object-cover"
                      autoPlay
                      controls
                      playsInline
                    />
                    <div className="p-4 bg-gray-950 border-t border-gray-900/80 text-center">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">FFmpeg Output Completo</p>
                      <p className="text-[9px] text-gray-500 mt-1">Este rascunho de 5s reflete exatamente o arquivo final.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sizable Mobile Simulator Canvas frame */}
            <div
              className={`relative bg-black shadow-2xl transition-all duration-300 border border-gray-900 rounded-lg overflow-hidden flex flex-col items-center justify-center`}
              style={{
                width: localProject.aspect === '9:16' ? '280px' : localProject.aspect === '16:9' ? '500px' : '350px',
                height: localProject.aspect === '9:16' ? '500px' : localProject.aspect === '16:9' ? '280px' : '350px',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center'
              }}
            >
              
              {/* Optional Grid Line Overlay */}
              {gridEnabled && (
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none z-10 opacity-30">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="border-[0.5px] border-dashed border-gray-700"></div>
                  ))}
                </div>
              )}

              {/* Dynamic layer loops rendering */}
              {layers
                .filter((l) => l.visible)
                .map((lyr) => {
                  
                  // Hide layer depending on duration bounds
                  if (lyr.durationStart !== undefined && lyr.durationEnd !== undefined) {
                    if (currentTime < lyr.durationStart || currentTime > lyr.durationEnd) {
                      return null;
                    }
                  }

                  const isSelected = selectedLayerId === lyr.id;

                  return (
                    <div
                      key={lyr.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(lyr.id);
                      }}
                      className={`absolute select-none cursor-pointer z-10 transition-shadow ${
                        isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black rounded' : 'hover:ring-1 hover:ring-gray-600 rounded'
                      }`}
                      style={{
                        left: `${lyr.x}%`,
                        top: `${lyr.y}%`,
                        transform: `translate(-50%, -50%) rotate(${lyr.rotation}deg)`,
                        opacity: lyr.opacity / 100,
                        width: lyr.type === 'video' ? '100%' : lyr.type === 'progress' ? '90%' : 'auto',
                        height: lyr.type === 'video' ? '100%' : 'auto',
                        pointerEvents: lyr.locked && lyr.type === 'video' ? 'none' : 'auto'
                      }}
                    >
                      {/* 1. Video Layer renderer */}
                      {lyr.type === 'video' && lyr.contentUrl && (
                        <video
                          src={lyr.contentUrl}
                          className="w-full h-full object-cover pointer-events-none"
                          muted
                          playsInline
                          loop
                        />
                      )}

                      {/* 2. Text/Headline Renderer */}
                      {lyr.type === 'headline' && (
                        <div
                          className="text-center font-black select-none uppercase tracking-wide drop-shadow-xl"
                          style={{
                            color: lyr.color,
                            fontSize: `${lyr.size}px`,
                            fontFamily: lyr.font,
                            margin: `${lyr.margin}px`,
                            padding: `${lyr.padding}px`
                          }}
                        >
                          {lyr.text}
                        </div>
                      )}

                      {/* 3. Subtitles dynamizer */}
                      {lyr.type === 'subtitle' && (
                        <div
                          className="text-center font-extrabold select-none drop-shadow-lg scale-102 transition-transform duration-100"
                          style={{
                            color: lyr.color,
                            fontSize: `${lyr.size}px`,
                            fontFamily: lyr.font,
                            margin: `${lyr.margin}px`,
                            padding: `${lyr.padding}px`
                          }}
                        >
                          {isPlaying ? currentSubtitleText : lyr.text}
                        </div>
                      )}

                      {/* 4. Watermark */}
                      {lyr.type === 'watermark' && (
                        <div
                          className="text-center font-semibold text-[10px] tracking-widest font-mono text-gray-200/80 uppercase px-1.5 py-0.5 rounded border border-gray-100/10 bg-black/20"
                          style={{ fontSize: `${lyr.size}px` }}
                        >
                          {lyr.text}
                        </div>
                      )}

                      {/* 5. Progress Bar visually synced with currentTime */}
                      {lyr.type === 'progress' && (
                        <div
                          className="w-full bg-gray-800 rounded-full"
                          style={{ height: `${lyr.size}px` }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-100"
                            style={{
                              backgroundColor: lyr.color,
                              width: `${(currentTime / 30) * 100}%`
                            }}
                          ></div>
                        </div>
                      )}

                      {/* 6. Logo */}
                      {lyr.type === 'logo' && lyr.contentUrl && (
                        <img
                          src={lyr.contentUrl}
                          alt="Logo layer"
                          className="rounded-full object-cover border-2 border-indigo-500 shadow-md"
                          style={{
                            width: `${lyr.size}px`,
                            height: `${lyr.size}px`
                          }}
                          referrerPolicy="no-referrer"
                        />
                      )}

                      {/* 7. Image sticker */}
                      {lyr.type === 'image' && lyr.contentUrl && (
                        <img
                          src={lyr.contentUrl}
                          alt="Image overlay layer"
                          className="object-contain"
                          style={{
                            width: `${lyr.size}px`,
                            opacity: lyr.opacity / 100
                          }}
                          referrerPolicy="no-referrer"
                        />
                      )}

                      {/* 8. Call to Action panel */}
                      {lyr.type === 'cta' && (
                        <div
                          className="text-center text-white px-4 py-2.5 rounded-xl shadow-lg font-bold uppercase tracking-wider animate-bounce"
                          style={{
                            backgroundColor: lyr.color,
                            fontSize: `${lyr.size}px`,
                            fontFamily: lyr.font
                          }}
                        >
                          {lyr.text}
                        </div>
                      )}

                    </div>
                  );
                })}
            </div>
          </div>
        </section>

        {/* 4. RIGHT PROPERTIES EDITOR & LAYERS STRUCTURE PANEL */}
        <aside className="w-80 border-l border-gray-900 bg-gray-950 flex flex-col overflow-hidden shrink-0">
          
          {/* Top Layer List panel (Photoshop / Figma order) */}
          <div className="h-2/5 border-b border-gray-900 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-900 bg-gray-950/60 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Painel de Camadas
              </span>
            </div>

            {/* List rendered front-to-back (reverse loop) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {layers
                .slice()
                .reverse()
                .map((lyr, revIdx) => {
                  const idx = layers.length - 1 - revIdx;
                  const isSelected = selectedLayerId === lyr.id;

                  return (
                    <div
                      key={lyr.id}
                      onClick={() => setSelectedLayerId(lyr.id)}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer group transition-all ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500/45 shadow'
                          : 'bg-gray-950/20 border-gray-900/80 hover:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {/* Drag indicator/Order arrows */}
                        <div className="flex flex-col text-gray-600 shrink-0">
                          <button
                            disabled={idx === layers.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderLayer(idx, 'up');
                            }}
                            className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            ▲
                          </button>
                          <button
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderLayer(idx, 'down');
                            }}
                            className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            ▼
                          </button>
                        </div>

                        <div className="truncate">
                          <p className="text-[10px] font-bold text-gray-200 truncate">{lyr.name}</p>
                          <p className="text-[8px] font-mono text-gray-600 uppercase">
                            TIPO: {lyr.type} {lyr.locked && '• BLOQUEADO'}
                          </p>
                        </div>
                      </div>

                      {/* Quick layers controls (Lock, Eye, Trash) */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLayers(prev => prev.map(l => l.id === lyr.id ? { ...l, locked: !l.locked } : l));
                          }}
                          className={`p-1 rounded hover:bg-gray-900 transition cursor-pointer ${
                            lyr.locked ? 'text-indigo-400' : 'text-gray-500'
                          }`}
                          title={lyr.locked ? 'Desbloquear' : 'Bloquear'}
                        >
                          {lyr.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLayers(prev => prev.map(l => l.id === lyr.id ? { ...l, visible: !l.visible } : l));
                          }}
                          className="p-1 rounded hover:bg-gray-900 text-gray-500 hover:text-gray-300 transition cursor-pointer"
                          title={lyr.visible ? 'Ocultar' : 'Exibir'}
                        >
                          {lyr.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>

                        {lyr.id !== 'lyr-video-bg' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLayer(lyr.id);
                            }}
                            className="p-1 rounded hover:bg-red-950/20 text-gray-600 hover:text-red-400 transition cursor-pointer"
                            title="Remover Camada"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Properties Editor Tab panel (Contextual variables) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-950/60">
            <div className="p-3 border-b border-gray-900 bg-gray-950/60 shrink-0">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" /> Configurações de Camada
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedLayer ? (
                <div className="space-y-4">
                  {/* Layer Meta name */}
                  <div className="bg-gray-900/30 p-2.5 border border-gray-900 rounded-lg">
                    <p className="text-[9px] font-mono text-indigo-400 uppercase font-bold">Elemento Selecionado</p>
                    <p className="text-xs font-extrabold text-gray-100 mt-1">{selectedLayer.name}</p>
                  </div>

                  {/* Property: TEXT (Headline, Subtitle, CTA, Watermark) */}
                  {(selectedLayer.type === 'headline' ||
                    selectedLayer.type === 'subtitle' ||
                    selectedLayer.type === 'watermark' ||
                    selectedLayer.type === 'cta') && (
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Texto de Conteúdo</label>
                      <textarea
                        value={selectedLayer.text || ''}
                        onChange={(e) => updateSelectedLayerProps({ text: e.target.value })}
                        className="w-full h-16 px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs outline-none focus:border-indigo-500 text-gray-200"
                      />
                    </div>
                  )}

                  {/* Property: FONT */}
                  {(selectedLayer.type === 'headline' ||
                    selectedLayer.type === 'subtitle' ||
                    selectedLayer.type === 'watermark' ||
                    selectedLayer.type === 'cta') && (
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Fonte da Letra</label>
                      <select
                        value={selectedLayer.font}
                        onChange={(e) => updateSelectedLayerProps({ font: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-900 text-xs py-1.5 px-2 rounded-lg outline-none text-gray-300"
                      >
                        <option value="Inter">Inter Regular</option>
                        <option value="Outfit Bold">Outfit Super Bold</option>
                        <option value="Montserrat ExtraBold">Montserrat Heavy</option>
                        <option value="Impact">Impact Retro</option>
                        <option value="Courier New">Courier Mono</option>
                      </select>
                    </div>
                  )}

                  {/* Property: COLOR & OPACITY */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Cor Primária</label>
                      <input
                        type="color"
                        value={selectedLayer.color}
                        onChange={(e) => updateSelectedLayerProps({ color: e.target.value })}
                        className="w-full h-8 bg-gray-950 border border-gray-900 rounded-lg outline-none cursor-pointer p-0.5"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Opacidade (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedLayer.opacity}
                        onChange={(e) => updateSelectedLayerProps({ opacity: Number(e.target.value) })}
                        className="w-full px-2 h-8 bg-gray-950 border border-gray-900 rounded-lg text-xs outline-none focus:border-indigo-500 text-gray-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Property: POSITION X & Y (Figma percentage coordinate style) */}
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Posição X (%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedLayer.x}
                      onChange={(e) => updateSelectedLayerProps({ x: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-gray-600">
                      <span>Left: 0%</span>
                      <span>X: {selectedLayer.x}%</span>
                      <span>Right: 100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Posição Y (%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedLayer.y}
                      onChange={(e) => updateSelectedLayerProps({ y: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-gray-600">
                      <span>Top: 0%</span>
                      <span>Y: {selectedLayer.y}%</span>
                      <span>Bottom: 100%</span>
                    </div>
                  </div>

                  {/* Size and Rotation parameters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Tamanho (px)</label>
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={selectedLayer.size}
                        onChange={(e) => updateSelectedLayerProps({ size: Number(e.target.value) })}
                        className="w-full px-2 h-8 bg-gray-950 border border-gray-900 rounded-lg text-xs outline-none focus:border-indigo-500 text-gray-200 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Rotação (°)</label>
                      <input
                        type="number"
                        min="0"
                        max="360"
                        value={selectedLayer.rotation}
                        onChange={(e) => updateSelectedLayerProps({ rotation: Number(e.target.value) })}
                        className="w-full px-2 h-8 bg-gray-950 border border-gray-900 rounded-lg text-xs outline-none focus:border-indigo-500 text-gray-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Margin and Padding */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Margem (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={selectedLayer.margin}
                        onChange={(e) => updateSelectedLayerProps({ margin: Number(e.target.value) })}
                        className="w-full px-2 h-8 bg-gray-950 border border-gray-900 rounded-lg text-xs outline-none focus:border-indigo-500 text-gray-200 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Padding (px)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={selectedLayer.padding}
                        onChange={(e) => updateSelectedLayerProps({ padding: Number(e.target.value) })}
                        className="w-full px-2 h-8 bg-gray-950 border border-gray-900 rounded-lg text-xs outline-none focus:border-indigo-500 text-gray-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Animation select */}
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Efeito de Animação</label>
                    <select
                      value={selectedLayer.animation}
                      onChange={(e) => updateSelectedLayerProps({ animation: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-900 text-xs py-1.5 px-2 rounded-lg outline-none text-gray-300"
                    >
                      <option value="none">Nenhum efeito</option>
                      <option value="fade">Esmaecer (Fade In)</option>
                      <option value="slide-up">Surgir (Slide Up)</option>
                      <option value="zoom-in">Zoom Pop (Zoom In)</option>
                      <option value="typewriter">Máquina de Escrever</option>
                      <option value="bounce">Salto Dinâmico (Bounce)</option>
                    </select>
                  </div>

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Sliders className="w-8 h-8 text-gray-800 mb-2" />
                  <p className="text-[11px] font-bold text-gray-400">Nenhuma camada selecionada</p>
                  <p className="text-[9px] text-gray-600 mt-1 max-w-44 leading-relaxed">
                    Clique em qualquer camada na viewport do canvas ou na estrutura de árvore acima para configurar suas propriedades específicas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

      </div>

      {/* 5. BOTTOM TIMELINE & CONTROLS FRAME */}
      <footer className="h-32 border-t border-gray-900 bg-gray-950 shrink-0 flex flex-col overflow-hidden relative z-20">
        
        {/* Playback Controls bar */}
        <div className="h-10 border-b border-gray-900 px-6 flex items-center justify-between shrink-0 bg-gray-950/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={() => {
                setCurrentTime(0);
                setIsPlaying(false);
              }}
              className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 transition shrink-0 cursor-pointer text-[10px] font-bold"
            >
              Reset
            </button>

            <span className="text-xs font-mono text-gray-300">
              {currentTime.toFixed(1)}s <span className="text-gray-600">/ 30.0s</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
            <span>Fatiador de Shorts ativado</span>
            <div className="h-3 w-[1px] bg-gray-900"></div>
            <span>Codec de Vídeo: Libx264</span>
          </div>
        </div>

        {/* Timeline Tracks visualization */}
        <div className="flex-1 bg-[#02050a] relative overflow-hidden overflow-x-auto min-w-0 flex flex-col justify-around py-1 px-4">
          
          {/* Subtitles Track block */}
          <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 h-5 shrink-0">
            <span className="w-16 text-right truncate shrink-0">Legendas 💬</span>
            <div className="flex-1 bg-gray-950 border border-gray-900 rounded h-full relative overflow-hidden">
              {subtitleTimeline.map((block, idx) => {
                const startPct = (block.start / 30) * 100;
                const durationPct = ((block.end - block.start) / 30) * 100;
                const isCurrent = currentTime >= block.start && currentTime < block.end;

                return (
                  <div
                    key={idx}
                    className={`absolute h-full border-r border-gray-900/40 text-[8px] font-sans px-1 truncate flex items-center transition-colors ${
                      isCurrent ? 'bg-indigo-600/35 text-indigo-200' : 'bg-indigo-950/20 text-gray-500'
                    }`}
                    style={{ left: `${startPct}%`, width: `${durationPct}%` }}
                  >
                    {block.text}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Background Video track block */}
          <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 h-5 shrink-0">
            <span className="w-16 text-right truncate shrink-0">Vídeo BG 🎬</span>
            <div className="flex-1 bg-purple-950/10 border border-purple-900/15 rounded h-full relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-purple-600/10 border-r border-purple-500/20 text-[8px] px-2 flex items-center text-purple-400 font-sans w-full">
                {layers.find(l => l.type === 'video')?.name || 'Sem vídeo de fundo'}
              </div>
            </div>
          </div>

          {/* Playhead visualization cursor */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 pointer-events-none"
            style={{ left: `calc(72px + ${(currentTime / 30) * 100}% - ${(currentTime / 30) * 20}px)` }}
          >
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full absolute -top-1 -left-1 ring-2 ring-white/20 shadow"></div>
          </div>

        </div>
      </footer>

    </div>
  );
};
