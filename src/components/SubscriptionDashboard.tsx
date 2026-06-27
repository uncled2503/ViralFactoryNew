/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PLANS_DETAILS, PLAN_LIMITS_MAP } from '../config/plans';
import { PlanTier, BillingCycle } from '../types';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Receipt, 
  ChevronRight, 
  Sparkles, 
  TrendingUp, 
  Database, 
  FolderHeart, 
  Layers, 
  HelpCircle,
  FileText
} from 'lucide-react';

export const SubscriptionDashboard: React.FC = () => {
  const { 
    user, 
    changeSubscription, 
    cancelSubscription, 
    invoices, 
    triggerMockRenewal,
    projects,
    templates,
    folders
  } = useApp();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showCheckout, setShowCheckout] = useState<PlanTier | null>(null);
  const [processingSub, setProcessingSub] = useState(false);

  if (!user) return null;

  const currentPlan = PLANS_DETAILS.find(p => p.tier === user.subscription) || PLANS_DETAILS[0];
  const limits = PLAN_LIMITS_MAP[user.subscription];

  // Calculations for display
  const totalStorageMB = user.storageUsedMB || 0;
  const storageLimitMB = limits.maxStorageMB;
  const storageProgress = Math.min((totalStorageMB / storageLimitMB) * 100, 100);

  const videosProgress = Math.min((user.usageCurrent / limits.maxVideosPerMonth) * 100, 100);
  const templatesProgress = limits.maxTemplates === 99999 
    ? 0 
    : Math.min((templates.length / limits.maxTemplates) * 100, 100);

  const activeProjectsCount = projects.filter(p => p.status !== 'completed' && p.status !== 'failed').length;
  const projectsProgress = limits.maxProjects === 99999
    ? 0
    : Math.min((activeProjectsCount / limits.maxProjects) * 100, 100);

  const handleSubscribe = (tier: PlanTier) => {
    // If selecting current tier, ignore
    if (tier === user.subscription) return;
    
    // Open stripe-like mockup overlay
    setShowCheckout(tier);
  };

  const confirmCheckout = () => {
    if (!showCheckout) return;
    setProcessingSub(true);
    
    setTimeout(() => {
      changeSubscription(showCheckout, billingCycle);
      setProcessingSub(false);
      setShowCheckout(null);
    }, 1200);
  };

  const getRenewalDateStr = () => {
    if (user.subscriptionDetails?.endDate) {
      return new Date(user.subscriptionDetails.endDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Minha Assinatura
            <span className="text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-mono py-0.5 px-2 rounded-full font-normal">
              SaaS Billing
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie seu plano, controle limites de processamento de vídeos e consulte faturas anteriores.
          </p>
        </div>

        {/* Rapid Testing Simulation controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={triggerMockRenewal}
            className="flex items-center gap-1.5 text-xs bg-gray-900 border border-gray-800 hover:border-gray-700 hover:text-white px-3 py-2 rounded-lg text-gray-400 transition-all font-mono"
            title="Simula o recebimento do webhook de pagamento automático do Stripe, reiniciando o consumo mensal."
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin-hover" />
            Simular Renovação Mensal
          </button>
        </div>
      </div>

      {/* Subscription Quick Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-gray-800">
            <Sparkles className="w-14 h-14" />
          </div>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Plano Atual</p>
          <h2 className="text-xl font-bold text-white mt-1 uppercase tracking-tight">
            {user.subscription}
          </h2>
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-[10px] font-mono rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
            {user.status === 'active' ? '● Assinatura Ativa' : '● Suspensa'}
          </span>
        </div>

        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Investimento Mensal</p>
          <h2 className="text-xl font-bold text-white mt-1">
            {user.subscription === 'Starter' && 'R$ 49,00'}
            {user.subscription === 'Pro' && 'R$ 149,00'}
            {user.subscription === 'Business' && 'R$ 499,00'}
            <span className="text-xs text-gray-500 font-normal"> /mês</span>
          </h2>
          <p className="text-[11px] text-gray-400 mt-2 font-mono">
            Cobrado via {user.subscriptionDetails?.billingCycle === 'annual' ? 'Cartão Anual' : 'Cartão Mensal'}
          </p>
        </div>

        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Próxima Renovação</p>
          <h2 className="text-xl font-bold text-white mt-1">
            {getRenewalDateStr()}
          </h2>
          <p className="text-[11px] text-gray-400 mt-2 font-mono">
            {user.subscriptionDetails?.cancelAtPeriodEnd ? 'Cancelamento programado' : 'Renovação Automática Ativa'}
          </p>
        </div>

        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Forma de Pagamento</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="bg-indigo-600/10 text-indigo-400 p-1.5 rounded-md border border-indigo-600/15">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono text-gray-300">•••• 4242 (Stripe)</span>
            </div>
          </div>
          {user.subscriptionDetails && !user.subscriptionDetails.cancelAtPeriodEnd && (
            <button
              onClick={cancelSubscription}
              className="text-[10px] text-red-400 hover:text-red-300 transition-colors text-left font-mono mt-3 hover:underline"
            >
              Cancelar renovação automática
            </button>
          )}
        </div>
      </div>

      {/* Consumption Quotas Visualizer */}
      <div className="bg-gray-950 border border-gray-900 rounded-xl p-6">
        <h3 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          Consumo da Franquia de Recursos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quota: Videos Rendered */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Vídeos Renderizados</span>
              <span className="text-white font-medium">
                {user.usageCurrent} / {limits.maxVideosPerMonth}
              </span>
            </div>
            <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  videosProgress > 85 ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-600 to-indigo-500'
                }`}
                style={{ width: `${videosProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Contador de renders reinicia em {getRenewalDateStr()}.
            </p>
          </div>

          {/* Quota: Storage */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Armazenamento em Disco</span>
              <span className="text-white font-medium">
                {totalStorageMB >= 1024 ? `${(totalStorageMB / 1024).toFixed(1)} GB` : `${totalStorageMB.toFixed(0)} MB`} / {limits.maxStorageMB >= 1024 ? `${(limits.maxStorageMB / 1024).toFixed(0)} GB` : `${limits.maxStorageMB} MB`}
              </span>
            </div>
            <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  storageProgress > 85 ? 'bg-red-500' : 'bg-gradient-to-r from-pink-500 to-rose-400'
                }`}
                style={{ width: `${storageProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Total consolidado de uploads brutos, logos e clipes finais.
            </p>
          </div>

          {/* Quota: Templates */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Templates Customizados</span>
              <span className="text-white font-medium">
                {limits.maxTemplates === 99999 ? 'Ilimitado' : `${templates.length} / ${limits.maxTemplates}`}
              </span>
            </div>
            {limits.maxTemplates === 99999 ? (
              <div className="h-2 w-full bg-gray-900/50 rounded-full flex items-center px-1">
                <span className="text-[9px] font-mono text-indigo-400/80 uppercase">Desbloqueado Ilimitado</span>
              </div>
            ) : (
              <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${templatesProgress}%` }}
                />
              </div>
            )}
            <p className="text-[11px] text-gray-500">
              Estruturas dinâmicas registradas para criação.
            </p>
          </div>

          {/* Quota: Active Projects */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Projetos Ativos</span>
              <span className="text-white font-medium">
                {limits.maxProjects === 99999 ? 'Ilimitado' : `${activeProjectsCount} / ${limits.maxProjects}`}
              </span>
            </div>
            {limits.maxProjects === 99999 ? (
              <div className="h-2 w-full bg-gray-900/50 rounded-full flex items-center px-1">
                <span className="text-[9px] font-mono text-pink-400/80 uppercase">Desbloqueado Ilimitado</span>
              </div>
            ) : (
              <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-500"
                  style={{ width: `${projectsProgress}%` }}
                />
              </div>
            )}
            <p className="text-[11px] text-gray-500">
              Projetos de edição de shorts ativos simultâneos.
            </p>
          </div>
        </div>
      </div>

      {/* Plans Pricing Block */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Nossos Planos de Escala</h2>
          <p className="text-xs text-gray-400">
            Aumente seu throughput diário de renderização. Mude de plano a qualquer momento sem taxas ocultas.
          </p>

          {/* Pricing Cycle Toggle */}
          <div className="inline-flex items-center gap-1 bg-gray-950 border border-gray-900 rounded-full p-1 mt-2">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`text-xs px-4 py-1.5 rounded-full transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Faturamento Mensal
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`text-xs px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Faturamento Anual
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-mono border border-emerald-500/20 py-0.5 px-1.5 rounded-full font-bold">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS_DETAILS.map(p => {
            const isCurrent = user.subscription === p.tier;
            const price = billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly;

            return (
              <div
                key={p.tier}
                className={`relative flex flex-col justify-between bg-gray-950 border rounded-xl overflow-hidden p-6 transition-all duration-300 hover:border-gray-800 ${
                  isCurrent 
                    ? 'border-indigo-600 shadow-lg shadow-indigo-600/5 ring-1 ring-indigo-500/30' 
                    : 'border-gray-900'
                }`}
              >
                {/* Popular Highlight Badge */}
                {p.tier === 'Pro' && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-violet-600 to-pink-500 text-white text-[9px] font-mono uppercase tracking-wider px-3.5 py-1 rounded-bl-xl font-bold">
                    Recomendado
                  </div>
                )}

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    {p.name}
                    {isCurrent && (
                      <span className="text-[10px] font-mono font-normal bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        Plano Ativo
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 min-h-[32px]">{p.description}</p>

                  {/* Pricing value */}
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-bold text-white tracking-tight">
                      R$ {price}
                    </span>
                    <span className="text-xs text-gray-500 font-mono ml-1">/mês</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {billingCycle === 'annual' ? `Cobrado R$ ${price * 12} ao ano` : 'Cancelável a qualquer momento'}
                  </p>

                  {/* Feature Checklist */}
                  <ul className="mt-6 space-y-3 border-t border-gray-900/60 pt-5">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full bg-indigo-600/15 text-indigo-400 border border-indigo-600/20 py-2.5 px-4 rounded-lg font-medium text-xs font-sans cursor-default text-center"
                    >
                      Seu Plano Atual
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(p.tier)}
                      className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs text-center transition-all ${
                        p.tier === 'Pro'
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-indigo-600/10'
                          : 'bg-gray-900 hover:bg-gray-850 text-white border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {p.tier === 'Business' ? 'Mudar para Business' : 'Contratar Plano'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Invoice History Table */}
      <div className="bg-gray-950 border border-gray-900 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-900/60 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" />
            Histórico de Faturas
          </h3>
          <span className="text-xs font-mono text-gray-500">
            {invoices.length} faturas emitidas
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs font-mono">
            Nenhuma fatura encontrada neste registro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-950 text-gray-500 text-[10px] font-mono uppercase tracking-wider border-b border-gray-900">
                  <th className="py-3 px-6">Identificador</th>
                  <th className="py-3 px-6">Data de Pagamento</th>
                  <th className="py-3 px-6">Período de Faturamento</th>
                  <th className="py-3 px-6">Valor Total</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/40 text-xs">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-900/20 text-gray-300">
                    <td className="py-3 px-6 font-mono text-gray-400">{inv.id}</td>
                    <td className="py-3 px-6">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 px-6 font-mono text-gray-400 text-[11px]">
                      {new Date(inv.billingPeriodStart).toLocaleDateString('pt-BR')} - {new Date(inv.billingPeriodEnd).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-6 font-medium text-white">
                      R$ {inv.amount},00
                    </td>
                    <td className="py-3 px-6">
                      <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-mono">
                        Pago
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); alert('Nota fiscal gerada! Iniciando download simulado do PDF do Stripe...'); }}
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline font-mono"
                      >
                        <FileText className="w-3 h-3" />
                        PDF Invoice
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stripe Checkout Mock Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-950 border border-gray-900 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gray-900/50 p-6 border-b border-gray-900 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  Checkout Integrado (Stripe Mock)
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Ambiente de testes do desenvolvedor. Nenhuma cobrança real será feita.
                </p>
              </div>
              <button 
                onClick={() => setShowCheckout(null)}
                className="text-gray-500 hover:text-white text-xs font-mono border border-gray-800 hover:border-gray-700 bg-gray-950 p-1 px-2.5 rounded-lg"
              >
                Voltar
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Order Info summary */}
              <div className="bg-gray-900/40 border border-gray-900 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-gray-500">Plano Selecionado</span>
                  <p className="text-sm font-bold text-white">{showCheckout}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-gray-500">Total a Pagar</span>
                  <p className="text-base font-bold text-indigo-400">
                    R$ {billingCycle === 'annual' ? (PLANS_DETAILS.find(p => p.tier === showCheckout)?.priceAnnual || 0) * 12 : PLANS_DETAILS.find(p => p.tier === showCheckout)?.priceMonthly || 0},00
                    <span className="text-xs text-gray-500 font-mono">/{billingCycle === 'annual' ? 'ano' : 'mês'}</span>
                  </p>
                </div>
              </div>

              {/* Stripe-like form fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-500 uppercase">E-mail de Cobrança</label>
                  <input
                    type="text"
                    disabled
                    value={user.email}
                    className="w-full bg-gray-900 border border-gray-850 rounded-lg py-2 px-3 text-xs text-gray-400 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Número do Cartão</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-gray-900/60 border border-gray-800 rounded-lg py-2 px-3 pl-10 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-500">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Vencimento</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="w-full bg-gray-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">CVC</label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full bg-gray-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Sandbox terms */}
              <p className="text-[10px] text-gray-500 leading-normal bg-indigo-950/20 border border-indigo-950/40 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Este checkout simula perfeitamente uma transação real do gateway. Ao clicar em confirmar, a assinatura será atualizada em seu perfil e seu limites serão ampliados imediatamente na sandbox.
                </span>
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-gray-900/20 border-t border-gray-900 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCheckout(null)}
                className="text-xs text-gray-400 hover:text-white px-4 py-2 font-mono"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCheckout}
                disabled={processingSub}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 px-5 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10"
              >
                {processingSub ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Pagamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
