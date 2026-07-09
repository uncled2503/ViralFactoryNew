/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Trash2, RefreshCw } from 'lucide-react';

interface CouponsTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  status: 'active' | 'expired';
  uses: number;
  maxUses: number;
  expires: string;
}

export const CouponsTab: React.FC<CouponsTabProps> = ({ showToast }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCode, setNewCode] = useState('');
  const [newValue, setNewValue] = useState(25);
  const [newType, setNewType] = useState<'percentage' | 'fixed'>('percentage');

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch (err) {
      console.warn('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode) return;
    
    try {
      // Create via system settings or a dummy post which is integrated
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `coupon_${newCode.toUpperCase().trim()}`,
          value: JSON.stringify({
            code: newCode.toUpperCase().trim(),
            type: newType,
            value: Number(newValue),
            status: 'active',
            uses: 0,
            maxUses: 150,
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
        })
      });

      if (res.ok) {
        showToast(`Cupom ${newCode} cadastrado e salvo no banco de dados!`, 'success');
        setNewCode('');
        fetchCoupons();
      } else {
        throw new Error('Falha ao cadastrar cupom.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar cupom.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    showToast('Ação restrita de exclusão para auditoria permanente.', 'info');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Consultando cupons de desconto reais...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      
      {/* Left Column: Create Coupon */}
      <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl h-fit space-y-4">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-pink-500" /> Criar Novo Cupom
        </h3>
        <form onSubmit={handleAddCoupon} className="space-y-4 text-xs font-medium">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Código do Cupom</label>
            <input
              type="text"
              required
              placeholder="Ex: PROMO50"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white uppercase font-mono placeholder-slate-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Tipo</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Fixo (R$)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Valor</label>
              <input
                type="number"
                required
                value={newValue}
                onChange={e => setNewValue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Cupom
          </button>
        </form>
      </div>

      {/* Right Column: Coupons Catalogue list */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Cupons Registrados</h3>
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
          {coupons.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Ticket className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-xs text-slate-400 font-sans font-semibold">Nenhum cupom cadastrado</p>
              <p className="text-[10px] text-slate-500">Adicione cupons válidos usando o formulário ao lado.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-500 font-mono font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">Código</th>
                  <th className="py-3 px-6">Desconto</th>
                  <th className="py-3 px-6">Uso / Máximo</th>
                  <th className="py-3 px-6">Expiração</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 font-medium font-mono">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-slate-900/20 transition text-[11px] text-slate-300">
                    <td className="py-3 px-6 text-white font-bold tracking-wide font-sans">{c.code}</td>
                    <td className="py-3 px-6 font-mono">
                      {c.type === 'percentage' ? `${c.value}%` : `R$ ${c.value}`}
                    </td>
                    <td className="py-3 px-6 text-slate-400 font-mono">
                      {c.uses} / {c.maxUses}
                    </td>
                    <td className="py-3 px-6 text-slate-500 font-mono">{c.expires}</td>
                    <td className="py-3 px-6 font-sans">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {c.status === 'active' ? 'Ativo' : 'Expirado'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right font-sans">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 hover:bg-red-950/20 text-red-400 hover:text-red-300 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
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
