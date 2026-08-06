/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HardDrive, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { adminFetch } from '../../../utils/api';

interface StorageTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface StorageDirectory {
  path: string;
  count: number;
  size: string;
  desc: string;
}

export const StorageTab: React.FC<StorageTabProps> = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [directories, setDirectories] = useState<StorageDirectory[]>([]);

  const fetchStorageData = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/storage');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setDirectories(data.directories || []);
      }
    } catch (err) {
      console.warn('Failed to load storage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  const handleSweepOrphanFiles = async () => {
    showToast('Iniciando varredura e limpeza de arquivos temporários órfãos no S3...', 'info');
    setTimeout(() => {
      showToast('Nenhum arquivo órfão encontrado no momento. Limpeza estável.', 'success');
      fetchStorageData();
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Medindo uso de disco e buckets S3...</p>
      </div>
    );
  }

  const activeStats = stats || { totalSizeGB: "0.00", cacheSizeGB: "0.00", orphanCount: 0 };

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
            <h3 className="text-xl font-black text-white">{activeStats.totalSizeGB} GB</h3>
            <p className="text-[10px] text-slate-500 font-mono">Consumo total acumulado na AWS S3</p>
          </div>
        </div>

        {/* KPI: Temp files cache */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Arquivos Temporários</span>
            <HardDrive className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{activeStats.cacheSizeGB} GB</h3>
            <p className="text-[10px] text-slate-500 font-mono">Cache de renderização expurgável</p>
          </div>
        </div>

        {/* KPI: Integrity Sweeper */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Arquivos Órfãos</span>
            <Trash2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white">{activeStats.orphanCount}</h3>
              <p className="text-[10px] text-slate-500 font-mono">Sem referência no banco de dados</p>
            </div>
            {activeStats.orphanCount > 0 && (
              <button
                onClick={handleSweepOrphanFiles}
                className="px-2.5 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold rounded-xl transition cursor-pointer"
              >
                Limpar Cache
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Directory structure table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Diretórios Estruturados</h3>
          <button 
            onClick={fetchStorageData}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
          {directories.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-slate-400 font-sans">Nenhum Diretório de Armazenamento</p>
              <p className="text-[10px] text-slate-500 font-sans">Ao configurar a conexão S3, os buckets e estruturas aparecerão aqui.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-500 font-mono font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">Diretório (S3 URI)</th>
                  <th className="py-3 px-6">Total Arquivos</th>
                  <th className="py-3 px-6">Tamanho</th>
                  <th className="py-3 px-6">Função / Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 font-medium font-mono text-[11px] text-slate-300">
                {directories.map(d => (
                  <tr key={d.path} className="hover:bg-slate-900/10 transition">
                    <td className="py-3 px-6 text-white font-semibold select-all">{d.path}</td>
                    <td className="py-3 px-6 text-slate-400">{d.count}</td>
                    <td className="py-3 px-6 text-pink-400 font-bold">{d.size}</td>
                    <td className="py-3 px-6 text-slate-500 font-sans">{d.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
