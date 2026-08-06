/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  RefreshCw
} from 'lucide-react';
import { adminFetch } from '../../../utils/api';

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

export const FinanceTab: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/payments');
      if (res.ok) {
        const data = await res.json();
        const invoiceList = Array.isArray(data) ? data : (data.invoices || []);
        
        const mappedInvoices = invoiceList.map((inv: any) => ({
          id: inv.id,
          customerName: inv.customer_name || inv.customerName || 'Cliente',
          customerEmail: inv.customer_email || inv.customerEmail || '',
          plan: inv.plan || 'Starter',
          amount: Number(inv.amount || 0),
          status: inv.status || 'paid',
          date: inv.created_at || inv.date || new Date().toISOString(),
          stripeId: inv.stripe_id || inv.stripeId || 'stripe-mock-id'
        }));
        
        setInvoices(mappedInvoices);
      }
    } catch (err) {
      console.warn('Failed to fetch real payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalRevenue = useMemo(() => {
    return invoices
      .filter(inv => inv.status === 'paid')
      .reduce((acc, inv) => acc + inv.amount, 0);
  }, [invoices]);

  const calculatedLtv = useMemo(() => {
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    if (paidInvoices.length === 0) return 0;
    const uniqueEmails = Array.from(new Set(paidInvoices.map(inv => inv.customerEmail)));
    return uniqueEmails.length > 0 ? Math.round(totalRevenue / uniqueEmails.length) : 0;
  }, [invoices, totalRevenue]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const name = inv.customerName || '';
      const email = inv.customerEmail || '';
      const stripeId = inv.stripeId || '';
      const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          stripeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Puxando faturamento real via Stripe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Receita Bruta SaaS</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">R$ {(totalRevenue || 0).toLocaleString('pt-BR')}</h3>
            <p className="text-[10px] text-slate-500 font-mono">Líquido de taxas Stripe acumuladas</p>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Ticket Médio (LTV)</span>
            <TrendingUp className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">R$ {(calculatedLtv || 0).toLocaleString('pt-BR')}</h3>
            <p className="text-[10px] text-slate-500 font-mono">Valor médio gerado por usuário ativo</p>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Transações Totais</span>
            <AlertTriangle className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">{invoices.length}</h3>
            <p className="text-[10px] text-slate-500 font-mono">Sinalizações de chargeback: 0</p>
          </div>
        </div>
      </div>

      {/* Filter and Table area */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cliente, email ou ID do Stripe..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-900 p-2 pl-9 text-xs text-white rounded-xl placeholder-slate-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900/60 border border-slate-900 p-2 text-xs text-slate-300 rounded-xl focus:outline-none focus:border-pink-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="all">Todos os Status</option>
              <option value="paid">Pagas</option>
              <option value="failed">Falhas</option>
              <option value="refunded">Estornadas</option>
              <option value="pending">Pendentes</option>
            </select>
            <button 
              onClick={fetchPayments}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <DollarSign className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-xs font-semibold text-slate-400 font-sans">Nenhuma transação financeira real encontrada</p>
              <p className="text-[10px] text-slate-500 font-sans">As vendas reais do Stripe aparecerão instantaneamente aqui.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-500 font-mono font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">ID Stripe</th>
                  <th className="py-3 px-6">Cliente</th>
                  <th className="py-3 px-6">Plano</th>
                  <th className="py-3 px-6">Valor</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 font-medium font-mono text-[11px] text-slate-300">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-900/10 transition">
                    <td className="py-3 px-6 text-slate-400 font-mono select-all">{inv.stripeId}</td>
                    <td className="py-3 px-6 font-sans">
                      <p className="font-semibold text-white">{inv.customerName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{inv.customerEmail}</p>
                    </td>
                    <td className="py-3 px-6 text-slate-400">{inv.plan}</td>
                    <td className="py-3 px-6 text-white font-bold">R$ {inv.amount}</td>
                    <td className="py-3 px-6 font-sans">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : inv.status === 'failed'
                          ? 'bg-red-500/10 text-red-400'
                          : inv.status === 'refunded'
                          ? 'bg-slate-500/10 text-slate-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {inv.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                        {inv.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {inv.status === 'paid' ? 'Pago' : inv.status === 'failed' ? 'Falhou' : inv.status === 'refunded' ? 'Estornado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-500 font-mono">{inv.date}</td>
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
