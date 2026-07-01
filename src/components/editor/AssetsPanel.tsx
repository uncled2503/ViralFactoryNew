/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Search, Upload, Film, Image, Type, 
  Volume2, Folder, Heart, FolderOpen, Star, HelpCircle 
} from 'lucide-react';
import { EditorLayer, EditorLayerType } from './types';

interface Asset {
  id: string;
  name: string;
  category: 'uploads' | 'videos' | 'images' | 'logos' | 'fonts' | 'audios' | 'rendered';
  url: string;
  thumbnail?: string;
  type: EditorLayerType;
  meta?: string;
}

const PRESET_ASSETS: Asset[] = [
  // Videos
  {
    id: 'vid-preset-1',
    name: 'Estilo de Vida Urbano',
    category: 'videos',
    url: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?q=80&w=1080&h=1920&fit=crop', // unsplash high quality link
    thumbnail: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?q=80&w=256&h=256&fit=crop',
    type: 'video',
    meta: 'Fundo / 9:16'
  },
  {
    id: 'vid-preset-2',
    name: 'Praia Tropical Slowmo',
    category: 'videos',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1080&h=1920&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=256&h=256&fit=crop',
    type: 'video',
    meta: 'Praia / 9:16'
  },
  {
    id: 'vid-preset-3',
    name: 'Tecnologia Neon Cyberpunk',
    category: 'videos',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1080&h=1920&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=256&h=256&fit=crop',
    type: 'video',
    meta: 'Cyberpunk / 9:16'
  },
  // Images
  {
    id: 'img-preset-1',
    name: 'Céu de Outono',
    category: 'images',
    url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=1080&h=1920&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=256&h=256&fit=crop',
    type: 'image',
    meta: 'Natureza'
  },
  {
    id: 'img-preset-2',
    name: 'Escritório Minimalista',
    category: 'images',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1080&h=1920&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=256&h=256&fit=crop',
    type: 'image',
    meta: 'Trabalho'
  },
  // Logos
  {
    id: 'logo-preset-1',
    name: 'Logo Viral Factory',
    category: 'logos',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=256&h=256&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=128&h=128&fit=crop',
    type: 'logo',
    meta: 'PNG / Transparente'
  },
  {
    id: 'logo-preset-2',
    name: 'Emblema Premium Shield',
    category: 'logos',
    url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aba9?q=80&w=256&h=256&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1599305445671-ac291c95aba9?q=80&w=128&h=128&fit=crop',
    type: 'logo',
    meta: 'PNG / Escudo'
  },
  // Audios
  {
    id: 'aud-preset-1',
    name: 'Batida Lo-fi Relaxante',
    category: 'audios',
    url: 'https://example.com/audio/lofi.mp3',
    type: 'overlay',
    meta: '02:30 / 112bpm'
  },
  {
    id: 'aud-preset-2',
    name: 'Cinemático de Alta Tensão',
    category: 'audios',
    url: 'https://example.com/audio/tension.mp3',
    type: 'overlay',
    meta: '01:45 / 130bpm'
  }
];

interface AssetsPanelProps {
  onAddLayer: (type: EditorLayerType, params?: Partial<EditorLayer>) => void;
}

