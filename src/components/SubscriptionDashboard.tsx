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
  Layers, 
  HelpCircle,
  FileText,
  Clock,
  Zap,
  Film,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SubscriptionDashboard: React.FC = () => {
  const { 
    user, 
    changeSubscription, 
    cancelSubscription, 
    invoices, 
    triggerMockRenewal,
    projects,
    templates,
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
    if (tier === user.subscription) return;
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      className="space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <span>Assinatura & Faturamento</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Controle cotas de processamento, simule pagamentos via Stripe e analise o ROI obtido com nossa automação.
          </p>
        </div>

        {/* Rapid Testing Simulation controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={triggerMockRenewal}
            className="flex items-center gap-1.5 text-[10px] bg-gray-950 border border-gray-900 hover:border-gray-850 hover:text-white px-3 py-2 rounded-xl text-gray-400 transition-all font-mono shadow-sm cursor-pointer"
            title="Simula o recebimento do webhook de pagamento do Stripe, renovando sua franquia."
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
            <span>Simular Renovação</span>
          </button>
        </div>
      </div>

      {/* 2. VALUE-FIRST BILLING DASHBOARD: DIRECT BUSINESS VALUE DELIVERED */}
      <motion.div 
        variants={itemVariants}
        className="relative p-6 rounded-2xl border border-indigo-950/40 bg-gradient-to-br from-gray-950 via-indigo-950/10 to-gray-950 overflow-hidden shadow-xl"
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3">
            <div>
              <span className="text-[9px] font-mono text-indigo-400 tracking-wider font-extrabold uppercase">ESTATÍSTICAS DE ROI</span>
              <h2 className="text-sm font-bold text-gray-200 mt-0.5">Valor de Negócio Entregue na Sandbox</h2>
            </div>
            <span className="text-[9px] font-mono text-gray-500 bg-gray-950 border border-gray-900 px-2 py-1 rounded">Sua produtividade saltou em 840% ⚡</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Hours Saved */}
            <div className="p-4 rounded-xl bg-gray-950/50 border border-gray-900 text-center space-y-1 hover:border-indigo-500/15 transition">
              <Clock className="w-5 h-5 text-indigo-400 mx-auto" />
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-semibold">Horas Economizadas</p>
              <h3 className="text-lg font-bold font-mono text-white">142h</h3>
              <span className="text-[8px] text-indigo-300 block font-mono">~17.5 dias úteis</span>
            </div>

            {/* Videos Produced */}
            <div className="p-4 rounded-xl bg-gray-950/50 border border-gray-900 text-center space-y-1 hover:border-purple-500/15 transition">
              <Film className="w-5 h-5 text-purple-400 mx-auto" />
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-semibold">Vídeos Gerados</p>
              <h3 className="text-lg font-bold font-mono text-white">1.240</h3>
              <span className="text-[8px] text-purple-300 block font-mono">Em lote automático</span>
            </div>

            {/* Templates Utilized */}
            <div className="p-4 rounded-xl bg-gray-950/50 border border-gray-900 text-center space-y-1 hover:border-pink-500/15 transition">
              <Layers className="w-5 h-5 text-pink-400 mx-auto" />
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-semibold">Templates Deploy</p>
              <h3 className="text-lg font-bold font-mono text-white">12</h3>
              <span className="text-[8px] text-pink-300 block font-mono">Reutilizados em lote</span>
            </div>

            {/* Storage bandwidth */}
            <div className="p-4 rounded-xl bg-gray-950/50 border border-gray-900 text-center space-y-1 hover:border-emerald-500/15 transition">
              <Database className="w-5 h-5 text-emerald-400 mx-auto" />
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-semibold">Ativos em Disco</p>
              <h3 className="text-lg font-bold font-mono text-white">12.4 GB</h3>
              <span className="text-[8px] text-emerald-300 block font-mono">Armazenados no SaaS</span>
            </div>

            {/* FFmpeg Renders */}
            <div className="p-4 rounded-xl bg-gray-950/50 border border-gray-900 col-span-2 md:col-span-1 text-center space-y-1 hover:border-indigo-500/15 transition">
              <Zap className="w-5 h-5 text-yellow-400 mx-auto" />
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-semibold">FFmpeg Jobs</p>
              <h3 className="text-lg font-bold font-mono text-white">340</h3>
              <span className="text-[8px] text-yellow-300 block font-mono">Render priority high</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. SUBSCRIPTION QUICK SUMMARY ROW */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-gray-900 pointer-events-none">
            <Sparkles className="w-12 h-12" />
          </div>
          <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Plano Atual</p>
          <h2 className="text-lg font-black text-white mt-1 uppercase tracking-tight">
            {user.subscription}
          </h2>
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-[8px] font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {user.status === 'active' ? '● Assinatura Ativa' : '● Suspensa'}
          </span>
        </div>

        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5">
          <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Investimento</p>
          <h2 className="text-lg font-bold text-white mt-1">
            {user.subscription === 'Starter' && 'R$ 49,00'}
            {user.subscription === 'Pro' && 'R$ 149,00'}
            {user.subscription === 'Business' && 'R$ 499,00'}
            <span className="text-[10px] text-gray-500 font-normal"> /mês</span>
          </h2>
          <p className="text-[10px] text-gray-400 mt-2 font-mono">
            Ciclo: {user.subscriptionDetails?.billingCycle === 'annual' ? 'Anual' : 'Mensal'}
          </p>
        </div>

        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5">
          <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Renovação</p>
          <h2 className="text-lg font-bold text-white mt-1">
            {getRenewalDateStr()}
          </h2>
          <p className="text-[10px] text-gray-400 mt-2 font-mono">
            {user.subscriptionDetails?.cancelAtPeriodEnd ? 'Cancelamento programado' : 'Renovação Ativa'}
          </p>
        </div>

        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Forma de Pagamento</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="bg-indigo-600/10 text-indigo-400 p-1 rounded border border-indigo-600/15">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-mono text-gray-300">•••• 4242 (Stripe)</span>
            </div>
          </div>
          {user.subscriptionDetails && !user.subscriptionDetails.cancelAtPeriodEnd && (
            <button
              onClick={cancelSubscription}
              className="text-[9px] text-red-400 hover:text-red-300 transition-colors text-left font-mono mt-3 hover:underline"
            >
              Cancelar renovação
            </button>
          )}
        </div>
      </motion.div>

      {/* 4. RESOURCE CONSUMPTION QUOTAS */}
      <motion.div variants={itemVariants} className="bg-gray-950 border border-gray-900 rounded-xl p-6">
        <h3 className="text-xs font-bold font-mono text-gray-300 mb-6 flex items-center gap-2 uppercase tracking-wider">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <span>Consumo de Recursos do Plano</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quota: Videos Rendered */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Vídeos Renderizados</span>
              <span className="text-white font-semibold">
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
            <p className="text-[10px] text-gray-500 font-mono">
              Contador de fatias reinicia em {getRenewalDateStr()}.
            </p>
          </div>

          {/* Quota: Storage */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Armazenamento Cloud</span>
              <span className="text-white font-semibold">
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
            <p className="text-[10px] text-gray-500 font-mono">
              Consolida uploads de gameplays e clipes ZIP finais.
            </p>
          </div>
        </div>
      </motion.div>

      {/* 5. HIGH-END PLANS PRICING SECTORS */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">Planos Profissionais para Criadores</h2>
          <p className="text-xs text-gray-400">
            Aumente seu volume de renderização diária. Faça o upgrade e libere workers dedicados em GPU.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-1 bg-gray-950 border border-gray-900 rounded-full p-1 mt-2">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`text-[11px] font-bold px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Faturamento Mensal
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`text-[11px] font-bold px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Faturamento Anual
              <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-mono border border-emerald-500/20 py-0.5 px-1.5 rounded-full font-bold animate-pulse">
                Salva 20%
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
                className={`relative flex flex-col justify-between bg-gray-950 border rounded-2xl overflow-hidden p-6 transition-all duration-300 hover:border-gray-800 ${
                  isCurrent 
                    ? 'border-indigo-600 shadow-xl shadow-indigo-600/5 ring-1 ring-indigo-500/20' 
                    : 'border-gray-900'
                }`}
              >
                {p.tier === 'Pro' && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-violet-600 to-pink-500 text-white text-[9px] font-mono uppercase tracking-wider px-3.5 py-1 rounded-bl-xl font-bold">
                    Recomendado
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    {p.name}
                    {isCurrent && (
                      <span className="text-[9px] font-mono font-normal bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-2 min-h-[32px]">{p.description}</p>

                  <div className="mt-4 flex items-baseline">
                    <span className="text-2xl font-black text-white tracking-tight">
                      R$ {price}
                    </span>
                    <span className="text-xs text-gray-500 font-mono ml-1">/mês</span>
                  </div>
                  <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                    {billingCycle === 'annual' ? `Cobrado R$ ${price * 12} ao ano` : 'Cancele quando quiser'}
                  </p>

                  {/* Feature list */}
                  <ul className="mt-6 space-y-3 border-t border-gray-900/60 pt-5">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 py-2.5 px-4 rounded-xl font-medium text-xs font-sans cursor-default text-center"
                    >
                      Seu Plano Atual
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(p.tier)}
                      className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs text-center transition-all cursor-pointer ${
                        p.tier === 'Pro'
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-indigo-600/10'
                          : 'bg-gray-900 hover:bg-gray-850 text-white border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {p.tier === 'Business' ? 'Falar com Vendas' : 'Contratar Plano'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 6. BILLING INVOICE HISTORY TABLE */}
      <motion.div variants={itemVariants} className="bg-gray-950 border border-gray-900 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-900/60 flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono text-gray-300 flex items-center gap-2 uppercase">
            <Receipt className="w-4 h-4 text-indigo-400" />
            <span>Faturas e Recibos</span>
          </h3>
          <span className="text-[10px] font-mono text-gray-500">
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
                <tr className="bg-gray-950 text-gray-500 text-[9px] font-mono uppercase tracking-wider border-b border-gray-900">
                  <th className="py-3 px-6">Identificador</th>
                  <th className="py-3 px-6">Data</th>
                  <th className="py-3 px-6">Período de Faturamento</th>
                  <th className="py-3 px-6">Valor Total</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/40 text-xs text-gray-300">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-900/10 transition">
                    <td className="py-3 px-6 font-mono text-gray-500">{inv.id}</td>
                    <td className="py-3 px-6">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 px-6 font-mono text-gray-500 text-[10px]">
                      {new Date(inv.billingPeriodStart).toLocaleDateString('pt-BR')} - {new Date(inv.billingPeriodEnd).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-6 font-bold text-white">
                      R$ {inv.amount},00
                    </td>
                    <td className="py-3 px-6">
                      <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-mono">
                        Pago
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); alert('Iniciando download simulado da fatura em PDF...'); }}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline font-mono"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        PDF Recibo
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* STRIPE CHECKOUT MOCK GATEWAY OVERLAY */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="bg-gray-900/40 p-6 border-b border-gray-900 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    Stripe Checkout (Mockup)
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">
                    Ambiente seguro de testes do desenvolvedor.
                  </p>
                </div>
                <button 
                  onClick={() => setShowCheckout(null)}
                  className="text-gray-500 hover:text-white text-xs font-mono border border-gray-900 hover:border-gray-800 bg-gray-950 p-1 px-2.5 rounded-lg cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Order Info summary */}
                <div className="bg-gray-900/40 border border-gray-900 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">UPGRADE PARA</span>
                    <p className="text-xs font-extrabold text-white">{showCheckout}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">TOTAL HOJE</span>
                    <p className="text-sm font-black text-indigo-400">
                      R$ {billingCycle === 'annual' ? (PLANS_DETAILS.find(p => p.tier === showCheckout)?.priceAnnual || 0) * 12 : PLANS_DETAILS.find(p => p.tier === showCheckout)?.priceMonthly || 0},00
                      <span className="text-[10px] text-gray-500 font-mono">/{billingCycle === 'annual' ? 'ano' : 'mês'}</span>
                    </p>
                  </div>
                </div>

                {/* Stripe-like form fields */}
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-500 uppercase">E-mail de Cobrança</label>
                    <input
                      type="text"
                      disabled
                      value={user.email}
                      className="w-full bg-gray-900 border border-gray-850 rounded-lg py-2 px-3 text-xs text-gray-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-500 uppercase">Número do Cartão de Crédito</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-gray-900/60 border border-gray-900 rounded-lg py-2 px-3 pl-9 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="absolute left-3 top-2.5 text-gray-500">
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-gray-500 uppercase">Vencimento</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        className="w-full bg-gray-900/60 border border-gray-900 rounded-lg py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-gray-500 uppercase">CVC</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full bg-gray-900/60 border border-gray-900 rounded-lg py-2 px-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed bg-indigo-950/15 border border-indigo-950/30 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Ao prosseguir, seu perfil será instantaneamente promovido para o plano {showCheckout}, reajustando os limites de fatias para testes em tempo real.
                  </span>
                </p>
              </div>

              {/* Modal Actions */}
              <div className="p-6 bg-gray-900/20 border-t border-gray-900 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCheckout(null)}
                  className="text-xs text-gray-400 hover:text-white px-4 py-2 font-mono cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCheckout}
                  disabled={processingSub}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {processingSub ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Assinatura</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
