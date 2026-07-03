/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  HardDrive, 
  Trash2, 
  Layers, 
  FolderOpen, 
  File, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

interface StorageTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const StorageTab: React.FC<StorageTabProps> = ({ showToast }) => {
  const [cleaning, setCleaning] = useState(false);
  const [cacheSize, setCacheSize] = useState(14.2); // GB
  const [orphanFilesCount, setOrphanFilesCount] = useState(128);

  const [directories, setDirectories] = useState([
    { path: 's3://viral-factory-prod/user-media/', count: 2420, size: '42.8 GB', desc: 'Arquivos brutos carregados pelos clientes.' },
    { path: 's3://viral-factory-prod/rendered-mp4/', count: 1845, size: '36.2 GB', desc: 'Vídeos finais exportados prontos para download.' },
    { path: 's3://viral-factory-prod/templates-cache/', count: 480, size: '8.4 GB', desc: 'Templates pré-gerados e backups.' },
    { path: 's3://viral-factory-prod/logs-transcripts/', count: 5410, size: '1.2 GB', desc: 'Legendas SRT e transcrições geradas.' }
  ]);

  const handleSweepOrphanFiles = () => {
    setCleaning(true);
    showToast('Iniciando análise de integridade do storage S3...', 'info');

    setTimeout(() => {
      setCleaning(false);
      setCacheSize(prev => Math.max(2, prev - 4.8));
      setOrphanFilesCount(0);
      showToast('Limpeza concluída! 4.8 GB de mídias órfãs foram eliminados do storage.', 'success');
    }, 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Upper Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI: Consumed Space */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">S3 Consumo Total</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">88.6 GB</h3>
            <p className="text-[10px] text-slate-500 font-mono">Do limite de 1 TB contratado (AWS S3)</p>
          </div>
          <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '8.8%' }} />
          </div>
        </div>

        {/* KPI: Cached items */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Arquivos em Cache</span>
            <Layers className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{cacheSize.toFixed(1)} GB</h3>
            <p className="text-[10px] text-slate-500 font-mono">Renderizações antigas temporárias</p>
          </div>
          <span className="text-[10px] text-pink-400 font-semibold font-mono">
            Auto-expiração configurada: 30 dias
          </span>
        </div>

        {/* KPI: Orphan items */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Arquivos Órfãos</span>
            <Trash2 className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{orphanFilesCount} arquivos</h3>
            <p className="text-[10px] text-slate-500 font-mono">Sem associação a projetos ativos</p>
          </div>
          {orphanFilesCount > 0 ? (
            <button
              onClick={handleSweepOrphanFiles}
              disabled={cleaning}
              className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              {cleaning ? 'Processando Varredura...' : 'Executar Limpeza Agora →'}
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 font-semibold font-mono flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Storage 100% Integrado
            </span>
          )}
        </div>

      </div>

      {/* Directory Trees mapping */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">S3 Cloud Buckets (Diretórios de Produção)</h3>
          <p className="text-xs text-slate-400">Rastreamento de estruturas de subpastas configuradas no cluster AWS.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {directories.map((dir, idx) => (
            <div key={idx} className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3 hover:border-slate-800 transition">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-900 text-indigo-400">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">{dir.path}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{dir.desc}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono border-t border-slate-900/60 pt-3 text-slate-400">
                <span>CONTAGEM: {dir.count} arquivos</span>
                <span className="font-bold text-white">{dir.size}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
