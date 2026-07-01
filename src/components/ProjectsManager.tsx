/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { AspectRatio, Template, Project } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  X,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Search,
  Sliders,
  Check,
  Download,
  FileText,
  UploadCloud,
  Video,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Layers,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileArchive,
  ArrowUp,
  ArrowDown,
  Eye,
  Settings,
  HelpCircle
} from 'lucide-react';

interface BatchVideo {
  id: string;
  name: string;
  fileSize: string;
  duration: string;
  videoUrl: string;
  thumbnail: string;
  headline: string;
  subheadline: string;
  cta: string;
  instagram: string;
  logo: string;
  watermark: string;
  captions: string;
  status: 'pending' | 'ready' | 'rendering' | 'completed' | 'failed';
  progress: number;
}

export const ProjectsManager: React.FC = () => {
  const {
    templates,
    createProject,
    showToast,
    verifyAndTriggerLimitExceeded
  } = useApp();

  // Wizard state: select-template -> upload-media -> preview-gallery -> render-queue
  const [step, setStep] = useState<'select-template' | 'upload-media' | 'preview-gallery' | 'render-queue'>('select-template');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Bulk Videos list state
  const [batchVideos, setBatchVideos] = useState<BatchVideo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // CSV State
  const [csvFile, setCsvFile] = useState<string | null>(null);
  const [csvRowsCount, setCsvRowsCount] = useState(0);

  // Lazy loading & gallery pagination
  const [visibleCount, setVisibleCount] = useState(12);

  // Individual Editor Modal State
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);
  const [editHeadline, setEditHeadline] = useState('');
  const [editSubheadline, setEditSubheadline] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');

  // Queue state simulation
  const [queueStatus, setQueueStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [queueProgress, setQueueProgress] = useState(0);
  const [queueSpeed, setQueueSpeed] = useState('0 fps');
  const [queueETA, setQueueETA] = useState('--:--');
  const [queueTasks, setQueueTasks] = useState<BatchVideo[]>([]);
  const renderIntervalRef = useRef<number | null>(null);

  // Search templates
  const [templateSearch, setTemplateSearch] = useState('');

  // Check for preselected template from the template library
  useEffect(() => {
    const preselectedId = localStorage.getItem('vf_batch_template_preselect');
    if (preselectedId) {
      const found = templates.find(t => t.id === preselectedId);
      if (found) {
        setSelectedTemplate(found);
        setStep('upload-media');
        localStorage.removeItem('vf_batch_template_preselect');
        showToast(`Template "${found.name}" pré-selecionado!`, 'success');
      }
    }
  }, [templates]);

  // Handle template choice
  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setStep('upload-media');
    showToast(`Template "${template.name}" selecionado!`, 'success');
  };

  // Preset stock video footages to populate simulation
  const FOOTAGE_PRESETS = [
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-gaming-streamer-screen-playing-with-headphones-40439-large.mp4', thumb: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200&fit=crop', name: 'gameplay_parkour_minecraft.mp4' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-epic-sunset-above-mountains-and-clouds-42453-large.mp4', thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=200&fit=crop', name: 'sunset_cinematic_landscape.mp4' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-top-aerial-shot-of-seashore-with-waves-43187-large.mp4', thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=200&fit=crop', name: 'beach_drone_topdown.mp4' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-vegetables-chopping-on-board-48356-large.mp4', thumb: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=200&fit=crop', name: 'chef_cooking_veggies.mp4' },
    { url: 'https://assets.mixkit.co/videos/preview/mixkit-white-cat-sleeping-cozily-on-a-fluffy-blanket-51921-large.mp4', thumb: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=200&fit=crop', name: 'satisfying_sleeping_cat.mp4' }
  ];

  // Bulk Videos Loader Simulation
  const simulateBulkUpload = (amount: number) => {
    if (!verifyAndTriggerLimitExceeded('projects')) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Generate simulated videos
          const newVideos: BatchVideo[] = [];
          for (let i = 1; i <= amount; i++) {
            const footage = FOOTAGE_PRESETS[(i - 1) % FOOTAGE_PRESETS.length];
            newVideos.push({
              id: `bvid-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
              name: `${i.toString().padStart(3, '0')}_${footage.name}`,
              fileSize: `${(Math.random() * 8 + 4).toFixed(1)} MB`,
              duration: '0:30',
              videoUrl: footage.url,
              thumbnail: footage.thumb,
              headline: `ACHADINHO IMPERDÍVEL #${i.toString().padStart(2, '0')}`,
              subheadline: 'O melhor preço garantido da Shopee!',
              cta: 'LINK DA BIO PARA COMPRAR 🛍️',
              instagram: '@achadinhos_viral',
              logo: 'watermark.png',
              watermark: 'ViralFactory',
              captions: 'Legendas geradas com IA...',
              status: 'ready',
              progress: 0
            });
          }

          setBatchVideos([...batchVideos, ...newVideos]);
          setIsUploading(false);
          setUploadProgress(0);
          showToast(`Lote com ${amount} vídeos carregados com sucesso!`, 'success');
          return 0;
        }
        return prev + 25;
      });
    }, 150);
  };

  // Remove video from batch
  const removeVideo = (id: string) => {
    setBatchVideos(batchVideos.filter(v => v.id !== id));
    showToast('Vídeo removido do lote.', 'info');
  };

  // Move video order
  const moveVideo = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === batchVideos.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...batchVideos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setBatchVideos(updated);
  };

  // Generate Sample CSV
  const importSampleCSV = () => {
    if (batchVideos.length === 0) {
      showToast('Adicione vídeos ao lote antes de importar o CSV!', 'warning');
      return;
    }

    // Dynamic high-fidelity csv mapping
    const parsedRows = batchVideos.map((video, index) => {
      const idx = index + 1;
      return {
        ...video,
        headline: `PRODUTO VIRAL NÚMERO #${idx}`,
        subheadline: `Esse achadinho vai transformar seu dia! 🔥`,
        cta: `LINK NOS COMENTÁRIOS COM DESCONTO! 🏷️`,
        instagram: `@achados_shopee_${idx}`
      };
    });

    setBatchVideos(parsedRows);
    setCsvFile('achadinhos_shopee_automacao.csv');
    setCsvRowsCount(parsedRows.length);
    showToast(`CSV Inteligente mapeado! ${parsedRows.length} linhas associadas.`, 'success');
  };

  // Open Individual Editor for single video inside the batch
  const openIndividualEditor = (index: number) => {
    const video = batchVideos[index];
    setEditingVideoIndex(index);
    setEditHeadline(video.headline);
    setEditSubheadline(video.subheadline);
    setEditCta(video.cta);
    setEditInstagram(video.instagram);
    setEditLogo(video.logo);
    setEditVideoUrl(video.videoUrl);
  };

  const saveIndividualChanges = () => {
    if (editingVideoIndex === null) return;
    
    const updated = [...batchVideos];
    updated[editingVideoIndex] = {
      ...updated[editingVideoIndex],
      headline: editHeadline,
      subheadline: editSubheadline,
      cta: editCta,
      instagram: editInstagram,
      logo: editLogo,
      videoUrl: editVideoUrl,
      // Find thumb corresponding to newly chosen video if changed
      thumbnail: FOOTAGE_PRESETS.find(f => f.url === editVideoUrl)?.thumb || updated[editingVideoIndex].thumbnail
    };

    setBatchVideos(updated);
    setEditingVideoIndex(null);
    showToast('Alterações salvas no lote com sucesso!', 'success');
  };

  // Duplicar video in preview gallery
  const duplicateVideo = (index: number) => {
    const source = batchVideos[index];
    const clone: BatchVideo = {
      ...source,
      id: `bvid-clone-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${source.name} (Cópia)`
    };

    const updated = [...batchVideos];
    updated.splice(index + 1, 0, clone);
    setBatchVideos(updated);
    showToast('Vídeo duplicado no lote!', 'success');
  };

  // Parallel Queue Render Simulation
  const startBatchRendering = () => {
    if (batchVideos.length === 0) return;

    setStep('render-queue');
    setQueueStatus('running');
    setQueueTasks(batchVideos.map(v => ({ ...v, status: 'pending', progress: 0 })));
    setQueueProgress(0);

    let activeIndices = [0, 1, 2].filter(i => i < batchVideos.length);
    let nextIndex = activeIndices.length;
    let completedCount = 0;

    const interval = window.setInterval(() => {
      setQueueTasks((prevTasks) => {
        let isAllDone = true;
        let runningCount = 0;

        const updated = prevTasks.map((task, idx) => {
          if (activeIndices.includes(idx)) {
            if (task.status === 'pending') {
              runningCount++;
              return { ...task, status: 'rendering', progress: 10 };
            } else if (task.status === 'rendering') {
              runningCount++;
              const nextProg = task.progress + Math.floor(Math.random() * 20 + 10);
              if (nextProg >= 100) {
                completedCount++;
                // Free up this slot and assign the next video in queue
                activeIndices = activeIndices.filter(i => i !== idx);
                if (nextIndex < prevTasks.length) {
                  activeIndices.push(nextIndex);
                  nextIndex++;
                }
                return { ...task, status: 'completed', progress: 100 };
              }
              return { ...task, progress: nextProg };
            }
          }
          if (task.status !== 'completed') {
            isAllDone = false;
          }
          return task;
        });

        // Overall progress calculations
        const totalProgress = Math.round((updated.reduce((acc, t) => acc + t.progress, 0) / (prevTasks.length * 100)) * 100);
        setQueueProgress(totalProgress);

        // Simulation parameters
        setQueueSpeed(`${(Math.random() * 10 + 12).toFixed(1)}x / ${Math.floor(Math.random() * 60 + 220)} fps`);
        
        const remaining = prevTasks.length - completedCount;
        if (remaining > 0) {
          const etaSecs = Math.max(1, Math.round(remaining * 2.5));
          const mins = Math.floor(etaSecs / 60);
          const secs = etaSecs % 60;
          setQueueETA(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        } else {
          setQueueETA('00:00');
        }

        if (isAllDone || activeIndices.length === 0) {
          clearInterval(interval);
          setQueueStatus('completed');
          showToast('Lote de vídeos renderizado com sucesso!', 'success');
        }

        return updated;
      });
    }, 400);

    renderIntervalRef.current = interval;
  };

  useEffect(() => {
    return () => {
      if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
    };
  }, []);

  const pauseQueue = () => {
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }
    setQueueStatus('paused');
    showToast('Fila de renderização pausada.', 'info');
  };

  const resumeQueue = () => {
    setQueueStatus('running');
    startBatchRendering();
  };

  const cancelQueue = () => {
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }
    setQueueStatus('idle');
    setStep('preview-gallery');
    showToast('Renderização cancelada.', 'error');
  };

  // Simulate ZIP batch download
  const handleZipDownload = () => {
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', `lote_viral_factory_${batchVideos.length}_videos.zip`);
    document.body.appendChild(link);
    
    showToast('Compactando lote em ZIP premium...', 'info');
    setTimeout(() => {
      showToast('Baixando lote ZIP (lote_viral_factory.zip)!', 'success');
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Step Navigator Status Bar */}
      <div className="bg-gray-950 border border-gray-900 rounded-3xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">WF</span>
            <div>
              <h2 className="text-sm font-bold text-white">Fábrica de Lotes</h2>
              <p className="text-[10px] text-gray-500 font-mono">Status: {step.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Wizard step bullets */}
        <div className="flex items-center gap-3.5 hidden md:flex">
          {[
            { s: 'select-template', label: '1. Template' },
            { s: 'upload-media', label: '2. Upload Mídia' },
            { s: 'preview-gallery', label: '3. Pré-visualização' },
            { s: 'render-queue', label: '4. Renderização' }
          ].map((item, idx) => {
            const isActive = step === item.s;
            const isCompleted = idx < ['select-template', 'upload-media', 'preview-gallery', 'render-queue'].indexOf(step);
            return (
              <div key={item.s} className="flex items-center gap-2.5">
                <span className={`text-xs font-bold transition-all duration-200 ${isActive ? 'text-indigo-400' : isCompleted ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {item.label}
                </span>
                {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-gray-800" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: SELECT TEMPLATE */}
      {step === 'select-template' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Passo 1: Selecione a Estrutura do Template</h3>
              <p className="text-xs text-gray-400">Escolha a estrutura de canais dinâmicos que servirá de esqueleto para o seu lote.</p>
            </div>
            <div className="relative w-64">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Filtrar estruturas..."
                className="w-full bg-gray-900 border border-gray-850 pl-9 pr-4 py-2 rounded-xl text-xs text-gray-300 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {templates
              .filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
              .map((template) => (
                <div
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className="group bg-gray-950 border border-gray-900 rounded-2xl overflow-hidden hover:border-indigo-500/40 cursor-pointer transition duration-300 flex flex-col justify-between"
                >
                  <div className="relative aspect-[9/16] max-h-[220px] bg-gray-900 overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-950/10" />
                    {/* Visual mockup thumbnail representation */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center mb-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-950 border border-gray-900 text-gray-300">
                        {template.aspect}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition">{template.name}</h4>
                    <p className="text-[10px] text-gray-500 line-clamp-2 h-7 leading-relaxed">{template.description}</p>
                    <div className="flex items-center justify-between text-[9px] text-gray-600 pt-1.5 border-t border-gray-900/40">
                      <span>{template.layers ? template.layers.length : 3} Zonas Dinâmicas</span>
                      <span>{template.defaultDuration}s</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* STEP 2: UPLOAD BULK VIDEOS AND OPTIONAL CSV */}
      {step === 'upload-media' && selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Selected template summary column */}
          <div className="space-y-4">
            <div className="bg-gray-950 border border-gray-900 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-900/60">
                <button
                  onClick={() => setStep('select-template')}
                  className="p-1.5 hover:bg-gray-900 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-white">Template Escolhido</span>
              </div>

              <div className="relative aspect-[9/16] max-h-[160px] bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center">
                <span className="text-[10px] font-mono font-bold px-2 py-1 bg-indigo-950 border border-indigo-900 rounded-lg text-indigo-400">
                  {selectedTemplate.aspect}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white">{selectedTemplate.name}</h4>
                <p className="text-[10px] text-gray-500 leading-relaxed mt-1">{selectedTemplate.description}</p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-gray-900/60">
                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider block">Zonas Mapeadas para Preenchimento:</span>
                <div className="flex flex-wrap gap-1">
                  {(selectedTemplate.layers || []).map((layer: any) => (
                    <span key={layer.id} className="text-[8px] font-bold text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-950/40 border border-indigo-900/20">
                      {layer.defaultValue || `{{${layer.type.toUpperCase()}}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upload panel column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-950 border border-gray-900 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Passo 2: Upload de Vídeos de Fundo (Em Massa)</h3>
                <p className="text-xs text-gray-400 mt-1">Insira os clipes de vídeo que servirão de fundo para cada elemento dinâmico no lote.</p>
              </div>

              {/* Simulation triggers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[10, 50, 100, 500].map((num) => (
                  <button
                    key={num}
                    onClick={() => simulateBulkUpload(num)}
                    className="flex flex-col items-center justify-center py-4 bg-gray-900 hover:bg-gray-850 hover:border-indigo-500/40 border border-gray-850 rounded-xl text-center cursor-pointer transition group"
                  >
                    <span className="text-xs font-black text-white group-hover:text-indigo-400 transition">{num} Vídeos</span>
                    <span className="text-[8px] font-mono text-gray-500 mt-1 uppercase tracking-wider">Simular Lote</span>
                  </button>
                ))}
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-gray-900 hover:border-indigo-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-gray-900/10 hover:bg-gray-900/20 transition">
                <UploadCloud className="w-8 h-8 text-indigo-400" />
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-300">Arraste centenas de arquivos de uma vez</p>
                  <p className="text-[10px] text-gray-500 mt-1">Carregue até 1000 vídeos MP4, WebM (Resolução recomendada 9:16)</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={() => simulateBulkUpload(25)}
                  className="hidden"
                />
              </label>

              {/* Local Upload state */}
              {isUploading && (
                <div className="bg-gray-900 rounded-xl p-4 border border-indigo-950/40 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300">Carregando lote e processando metadados...</span>
                    <span className="text-indigo-400 font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* CSV Upload Section (Optional but powerful) */}
              <div className="border-t border-gray-900/60 pt-6 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Planilha CSV Inteligente (Opcional)</h4>
                  <p className="text-[11px] text-gray-500">Insira um arquivo CSV para preencher instantaneamente as colunas de Headline, CTA e Instagram de cada vídeo correspondente.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={importSampleCSV}
                    className="flex items-center gap-1.5 py-2 px-4 bg-gray-900 hover:bg-gray-850 text-gray-200 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mapear CSV Demonstrativo</span>
                  </button>

                  {csvFile && (
                    <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-emerald-950/20 border border-emerald-900/20 text-emerald-400 text-[10px] font-mono">
                      <Check className="w-3.5 h-3.5" />
                      <span>{csvFile} ({csvRowsCount} linhas)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Videos loaded recap area */}
              {batchVideos.length > 0 && (
                <div className="border-t border-gray-900/60 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{batchVideos.length} Vídeos no lote atual</span>
                    <button
                      onClick={() => setBatchVideos([])}
                      className="text-[10px] text-red-400 font-bold hover:underline cursor-pointer"
                    >
                      Remover todos
                    </button>
                  </div>

                  {/* Horizontal visual cards array of videos */}
                  <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                    {batchVideos.slice(0, 50).map((video, index) => (
                      <div key={video.id} className="flex items-center justify-between p-2.5 bg-gray-900/60 border border-gray-850 rounded-xl hover:border-gray-800 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={video.thumbnail} alt="thumb" className="w-12 h-12 object-cover rounded-lg border border-gray-800" referrerPolicy="no-referrer" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-gray-300 truncate">{video.name}</p>
                            <span className="text-[9px] text-gray-500 font-mono">Tamanho: {video.fileSize} | Duração: {video.duration}</span>
                          </div>
                        </div>

                        {/* Position control tags */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <button onClick={() => moveVideo(index, 'up')} className="p-0.5 hover:bg-gray-800 rounded text-gray-500 hover:text-white cursor-pointer"><ArrowUp className="w-3 h-3" /></button>
                            <button onClick={() => moveVideo(index, 'down')} className="p-0.5 hover:bg-gray-800 rounded text-gray-500 hover:text-white cursor-pointer"><ArrowDown className="w-3 h-3" /></button>
                          </div>
                          <button
                            onClick={() => removeVideo(video.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {batchVideos.length > 50 && (
                      <p className="text-center text-[10px] text-gray-500 font-mono py-1">E outros {batchVideos.length - 50} vídeos...</p>
                    )}
                  </div>

                  <button
                    onClick={() => setStep('preview-gallery')}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/15 cursor-pointer"
                  >
                    <span>Ir para Pré-visualização</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW GALLERY */}
      {step === 'preview-gallery' && selectedTemplate && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('upload-media')}
                  className="p-1.5 hover:bg-gray-900 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-bold text-white">Passo 3: Pré-visualização do Lote</h3>
              </div>
              <p className="text-xs text-gray-400">Examine o lote de vídeos montados dinamicamente com seu template aplicado. Edite individualmente se necessário.</p>
            </div>

            <button
              onClick={startBatchRendering}
              className="flex items-center gap-1.5 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/15 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-bounce" />
              <span>Iniciar Renderização em Lote</span>
            </button>
          </div>

          {/* Grid with lazy loading limits */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {batchVideos.slice(0, visibleCount).map((video, index) => (
              <div
                key={video.id}
                className="group bg-gray-950 border border-gray-900 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-gray-850 transition duration-300"
              >
                {/* Simulated Applied template visual cards (Canva style) */}
                <div className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
                  <img src={video.thumbnail} alt="thumb" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  
                  {/* Canva static design backdrop template mockup layer */}
                  <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                  {/* Overlaid dynamic texts */}
                  <div className="absolute inset-x-2 top-3 text-center pointer-events-none">
                    <span className="inline-block bg-black/60 backdrop-blur-sm border border-gray-800 text-white text-[7px] font-bold px-1.5 py-0.5 rounded uppercase max-w-[95%] truncate leading-tight">
                      {video.headline}
                    </span>
                  </div>

                  <div className="absolute inset-x-2 bottom-3 text-center pointer-events-none">
                    <span className="inline-block bg-indigo-950/85 backdrop-blur-sm border border-indigo-900 text-yellow-400 text-[6px] font-black px-1.5 py-0.5 rounded uppercase max-w-[95%] truncate leading-tight">
                      {video.cta}
                    </span>
                  </div>

                  {/* Bottom Instagram handle */}
                  <div className="absolute bottom-1 right-2 pointer-events-none">
                    <span className="text-[5px] text-gray-400 font-mono">{video.instagram}</span>
                  </div>
                </div>

                {/* Card metadata and edits */}
                <div className="p-3 bg-gray-950 border-t border-gray-900/40 space-y-2.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-300 truncate">{video.name}</p>
                    <span className="text-[8px] text-gray-500 font-mono">Pronto para render</span>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => openIndividualEditor(index)}
                      className="flex-1 py-1 px-2 bg-gray-900 hover:bg-gray-850 hover:text-indigo-400 rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-gray-850"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => duplicateVideo(index)}
                      className="p-1.5 bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white rounded-lg transition cursor-pointer border border-gray-850"
                      title="Duplicar"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => removeVideo(video.id)}
                      className="p-1.5 bg-gray-900 hover:bg-gray-850 text-gray-500 hover:text-red-400 rounded-lg transition cursor-pointer border border-gray-850"
                      title="Remover"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Lazy Loading pagination button */}
          {batchVideos.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 12)}
                className="py-2.5 px-6 bg-gray-900 hover:bg-gray-850 text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer border border-gray-800"
              >
                Carregar mais vídeos ({batchVideos.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: RENDER QUEUE */}
      {step === 'render-queue' && selectedTemplate && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gray-950 border border-gray-900 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-3 flex-1">
              <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-900 uppercase tracking-widest inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Fila Ativa do Servidor
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">Renderizando Lote...</h2>
              
              {/* Overall Progress */}
              <div className="space-y-1.5 max-w-md">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-gray-400">Progresso Geral:</span>
                  <span className="text-indigo-400">{queueProgress}%</span>
                </div>
                <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-850">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-300" style={{ width: `${queueProgress}%` }} />
                </div>
              </div>
            </div>

            {/* Performance metrics display */}
            <div className="flex flex-wrap gap-4 bg-gray-900/60 p-4 rounded-2xl border border-gray-850">
              <div className="px-3">
                <span className="text-[9px] font-mono text-gray-500 block uppercase">Tempo Estimado</span>
                <span className="text-sm font-black font-mono text-white mt-0.5">{queueETA}</span>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div className="px-3">
                <span className="text-[9px] font-mono text-gray-500 block uppercase">Velocidade</span>
                <span className="text-sm font-black font-mono text-indigo-400 mt-0.5">{queueSpeed}</span>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div className="px-3">
                <span className="text-[9px] font-mono text-gray-500 block uppercase">Faltantes</span>
                <span className="text-sm font-black font-mono text-white mt-0.5">
                  {queueTasks.filter(t => t.status !== 'completed').length} / {queueTasks.length}
                </span>
              </div>
            </div>

            {/* Render controls */}
            <div className="flex items-center gap-2">
              {queueStatus === 'running' ? (
                <button
                  onClick={pauseQueue}
                  className="flex items-center gap-1.5 py-2.5 px-4 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded-xl text-xs font-bold transition cursor-pointer border border-amber-900/20"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar</span>
                </button>
              ) : queueStatus === 'paused' ? (
                <button
                  onClick={resumeQueue}
                  className="flex items-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Retomar</span>
                </button>
              ) : null}

              <button
                onClick={cancelQueue}
                className="flex items-center gap-1.5 py-2.5 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-xs font-bold transition cursor-pointer border border-red-900/20"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            </div>
          </div>

          {/* List of queue items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queueTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3.5 bg-gray-950 border rounded-xl flex items-center justify-between transition-all duration-300 ${task.status === 'completed' ? 'border-emerald-500/20 bg-emerald-950/5' : task.status === 'rendering' ? 'border-indigo-500/30' : 'border-gray-900'}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={task.thumbnail} alt="thumb" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {task.status === 'rendering' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center pr-2">
                      <p className="text-[10px] font-bold text-gray-300 truncate">{task.name}</p>
                      <span className="text-[8px] font-mono font-bold text-gray-500">{task.progress}%</span>
                    </div>

                    <div className="w-full bg-gray-900 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${task.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pl-3 flex-shrink-0">
                  {task.status === 'completed' ? (
                    <span className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-900 text-emerald-400 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : task.status === 'rendering' ? (
                    <span className="text-[9px] font-mono font-bold text-indigo-400 animate-pulse uppercase">Criando</span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-gray-600 uppercase">Fila</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Finished view actions */}
          {queueStatus === 'completed' && (
            <div className="bg-gray-950 border border-emerald-950/40 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-emerald-950/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-900 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Todos os {queueTasks.length} vídeos renderizados com sucesso!</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Sua fábrica concluiu o processamento e o download em massa está liberado.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleZipDownload}
                  className="flex items-center gap-1.5 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/15 cursor-pointer"
                >
                  <FileArchive className="w-4 h-4 animate-bounce" />
                  <span>Baixar Lote ZIP</span>
                </button>

                <button
                  onClick={() => {
                    setStep('preview-gallery');
                    setQueueStatus('idle');
                  }}
                  className="py-3 px-6 bg-gray-900 hover:bg-gray-850 text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer border border-gray-800"
                >
                  Voltar ao lote
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INDIVIDUAL EDITOR MODAL (POPUP) */}
      <AnimatePresence>
        {editingVideoIndex !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-950 border border-gray-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl"
            >
              <div className="h-14 border-b border-gray-900/60 px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Editor Individual: Vídeo #{editingVideoIndex + 1}</span>
                </div>
                <button
                  onClick={() => setEditingVideoIndex(null)}
                  className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-900 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form and Preview splits */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[480px] overflow-y-auto">
                {/* Custom input fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Headline</label>
                    <input
                      type="text"
                      value={editHeadline}
                      onChange={(e) => setEditHeadline(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Subheadline</label>
                    <input
                      type="text"
                      value={editSubheadline}
                      onChange={(e) => setEditSubheadline(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Chamada de Ação (CTA)</label>
                    <input
                      type="text"
                      value={editCta}
                      onChange={(e) => setEditCta(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Instagram</label>
                    <input
                      type="text"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Clipe de Vídeo de Fundo</label>
                    <select
                      value={editVideoUrl}
                      onChange={(e) => setEditVideoUrl(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {FOOTAGE_PRESETS.map((footage, idx) => (
                        <option key={idx} value={footage.url}>{footage.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Individual Canva simulated card preview */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-2">Simulação de Render</span>
                  
                  <div className="relative aspect-[9/16] h-[280px] rounded-xl overflow-hidden bg-gray-950 border border-gray-900 shadow-xl">
                    <img
                      src={FOOTAGE_PRESETS.find(f => f.url === editVideoUrl)?.thumb || batchVideos[editingVideoIndex].thumbnail}
                      alt="fundo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                    <div className="absolute inset-x-2 top-3 text-center">
                      <span className="inline-block bg-black/60 backdrop-blur-sm border border-gray-800 text-white text-[7px] font-bold px-1.5 py-0.5 rounded uppercase max-w-[95%] truncate leading-tight">
                        {editHeadline}
                      </span>
                    </div>

                    <div className="absolute inset-x-2 bottom-3 text-center">
                      <span className="inline-block bg-indigo-950/85 backdrop-blur-sm border border-indigo-900 text-yellow-400 text-[6px] font-black px-1.5 py-0.5 rounded uppercase max-w-[95%] truncate leading-tight">
                        {editCta}
                      </span>
                    </div>

                    <div className="absolute bottom-1 right-2">
                      <span className="text-[5px] text-gray-400 font-mono">{editInstagram}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="h-16 border-t border-gray-900/60 px-6 flex items-center justify-end gap-2.5 bg-gray-900/20">
                <button
                  onClick={() => setEditingVideoIndex(null)}
                  className="py-2 px-4 hover:bg-gray-900 rounded-xl text-xs font-bold transition text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveIndividualChanges}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-indigo-600/15"
                >
                  Salvar no Lote
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
