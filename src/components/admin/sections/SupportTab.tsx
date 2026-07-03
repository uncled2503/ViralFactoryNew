/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LifeBuoy, 
  Mail, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  Play, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';

interface SupportTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Ticket {
  id: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  date: string;
}

interface SmtpEmail {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: 'sent' | 'pending' | 'failed';
  timestamp: string;
}

export const SupportTab: React.FC<SupportTabProps> = ({ showToast }) => {
  const [tickets, setTickets] = useState<Ticket[]>([
    { id: 'tkt-01', customerName: 'Bruna Silva', customerEmail: 'bruna@ecom.com', subject: 'Problemas de enquadramento 9:16', message: 'Olá, quando utilizo o template Reddit stories, as legendas inferiores ficam cortadas no app do TikTok. Poderiam ajustar o espaçamento vertical?', status: 'open', date: 'Há 15m' },
    { id: 'tkt-02', customerName: 'Lucas Santos', customerEmail: 'lucas@agency.io', subject: 'Solicitação de API Access', message: 'Gostaria de integrar a renderização do Viral Factory diretamente em nossa esteira interna de automação por API. Onde obtenho a Bearer Token?', status: 'resolved', date: 'Há 2h' }
  ]);

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(tickets[0]);
  const [replyText, setReplyText] = useState('');

  const [smtpQueue, setSmtpQueue] = useState<SmtpEmail[]>([
    { id: 'mail-01', to: 'gabriel@viral.io', subject: 'Seu render #prj-039 está pronto!', template: 'video_success_alert', status: 'sent', timestamp: '2026-07-01 11:58' },
    { id: 'mail-02', to: 'renata@vlog.com', subject: 'Fatura de assinatura Pro liquidada', template: 'stripe_invoice_success', status: 'sent', timestamp: '2026-07-01 11:55' },
    { id: 'mail-03', to: 'marcos@farma.com.br', subject: 'Aviso: Falha na cobrança mensal', template: 'billing_failure_alert', status: 'failed', timestamp: '2026-07-01 11:42' },
    { id: 'mail-04', to: 'julia@agenciagrow.io', subject: 'Confirmação de alteração cadastral', template: 'security_audit_alert', status: 'pending', timestamp: '2026-07-01 11:59' }
  ]);

  const handleResolveTicket = (id: string) => {
    if (!replyText) {
      showToast('Digite uma resposta antes de resolver o chamado.', 'error');
      return;
    }
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        showToast('Chamado respondido e resolvido!', 'success');
        const updated = { ...t, status: 'resolved' as const };
        if (activeTicket?.id === id) setActiveTicket(updated);
        return updated;
      }
      return t;
    }));
    setReplyText('');
  };

  const handleRetryFailedEmails = () => {
    setSmtpQueue(prev => prev.map(m => {
      if (m.status === 'failed') {
        showToast(`E-mail enviado com sucesso via SMTP para ${m.to}.`, 'success');
        return { ...m, status: 'sent' as const };
      }
      return m;
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      
      {/* Left Column: Customer support tickets */}
      <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4 flex flex-col h-[520px]">
        <div className="border-b border-slate-900 pb-2">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <LifeBuoy className="w-4 h-4 text-pink-500" /> Chamados de Suporte
          </h3>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          {/* Ticket list panel */}
          <div className="w-1/3 border-r border-slate-900/60 pr-4 overflow-y-auto space-y-2">
            {tickets.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTicket(t)}
                className={`w-full text-left p-2.5 rounded-xl border text-xs space-y-1 block cursor-pointer transition ${
                  activeTicket?.id === t.id
                    ? 'bg-pink-600/10 border-pink-500/30 text-pink-400'
                    : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex justify-between font-mono text-[9px]">
                  <span>{t.id}</span>
                  <span>{t.date}</span>
                </div>
                <h4 className="font-semibold truncate text-white">{t.customerName}</h4>
                <p className="text-[10px] truncate text-slate-500">{t.subject}</p>
              </button>
            ))}
          </div>

          {/* Active Ticket Conversation */}
          <div className="flex-1 flex flex-col justify-between overflow-y-auto pl-2">
            {activeTicket ? (
              <div className="space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-900/40 pb-2">
                    <div className="text-xs">
                      <span className="font-bold text-white">{activeTicket.customerName}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{activeTicket.customerEmail}</span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                      activeTicket.status === 'open' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      {activeTicket.status === 'open' ? 'Aberto' : 'Resolvido'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-white">{activeTicket.subject}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-900">
                      {activeTicket.message}
                    </p>
                  </div>
                </div>

                {activeTicket.status === 'open' && (
                  <div className="space-y-2 pt-2">
                    <textarea
                      placeholder="Escreva sua resposta técnica para o chamado..."
                      rows={3}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
                    />
                    <button
                      onClick={() => handleResolveTicket(activeTicket.id)}
                      className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Enviar Resposta e Fechar Ticket
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                Selecione um chamado ao lado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Outgoing SMTP transactional queues */}
      <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4 flex flex-col h-[520px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-900">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-pink-500" /> Fila Outgoing SMTP (E-mails)
          </h3>
          {smtpQueue.some(m => m.status === 'failed') && (
            <button
              onClick={handleRetryFailedEmails}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[10px] font-bold text-pink-400 hover:text-pink-300 rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3 text-pink-500" />
              Re-enviar Falhas
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {smtpQueue.map(m => (
            <div key={m.id} className="p-3 bg-slate-950 rounded-xl border border-slate-900 flex items-center justify-between text-xs font-mono">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white font-sans text-[11px]">{m.to}</span>
                  <span className="text-[9px] bg-slate-900 border border-slate-850 px-1.5 rounded text-slate-500">
                    {m.template}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans truncate max-w-xs">{m.subject}</p>
                <span className="text-[9px] text-slate-600 block">{m.timestamp}</span>
              </div>

              {/* Status indicator */}
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                m.status === 'sent' 
                  ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' 
                  : m.status === 'pending'
                  ? 'bg-amber-500/5 border-amber-500/15 text-amber-400'
                  : 'bg-red-500/5 border-red-500/15 text-red-400'
              }`}>
                {m.status === 'sent' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                {m.status === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
                {m.status === 'failed' && <XCircle className="w-3 h-3 text-red-400" />}
                {m.status === 'sent' ? 'Enviado' : m.status === 'pending' ? 'Fila' : 'Falhou'}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
