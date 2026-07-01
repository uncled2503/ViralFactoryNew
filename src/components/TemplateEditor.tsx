/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AspectRatio, Template } from '../types';
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Type,
  Video as VideoIcon,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  Save,
  Instagram,
  Check,
  RotateCw,
  HelpCircle,
  Eye,
  Settings,
  Grid,
  ChevronRight,
  Maximize2,
  Lock,
  Unlock,
  Type as FontIcon,
  MousePointer,
  Paintbrush
} from 'lucide-react';

interface TemplateEditorProps {
  template: Template;
  onClose: () => void;
  onSave: (updatedTemplate: Template) => void;
}

// Hardcoded sample templates/mock background options for quick generation
const BACKGROUND_PRESETS = [
  { name: 'Achadinhos Shopee', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=600&fit=crop' },
  { name: 'Curiosidades Curiosas', url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=600&fit=crop' },
  { name: 'Notícias Rápidas', url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=600&fit=crop' },
  { name: 'Motivacional Dark', url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=600&fit=crop' },
  { name: 'Receitas Deliciosas', url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=600&fit=crop' }
];

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onClose, onSave }) => {
  const { showToast } = useApp();

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [aspect, setAspect] = useState<AspectRatio>(template.aspect);
  const [duration, setDuration] = useState(template.defaultDuration || 30);

  // Background state
  const [backgroundType, setBackgroundType] = useState<'upload' | 'preset'>('preset');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(
    (template as any).backgroundImageUrl || BACKGROUND_PRESETS[0].url
  );
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Zones state (cast layers as any to handle customizable fields)
  const [zones, setZones] = useState<any[]>(() => {
    if (template.layers && template.layers.length > 0 && (template.layers[0] as any).x !== undefined) {
      return template.layers;
    }
    // Default zones preset for a blank layout
    return [
      {
        id: 'zone-bg-video',
        type: 'video',
        name: 'Área de Vídeo Principal',
        defaultValue: '{{VIDEO}}',
        x: 10,
        y: 25,
        width: 80,
        height: 50,
        rotation: 0,
        opacity: 100,
        borderWidth: 2,
        borderColor: '#6366f1',
        radius: 12,
        crop: 'fill',
        objectFit: 'cover'
      },
      {
        id: 'zone-headline',
        type: 'headline',
        name: 'Headline Superior',
        defaultValue: '{{HEADLINE}}',
        x: 10,
        y: 8,
        width: 80,
        height: 12,
        rotation: 0,
        opacity: 100,
        font: 'Space Grotesk',
        color: '#ffffff',
        size: 28,
        align: 'center',
        weight: 'bold',
        spacing: 0,
        shadowEnabled: true,
        shadowColor: '#000000',
        outlineEnabled: true,
        outlineColor: '#000000',
        outlineWidth: 2,
        uppercase: true,
        lineHeight: 1.2,
        padding: 4,
        radius: 8
      },
      {
        id: 'zone-cta',
        type: 'cta',
        name: 'Chamada de Ação (CTA)',
        defaultValue: '{{CTA}}',
        x: 15,
        y: 80,
        width: 70,
        height: 10,
        rotation: 0,
        opacity: 100,
        font: 'Inter',
        color: '#f59e0b',
        size: 24,
        align: 'center',
        weight: 'extra-bold',
        spacing: 1,
        shadowEnabled: true,
        shadowColor: '#000000',
        uppercase: true,
        lineHeight: 1.2,
        padding: 6,
        radius: 8
      }
    ];
  });

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(zones[0]?.id || null);
  const selectedZone = zones.find(z => z.id === selectedZoneId);

  // Drag & Resize Canvas Interactions State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoneStartCoords, setZoneStartCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Handle preset selector
  const handlePresetSelect = (url: string) => {
    setBackgroundImageUrl(url);
    showToast('Plano de fundo selecionado!', 'success');
  };

  // Simulate Canva background image upload
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 10;
        if (prev >= 100) {
          clearInterval(interval);
          setBackgroundImageUrl(URL.createObjectURL(file));
          setUploadProgress(null);
          showToast('Template de fundo carregado com sucesso!', 'success');
          return null;
        }
        return prev + 30;
      });
    }, 150);
  };

  // Add Dynamic Zone
  const addZone = (type: string) => {
    const id = `zone-${type}-${Date.now()}`;
    let newZone: any = {
      id,
      type,
      name: `Nova Zona (${type})`,
      defaultValue: `{{${type.toUpperCase()}}}`,
      x: 20,
      y: 40,
      width: 60,
      height: 12,
      rotation: 0,
      opacity: 100
    };

    // Style customizations based on zone type
    if (type === 'video') {
      newZone.width = 60;
      newZone.height = 35;
      newZone.borderWidth = 2;
      newZone.borderColor = '#3b82f6';
      newZone.radius = 8;
      newZone.crop = 'fill';
      newZone.objectFit = 'cover';
    } else if (['headline', 'subheadline', 'cta', 'instagram', 'watermark', 'captions', 'freeText'].includes(type)) {
      newZone.font = 'Inter';
      newZone.color = type === 'cta' ? '#f59e0b' : type === 'instagram' ? '#ec4899' : '#ffffff';
      newZone.size = type === 'headline' ? 28 : type === 'cta' ? 24 : 18;
      newZone.align = 'center';
      newZone.weight = 'bold';
      newZone.spacing = 0;
      newZone.shadowEnabled = true;
      newZone.shadowColor = '#000000';
      newZone.uppercase = type === 'cta' || type === 'headline';
      newZone.lineHeight = 1.2;
      newZone.padding = 4;
      newZone.radius = 4;
    } else if (type === 'logo' || type === 'dynamicImage') {
      newZone.width = 25;
      newZone.height = 15;
      newZone.scale = 100;
      newZone.radius = 6;
      newZone.shadowEnabled = true;
    } else if (type === 'progressBar') {
      newZone.width = 80;
      newZone.height = 2;
      newZone.color = '#6366f1';
      newZone.radius = 4;
    }

    setZones([...zones, newZone]);
    setSelectedZoneId(id);
    showToast(`Zona "${newZone.name}" adicionada!`, 'success');
  };

  const removeZone = (id: string) => {
    setZones(zones.filter(z => z.id !== id));
    if (selectedZoneId === id) {
      setSelectedZoneId(null);
    }
    showToast('Zona removida.', 'info');
  };

  const updateZoneField = (id: string, field: string, value: any) => {
    setZones(zones.map(z => z.id === id ? { ...z, [field]: value } : z));
  };

  // Mouse drag handles
  const handleZoneMouseDown = (e: React.MouseEvent, zone: any, action: 'drag' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    setSelectedZoneId(zone.id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setZoneStartCoords({
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height
    });

    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;
      if (!canvasRef.current || !selectedZoneId) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / canvasRect.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / canvasRect.height) * 100;

      if (isDragging) {
        const newX = Math.max(0, Math.min(100 - zoneStartCoords.width, zoneStartCoords.x + deltaX));
        const newY = Math.max(0, Math.min(100 - zoneStartCoords.height, zoneStartCoords.y + deltaY));
        updateZoneField(selectedZoneId, 'x', Math.round(newX));
        updateZoneField(selectedZoneId, 'y', Math.round(newY));
      } else if (isResizing) {
        const newWidth = Math.max(5, Math.min(100 - zoneStartCoords.x, zoneStartCoords.width + deltaX));
        const newHeight = Math.max(2, Math.min(100 - zoneStartCoords.y, zoneStartCoords.height + deltaY));
        updateZoneField(selectedZoneId, 'width', Math.round(newWidth));
        updateZoneField(selectedZoneId, 'height', Math.round(newHeight));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, zoneStartCoords, selectedZoneId]);

  const handleSaveClick = () => {
    const updated: Template = {
      ...template,
      name,
      description,
      aspect,
      defaultDuration: duration,
      layers: zones as any,
      updatedAt: new Date().toISOString()
    } as any;
    
    // Store background meta
    (updated as any).backgroundImageUrl = backgroundImageUrl;

    onSave(updated);
    showToast('Template salvo com sucesso na fábrica!', 'success');
  };

  return (
    <div className="fixed inset-0 bg-[#03050a] flex flex-col z-[100] text-gray-200 select-none overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-gray-900/60 bg-gray-950 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-800" />
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent font-bold text-gray-100 focus:outline-none focus:border-b border-indigo-500 max-w-[200px]"
                placeholder="Nome do Template"
              />
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-900 text-indigo-400">
                FÁBRICA MODO ATIVO
              </span>
            </div>
            <p className="text-[10px] text-gray-500 truncate max-w-[300px]">
              {description || 'Sem descrição fornecida.'}
            </p>
          </div>
        </div>

        {/* Aspect and global duration */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Formato:</span>
            <select
              value={aspect}
              onChange={(e) => setAspect(e.target.value as AspectRatio)}
              className="bg-gray-900 border border-gray-850 px-3 py-1.5 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
            >
              <option value="9:16">Vertical (9:16)</option>
              <option value="16:9">Horizontal (16:9)</option>
              <option value="1:1">Quadrado (1:1)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Segundos:</span>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 30))}
              className="bg-gray-900 border border-gray-850 w-16 px-3 py-1.5 rounded-xl text-xs text-center text-gray-300 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <button
            onClick={handleSaveClick}
            className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/15 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Template</span>
          </button>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Control Panel */}
        <aside className="w-80 border-r border-gray-900/60 bg-gray-950 flex flex-col overflow-y-auto">
          {/* Passo 1: Upload de Fundo */}
          <div className="p-5 border-b border-gray-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center text-[10px]">1</span>
                Plano de Fundo (Canvas)
              </span>
            </div>

            <div className="flex bg-gray-900 p-1 rounded-xl gap-1">
              <button
                onClick={() => setBackgroundType('preset')}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition ${backgroundType === 'preset' ? 'bg-gray-950 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Modelos Prontos
              </button>
              <button
                onClick={() => setBackgroundType('upload')}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition ${backgroundType === 'upload' ? 'bg-gray-950 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Upload Canva
              </button>
            </div>

            {backgroundType === 'preset' ? (
              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                {BACKGROUND_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetSelect(preset.url)}
                    className={`relative aspect-[9/16] rounded-lg border-2 overflow-hidden transition cursor-pointer group ${backgroundImageUrl === preset.url ? 'border-indigo-500' : 'border-transparent hover:border-gray-700'}`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-1">
                      <span className="text-[8px] font-bold text-white text-center leading-tight">{preset.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="border border-dashed border-gray-800 hover:border-indigo-500/50 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-gray-900/20 hover:bg-gray-900/40">
                  <Upload className="w-6 h-6 text-gray-500" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-gray-300">Carregar arte de Fundo</p>
                    <p className="text-[9px] text-gray-500 mt-1">PNG, JPG, JPEG, WEBP</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                </label>

                {uploadProgress !== null && (
                  <div className="bg-gray-900 rounded-xl p-3 border border-gray-850/80 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-gray-400">Enviando imagem...</span>
                      <span className="text-indigo-400 font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Passo 2: Zonas Dinâmicas */}
          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center text-[10px]">2</span>
                Zonas de Automação
              </span>
            </div>

            {/* Nova Zona Button Dropdown list */}
            <div className="mb-4">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-2">Adicionar Elemento Dinâmico</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { type: 'video', name: 'Área de Vídeo', icon: <VideoIcon className="w-3.5 h-3.5 text-blue-400" /> },
                  { type: 'headline', name: 'Headline', icon: <Type className="w-3.5 h-3.5 text-indigo-400" /> },
                  { type: 'subheadline', name: 'Subheadline', icon: <Type className="w-3.5 h-3.5 text-purple-400" /> },
                  { type: 'cta', name: 'CTA', icon: <Type className="w-3.5 h-3.5 text-amber-400" /> },
                  { type: 'logo', name: 'Logo', icon: <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> },
                  { type: 'instagram', name: 'Instagram', icon: <Instagram className="w-3.5 h-3.5 text-pink-400" /> },
                  { type: 'watermark', name: 'Watermark', icon: <FontIcon className="w-3.5 h-3.5 text-slate-400" /> },
                  { type: 'progressBar', name: 'Progresso', icon: <Sliders className="w-3.5 h-3.5 text-teal-400" /> },
                  { type: 'captions', name: 'Legendas Auto', icon: <FontIcon className="w-3.5 h-3.5 text-violet-400" /> },
                  { type: 'freeText', name: 'Texto Livre', icon: <Type className="w-3.5 h-3.5 text-rose-400" /> },
                  { type: 'dynamicImage', name: 'Imagem Dinâmica', icon: <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> }
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => addZone(item.type)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-850 border border-gray-850 hover:border-gray-700 text-gray-300 hover:text-white rounded-xl text-[11px] font-bold transition cursor-pointer text-left"
                  >
                    {item.icon}
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List of existing Zones */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">Camadas Dinâmicas</label>
              {zones.length === 0 ? (
                <div className="text-center py-8 bg-gray-900/10 border border-dashed border-gray-900 rounded-2xl">
                  <p className="text-[11px] text-gray-500 font-medium">Nenhuma zona de automação inserida.</p>
                </div>
              ) : (
                zones.map((zone) => (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${selectedZoneId === zone.id ? 'bg-indigo-950/30 border-indigo-500/30' : 'bg-gray-900/60 border-gray-850 hover:border-gray-800'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-gray-950">
                        {zone.type === 'video' ? (
                          <VideoIcon className="w-3.5 h-3.5 text-blue-400" />
                        ) : ['logo', 'dynamicImage'].includes(zone.type) ? (
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Type className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <input
                          type="text"
                          value={zone.name}
                          onChange={(e) => updateZoneField(zone.id, 'name', e.target.value)}
                          className="bg-transparent text-[11px] font-bold text-gray-300 focus:outline-none min-w-0"
                        />
                        <p className="text-[9px] font-mono font-semibold text-indigo-500/80">{zone.defaultValue}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeZone(zone.id);
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-900 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Central Display: Canva Canvas Rendering Stage */}
        <main className="flex-1 bg-[#020306] flex items-center justify-center p-8 overflow-hidden relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-gray-950/80 border border-gray-900 rounded-xl px-3 py-1.5 backdrop-blur">
            <Grid className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-mono font-bold text-gray-400">Canvas Inteligente (9:16)</span>
          </div>

          {/* Interactive Responsive Canvas bounding box */}
          <div
            ref={canvasRef}
            className={`relative rounded-2xl bg-gray-950 shadow-2xl border border-gray-900 overflow-hidden ${aspect === '9:16' ? 'aspect-[9/16] h-[75vh]' : aspect === '16:9' ? 'aspect-[16/9] w-[70%]' : 'aspect-square h-[60vh]'}`}
          >
            {/* Uploaded Background Visual representation */}
            <img
              src={backgroundImageUrl}
              alt="Fundo Canva"
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />

            {/* Dimmed backdrop when zones edit active */}
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />

            {/* Render Absolute Dynamic Zones */}
            {zones.map((zone) => {
              const isSelected = selectedZoneId === zone.id;
              
              // Render Box styles
              const zoneStyle: React.CSSProperties = {
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                transform: `rotate(${zone.rotation || 0}deg)`,
                opacity: (zone.opacity !== undefined ? zone.opacity : 100) / 100
              };

              return (
                <div
                  key={zone.id}
                  style={zoneStyle}
                  onMouseDown={(e) => handleZoneMouseDown(e, zone, 'drag')}
                  className={`absolute flex items-center justify-center border-2 group select-none ${isSelected ? 'border-indigo-500 bg-indigo-500/10 z-30' : 'border-indigo-500/40 bg-indigo-950/5 hover:border-indigo-500/80 z-20'} rounded-lg transition-all duration-75 cursor-move`}
                >
                  {/* Zone tags */}
                  <div className={`absolute top-0 left-0 -translate-y-full px-2 py-0.5 rounded-t-lg text-[9px] font-mono font-bold flex items-center gap-1.5 transition ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400'}`}>
                    <span>{zone.name}</span>
                    <span className="text-[7px] text-gray-500">{zone.x}%, {zone.y}%</span>
                  </div>

                  {/* Zone Inner Visual Placeholders based on type */}
                  <div className="p-3 text-center pointer-events-none w-full h-full flex flex-col justify-center overflow-hidden">
                    {zone.type === 'video' ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full border border-dashed border-indigo-400/40 rounded-lg bg-blue-950/20">
                        <VideoIcon className="w-5 h-5 text-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">ÁREA DE VÍDEO</span>
                        <span className="text-[8px] font-mono text-indigo-500">{zone.defaultValue}</span>
                      </div>
                    ) : zone.type === 'progressBar' ? (
                      <div className="w-full bg-gray-800 h-1 rounded overflow-hidden">
                        <div className="bg-indigo-500 h-full w-[65%]" />
                      </div>
                    ) : (
                      <div
                        style={{
                          fontFamily: zone.font === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : zone.font === 'Fira Code' ? 'monospace' : 'inherit',
                          color: zone.color || '#ffffff',
                          fontSize: `${zone.size || 14}px`,
                          textAlign: zone.align || 'center',
                          fontWeight: zone.weight === 'bold' ? 'bold' : zone.weight === 'extra-bold' ? 900 : 'normal',
                          textTransform: zone.uppercase ? 'uppercase' : 'none',
                          letterSpacing: `${zone.spacing || 0}px`
                        }}
                        className="truncate w-full font-bold"
                      >
                        {zone.defaultValue}
                      </div>
                    )}
                  </div>

                  {/* Corner Resize anchor handle bottom-right */}
                  {isSelected && (
                    <div
                      onMouseDown={(e) => handleZoneMouseDown(e, zone, 'resize')}
                      className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-600 rounded-tl border-t border-l border-white/40 cursor-se-resize z-40"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* Right Parameters Inspector Panel */}
        <aside className="w-80 border-l border-gray-900/60 bg-gray-950 p-5 overflow-y-auto space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-900/60">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">Inspetor de Zona</h3>
          </div>

          {!selectedZone ? (
            <div className="text-center py-12 text-gray-500">
              <MousePointer className="w-8 h-8 mx-auto text-gray-700 mb-2 animate-bounce" />
              <p className="text-[11px] font-medium leading-relaxed">Selecione uma zona no canvas para customizar suas propriedades de renderização automática.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-indigo-950/20 rounded-xl p-3 border border-indigo-950/60 space-y-1">
                <span className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-widest">Zona Selecionada</span>
                <p className="text-xs font-bold text-gray-200">{selectedZone.name}</p>
                <span className="text-[9px] text-gray-500 font-mono">Tipo: {selectedZone.type}</span>
              </div>

              {/* Dimensional parameters (X, Y, Width, Height, Opacity) */}
              <div className="space-y-4">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5" />
                  Dimensões e Posição (%)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Largura (%)</label>
                    <input
                      type="number"
                      value={selectedZone.width}
                      onChange={(e) => updateZoneField(selectedZone.id, 'width', Math.min(100, Math.max(5, parseInt(e.target.value) || 10)))}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Altura (%)</label>
                    <input
                      type="number"
                      value={selectedZone.height}
                      onChange={(e) => updateZoneField(selectedZone.id, 'height', Math.min(100, Math.max(2, parseInt(e.target.value) || 5)))}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Posição X (%)</label>
                    <input
                      type="number"
                      value={selectedZone.x}
                      onChange={(e) => updateZoneField(selectedZone.id, 'x', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Posição Y (%)</label>
                    <input
                      type="number"
                      value={selectedZone.y}
                      onChange={(e) => updateZoneField(selectedZone.id, 'y', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[9px] font-mono font-semibold text-gray-500 mb-1.5">
                    <span>Opacidade</span>
                    <span>{selectedZone.opacity || 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={selectedZone.opacity || 100}
                    onChange={(e) => updateZoneField(selectedZone.id, 'opacity', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              {/* Video Specific Inspector options */}
              {selectedZone.type === 'video' && (
                <div className="space-y-4 pt-4 border-t border-gray-900/60">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <VideoIcon className="w-3.5 h-3.5" />
                    Propriedades de Vídeo
                  </span>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Espessura da Borda</label>
                    <input
                      type="number"
                      value={selectedZone.borderWidth || 0}
                      onChange={(e) => updateZoneField(selectedZone.id, 'borderWidth', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Cor da Borda</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedZone.borderColor || '#3b82f6'}
                        onChange={(e) => updateZoneField(selectedZone.id, 'borderColor', e.target.value)}
                        className="w-10 h-8 bg-gray-900 border border-gray-850 rounded-lg p-0.5 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedZone.borderColor || '#3b82f6'}
                        onChange={(e) => updateZoneField(selectedZone.id, 'borderColor', e.target.value)}
                        className="flex-1 bg-gray-900 border border-gray-850 rounded-xl px-3 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Arredondamento (Radius)</label>
                    <input
                      type="number"
                      value={selectedZone.radius || 0}
                      onChange={(e) => updateZoneField(selectedZone.id, 'radius', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Ajuste do Vídeo (Object Fit)</label>
                    <select
                      value={selectedZone.objectFit || 'cover'}
                      onChange={(e) => updateZoneField(selectedZone.id, 'objectFit', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none cursor-pointer text-gray-300 font-medium"
                    >
                      <option value="cover">Preencher (Cover)</option>
                      <option value="contain">Enquadrar (Contain)</option>
                      <option value="stretch">Esticar (Stretch)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Text specific Inspector Options */}
              {['headline', 'subheadline', 'cta', 'instagram', 'watermark', 'captions', 'freeText'].includes(selectedZone.type) && (
                <div className="space-y-4 pt-4 border-t border-gray-900/60">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Paintbrush className="w-3.5 h-3.5" />
                    Customização de Texto
                  </span>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1.5">Fonte</label>
                    <select
                      value={selectedZone.font || 'Inter'}
                      onChange={(e) => updateZoneField(selectedZone.id, 'font', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer text-gray-300 font-medium"
                    >
                      <option value="Inter">Inter (SaaS)</option>
                      <option value="Space Grotesk">Space Grotesk (Tech)</option>
                      <option value="Anton">Anton (Bold/Impact)</option>
                      <option value="Playfair Display">Playfair Display (Serif)</option>
                      <option value="Fira Code">Fira Code (Mono)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Tamanho da Fonte</label>
                    <input
                      type="number"
                      value={selectedZone.size || 16}
                      onChange={(e) => updateZoneField(selectedZone.id, 'size', Math.max(8, parseInt(e.target.value) || 12))}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Cor da Fonte</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedZone.color || '#ffffff'}
                        onChange={(e) => updateZoneField(selectedZone.id, 'color', e.target.value)}
                        className="w-10 h-8 bg-gray-900 border border-gray-850 rounded-lg p-0.5 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedZone.color || '#ffffff'}
                        onChange={(e) => updateZoneField(selectedZone.id, 'color', e.target.value)}
                        className="flex-1 bg-gray-900 border border-gray-850 rounded-xl px-3 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1.5">Alinhamento</label>
                    <div className="flex bg-gray-900 p-1 rounded-xl gap-1">
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          onClick={() => updateZoneField(selectedZone.id, 'align', align)}
                          className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold uppercase transition ${selectedZone.align === align ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          {align === 'left' ? 'Esq' : align === 'center' ? 'Cent' : 'Dir'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1.5">Peso (Weight)</label>
                    <div className="flex bg-gray-900 p-1 rounded-xl gap-1">
                      {['normal', 'bold', 'extra-bold'].map((weight) => (
                        <button
                          key={weight}
                          onClick={() => updateZoneField(selectedZone.id, 'weight', weight)}
                          className={`flex-1 text-center py-1 rounded-lg text-[9px] font-bold uppercase transition ${selectedZone.weight === weight ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                          {weight === 'normal' ? 'Leve' : weight === 'bold' ? 'Negrito' : 'Forte'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 bg-gray-900/40 rounded-xl px-3 border border-gray-900/60">
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">CAIXA ALTA (Uppercase)</span>
                    <input
                      type="checkbox"
                      checked={selectedZone.uppercase || false}
                      onChange={(e) => updateZoneField(selectedZone.id, 'uppercase', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 border-gray-800 bg-gray-950 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 bg-gray-900/40 rounded-xl px-3 border border-gray-900/60">
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Sombra Projetada</span>
                    <input
                      type="checkbox"
                      checked={selectedZone.shadowEnabled || false}
                      onChange={(e) => updateZoneField(selectedZone.id, 'shadowEnabled', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 border-gray-800 bg-gray-950 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Logo specific Inspector Options */}
              {selectedZone.type === 'logo' && (
                <div className="space-y-4 pt-4 border-t border-gray-900/60">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Propriedades da Logomarca
                  </span>

                  <div>
                    <div className="flex justify-between text-[9px] font-mono font-semibold text-gray-500 mb-1.5">
                      <span>Escala</span>
                      <span>{selectedZone.scale || 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={selectedZone.scale || 100}
                      onChange={(e) => updateZoneField(selectedZone.id, 'scale', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono font-semibold text-gray-500 mb-1">Arredondamento da Borda</label>
                    <input
                      type="number"
                      value={selectedZone.radius || 0}
                      onChange={(e) => updateZoneField(selectedZone.id, 'radius', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