export const AssetsPanel: React.FC<AssetsPanelProps> = ({ onAddLayer }) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'images' | 'logos' | 'texts' | 'shapes' | 'overlays' | 'uploads'>('videos');
  const [search, setSearch] = useState('');
  const [customAssets, setCustomAssets] = useState<Asset[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Filter assets based on search query
  const assetsList = [...PRESET_ASSETS, ...customAssets].filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) &&
      (activeTab === 'uploads' ? a.category === 'uploads' : a.category === activeTab)
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isVideo = file.type.startsWith('video/');
    const type: EditorLayerType = isVideo ? 'video' : 'image';
    const category = 'uploads';

    // Simulated URL object
    const fileUrl = URL.createObjectURL(file);

    const newAsset: Asset = {
      id: `custom-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name.split('.')[0],
      category,
      url: fileUrl,
      thumbnail: isVideo 
        ? 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?q=80&w=256&h=256&fit=crop'
        : fileUrl,
      type,
      meta: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    };

    setCustomAssets([newAsset, ...customAssets]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Trigger upload simulation
      const file = files[0];
      const isVideo = file.type.startsWith('video/');
      const type: EditorLayerType = isVideo ? 'video' : 'image';
      const fileUrl = URL.createObjectURL(file);

      const newAsset: Asset = {
        id: `custom-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name.split('.')[0],
        category: 'uploads',
        url: fileUrl,
        thumbnail: isVideo 
          ? 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?q=80&w=256&h=256&fit=crop'
          : fileUrl,
        type,
        meta: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      };

      setCustomAssets([newAsset, ...customAssets]);
    }
  };

  return (
    <div className="w-80 bg-[#090b14] border-r border-gray-900 flex flex-col h-full select-none">
      {/* 1. Category Switcher */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-gray-950/40 border-b border-gray-900">
        <button
          onClick={() => setActiveTab('videos')}
          className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex flex-col items-center gap-1 ${
            activeTab === 'videos' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Vídeos</span>
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex flex-col items-center gap-1 ${
            activeTab === 'images' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          <span>Imagens</span>
        </button>
        <button
          onClick={() => setActiveTab('texts')}
          className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex flex-col items-center gap-1 ${
            activeTab === 'texts' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Textos</span>
        </button>
        <button
          onClick={() => setActiveTab('shapes')}
          className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex flex-col items-center gap-1 ${
            activeTab === 'shapes' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Formas</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 px-2 pb-2 bg-gray-950/40 border-b border-gray-900">
        <button
          onClick={() => setActiveTab('logos')}
          className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'logos' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
          }`}
        >
          <Star className="w-3 h-3" />
          <span>Logos</span>
        </button>
        <button
          onClick={() => setActiveTab('overlays')}
          className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'overlays' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
          }`}
        >
          <Plus className="w-3 h-3" />
          <span>Overlays</span>
        </button>
        <button
          onClick={() => setActiveTab('uploads')}
          className={`py-1.5 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'uploads' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
          }`}
        >
          <Upload className="w-3 h-3" />
          <span>Uploads</span>
        </button>
      </div>

      {/* 2. Search & Filter panel */}
      <div className="p-3 border-b border-gray-900/60 bg-gray-950/20">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Pesquisar ativos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-950 border border-gray-900 hover:border-gray-850 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none transition font-medium"
          />
        </div>
      </div>

      {/* 3. Assets Library List */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {activeTab === 'uploads' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mb-4 border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
              isDragging
                ? 'border-indigo-500 bg-indigo-950/20 text-indigo-400'
                : 'border-gray-900 bg-gray-950/30 text-gray-400 hover:border-gray-800 hover:bg-gray-950/50'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2.5 text-gray-600 animate-bounce-slow" />
            <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide">Arraste seus arquivos</p>
            <p className="text-[9px] text-gray-500 mt-1">MP4, PNG ou JPG para simular importações</p>
            <label className="inline-block mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase transition shadow-md">
              Selecionar Arquivo
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* List render */}
        {activeTab === 'texts' ? (
          <div className="space-y-2.5">
            <span className="text-[9px] uppercase font-bold text-gray-500 block tracking-wider">Estilos de Texto Prontos</span>
            <button
              onClick={() => onAddLayer('headline', { name: 'Título Principal', text: 'TÍTULO IMPACTANTE', size: 64, font: 'Anton', color: '#FFFFFF', strokeEnabled: true, strokeColor: '#000000', strokeWidth: 2 })}
              className="w-full p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 hover:bg-gray-900/60 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <span className="text-base font-black font-mono tracking-tight text-white group-hover:text-indigo-400 transition">TÍTULO ANTON</span>
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onAddLayer('subheadline', { name: 'Subtítulo', text: 'Subtítulo do vídeo explicativo', size: 36, font: 'Space Grotesk', color: '#e0e7ff' })}
              className="w-full p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 hover:bg-gray-900/60 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <span className="text-sm font-semibold text-gray-300 group-hover:text-indigo-400 transition">Subtítulo Grotesk</span>
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onAddLayer('text', { name: 'Parágrafo', text: 'Texto de conteúdo ou descrição simples do vídeo.', size: 22, font: 'Inter', color: '#cbd5e1' })}
              className="w-full p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 hover:bg-gray-900/60 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <span className="text-xs text-gray-400 group-hover:text-indigo-400 transition">Parágrafo Standard</span>
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onAddLayer('cta', { name: 'Botão CTA', text: 'CLIQUE NO LINK DA BIO', size: 40, font: 'Outfit', color: '#FFFF00', shadowEnabled: true })}
              className="w-full p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl hover:border-indigo-500 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <span className="text-xs font-black tracking-wide text-amber-400">🔥 CHAMADA DE AÇÃO (CTA)</span>
              <Plus className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
        ) : activeTab === 'shapes' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onAddLayer('shape', { name: 'Retângulo', shapeType: 'rectangle', width: 200, height: 200, color: '#4f46e5' })}
              className="p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
            >
              <div className="w-10 h-10 bg-indigo-600 rounded" />
              <span className="text-[10px] font-semibold text-gray-400">Retângulo</span>
            </button>
            <button
              onClick={() => onAddLayer('shape', { name: 'Círculo', shapeType: 'circle', width: 200, height: 200, color: '#ec4899' })}
              className="p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
            >
              <div className="w-10 h-10 bg-pink-500 rounded-full" />
              <span className="text-[10px] font-semibold text-gray-400">Círculo</span>
            </button>
            <button
              onClick={() => onAddLayer('shape', { name: 'Divisor', shapeType: 'line', width: 400, height: 10, color: '#f59e0b' })}
              className="p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 flex flex-col items-center justify-center gap-2 col-span-2 transition cursor-pointer"
            >
              <div className="w-full h-1.5 bg-amber-500 rounded" />
              <span className="text-[10px] font-semibold text-gray-400">Linha Divisória</span>
            </button>
          </div>
        ) : activeTab === 'overlays' ? (
          <div className="space-y-2">
            <button
              onClick={() => onAddLayer('overlay', { name: 'Fundo Escuro', overlayType: 'solid', color: 'rgba(0,0,0,0.45)', width: 1080, height: 1920 })}
              className="w-full p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 text-left transition flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-xs font-semibold text-gray-300 block">Cor Sólida Semi-Transparente</span>
                <span className="text-[9px] text-gray-500">Adiciona contraste para as legendas</span>
              </div>
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onAddLayer('overlay', { name: 'Desfoque Cinematic', overlayType: 'blur', size: 12, color: 'rgba(0,0,0,0.15)', width: 1080, height: 1920 })}
              className="w-full p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 text-left transition flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-xs font-semibold text-gray-300 block">Backdrop Blur Overlay</span>
                <span className="text-[9px] text-gray-500">Efeito fosco premium de fundo</span>
              </div>
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onAddLayer('overlay', { name: 'Sombra Gradiente', overlayType: 'gradient', gradientColorStart: 'transparent', gradientColorEnd: 'rgba(0,0,0,0.9)', width: 1080, height: 1920 })}
              className="w-full p-3 bg-gray-950/80 border border-gray-900 rounded-xl hover:border-indigo-500/30 text-left transition flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-xs font-semibold text-gray-300 block">Gradiente de Sombra Superior/Inferior</span>
                <span className="text-[9px] text-gray-500">Melhora visibilidade superior de texto</span>
              </div>
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onAddLayer('progressBar', { name: 'Barra de Progresso', color: '#6366f1', width: 900, height: 12, size: 12, radius: 6 })}
              className="w-full p-3 bg-indigo-950/15 border border-indigo-900/40 rounded-xl hover:border-indigo-500 text-left transition flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-indigo-400 block">⏳ Barra de Progresso Dinâmica</span>
                <span className="text-[9px] text-indigo-500">Seguimento automático do tempo de vídeo</span>
              </div>
              <Plus className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
        ) : assetsList.length === 0 ? (
          <div className="text-center py-12 px-4 text-gray-600 font-medium">
            <Search className="w-8 h-8 mx-auto text-gray-800 mb-2" />
            <p className="text-[10px]">Nenhum recurso encontrado nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {assetsList.map((asset) => (
              <div
                key={asset.id}
                onClick={() => onAddLayer(asset.type, {
                  name: asset.name,
                  contentUrl: asset.url,
                })}
                className="group relative bg-gray-950 border border-gray-900 hover:border-indigo-500/40 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 shadow-lg flex flex-col"
              >
                {/* Thumbnail element */}
                <div className="aspect-video bg-black/40 relative overflow-hidden">
                  {asset.thumbnail ? (
                    <img 
                      src={asset.thumbnail} 
                      alt={asset.name} 
                      className="w-full h-full object-cover group-hover:scale-115 transition duration-300 pointer-events-none" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Film className="w-5 h-5 text-gray-700" />
                    </div>
                  )}
                  {/* Plus button indicator */}
                  <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Details info */}
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-gray-300 truncate block group-hover:text-indigo-400 transition" title={asset.name}>
                    {asset.name}
                  </span>
                  {asset.meta && (
                    <span className="text-[8px] font-semibold font-mono text-gray-600 mt-0.5 uppercase">
                      {asset.meta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helper Box */}
      <div className="p-3 bg-gray-950/30 border-t border-gray-900 flex items-center gap-2 select-none">
        <HelpCircle className="w-4 h-4 text-gray-600" />
        <span className="text-[9px] text-gray-500 font-medium">Clique em um ativo para adicioná-lo instantaneamente à cena.</span>
      </div>
    </div>
  );
};
