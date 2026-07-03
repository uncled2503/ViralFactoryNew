/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter,
  FileSpreadsheet,
  ArrowUpRight,
  User
} from 'lucide-react';

interface FinanceTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Invoice {
  id: string;
  customerName: string;
  customerEmail: string;
  plan: string;
  amount: number;
  status: 'paid' | 'failed' | 'refunded' | 'pending';
  date: string;
  stripeId: string;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ showToast }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'inv-101', customerName: 'Gabriel Moura', customerEmail: 'gabriel@viral.io', plan: 'Pro', amount: 99, status: 'paid', date: '2026-07-01 10:22', stripeId: 'ch_3Mv82YF90s21A' },
    { id: 'inv-102', customerName: 'Renata Souza', customerEmail: 'renata@vlog.com', plan: 'Business', amount: 199, status: 'paid', date: '2026-06-30 18:45', stripeId: 'ch_3Mv82YF90s21B' },
    { id: 'inv-103', customerName: 'Marcos Silveira', customerEmail: 'marcos@farma.com.br', plan: 'Starter', amount: 49, status: 'failed', date: '2026-06-29 09:12', stripeId: 'ch_3Mv82YF90s21C' },
    { id: 'inv-104', customerName: 'Júlia Azevedo', customerEmail: 'julia@agenciagrow.io', plan: 'Pro', amount: 99, status: 'paid', date: '2026-06-28 14:33', stripeId: 'ch_3Mv82YF90s21D' },
    { id: 'inv-105', customerName: 'Thiago Costa', customerEmail: 'thiago@cortes.com', plan: 'Pro', amount: 99, status: 'refunded', date: '2026-06-27 11:05', stripeId: 'ch_3Mv82YF90s21E' },
    { id: 'inv-106', customerName: 'Eduarda Melo', customerEmail: 'eduarda@ecom.io', plan: 'Business', amount: 199, status: 'paid', date: '2026-06-26 15:50', stripeId: 'ch_3Mv82YF90s21F' }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inv.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.stripeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleRefund = (id: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        showToast(`Reembolso emitido com sucesso para ${inv.customerName} (Valor: R$ ${inv.amount}).`, 'success');
        return { ...inv, status: 'refunded' };
      }
      return inv;
    }));
  };

  const handleExportCSV = () => {
    const headers = 'ID,Cliente,Email,Plano,Valor,Status,Data,StripeID\n';
    const rows = filteredInvoices.map(inv => 
      `"${inv.id}","${inv.customerName}","${inv.customerEmail}","${inv.plan}",${inv.amount},"${inv.status}","${inv.date}","${inv.stripeId}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `viral-factory-faturamento-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório CSV exportado e baixado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI: Recorrência Líquida */}
        <div className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">MRR Consolidado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">R$ 14.850</h3>
            <p className="text-[10px] text-slate-500 font-mono">Faturamento recorrente do mês corrente</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+12% novas conversões Stripe</span>
          </div>
        </div>

        {/* KPI: LTV do Usuário */}
        <div className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">LTV Consumidor</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">R$ 1.220</h3>
            <p className="text-[10px] text-slate-500 font-mono">Lifetime Value médio estimado</p>
          </div>
          <span className="text-[10px] text-indigo-400 font-mono font-semibold">
            Período médio de retenção: 8.4 meses
          </span>
        </div>

        {/* KPI: CAC */}
        <div className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">CAC Médio</span>
            <CheckCircle className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">R$ 42,50</h3>
            <p className="text-[10px] text-slate-500 font-mono">Custo de Aquisição de Clientes</p>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">
            Relação LTV / CAC: 28.7x (Altíssimo ROI)
          </span>
        </div>

      </div>

      {/* Transactions and controls bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Transações Recentes</h3>
          <p className="text-xs text-slate-400">Rastreamento de webhook do gateway Stripe em tempo real.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtro Stripe ID ou nome..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 rounded-lg py-1.5 pl-9 pr-3 text-[11px] text-white focus:outline-none focus:border-pink-500 placeholder-slate-500"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-850 text-slate-400 text-[11px] py-1.5 px-3 rounded-lg focus:outline-none cursor-pointer font-semibold"
          >
            <option value="all">Todas as Cobranças</option>
            <option value="paid">Pagas</option>
            <option value="failed">Falhas</option>
            <option value="refunded">Reembolsadas</option>
          </select>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-500" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Invoice list table */}
      <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-500 font-mono font-bold uppercase tracking-wider">
                <th className="py-3 px-6">ID Fatura</th>
                <th className="py-3 px-6">Cliente</th>
                <th className="py-3 px-6">Plano Contratado</th>
                <th className="py-3 px-6 text-right">Valor Líquido</th>
                <th className="py-3 px-6">Código de Processo Stripe</th>
                <th className="py-3 px-6">Data de Liquidação</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 font-medium font-mono text-slate-300">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-900/20 transition text-[11px]">
                  <td className="py-3.5 px-6 font-bold text-white">{inv.id}</td>
                  
                  {/* Customer details with graphic icon */}
                  <td className="py-3.5 px-6 font-sans">
                    <span className="font-semibold block text-white">{inv.customerName}</span>
                    <span className="text-[10px] text-slate-500 block">{inv.customerEmail}</span>
                  </td>

                  <td className="py-3.5 px-6 font-sans">
                    <span className="text-slate-200">{inv.plan}</span>
                  </td>

                  <td className="py-3.5 px-6 text-right font-bold text-white">
                    R$ {inv.amount.toLocaleString('pt-BR')}
                  </td>

                  <td className="py-3.5 px-6 text-slate-500 text-[10px]">
                    {inv.stripeId}
                  </td>

                  <td className="py-3.5 px-6 text-slate-400 text-[10px]">
                    {inv.date}
                  </td>

                  {/* Status column */}
                  <td className="py-3.5 px-6 font-sans">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      inv.status === 'paid' 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                        : inv.status === 'refunded'
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                        : 'bg-red-500/5 border-red-500/20 text-red-400'
                    }`}>
                      {inv.status === 'paid' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                      {inv.status === 'refunded' && <RotateCcw className="w-3 h-3 text-amber-400" />}
                      {inv.status === 'failed' && <XCircle className="w-3 h-3 text-red-400" />}
                      {inv.status === 'paid' ? 'Pago' : inv.status === 'refunded' ? 'Reembolsado' : 'Recusado'}
                    </span>
                  </td>

                  {/* Refund trigger */}
                  <td className="py-3.5 px-6 text-right font-sans">
                    {inv.status === 'paid' && (
                      <button
                        onClick={() => handleRefund(inv.id)}
                        className="px-2.5 py-1 hover:bg-red-950/15 border border-transparent hover:border-red-500/20 rounded-lg text-[10px] font-bold text-red-400 transition cursor-pointer"
                      >
                        Estornar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
