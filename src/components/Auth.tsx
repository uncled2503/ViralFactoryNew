/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogoFull } from './Logo';
import { Sparkles, Mail, Lock, User, Building, ArrowRight, Video, AlertCircle } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, register, recoverPassword } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          setError('Por favor, preencha todos os campos.');
          setIsLoading(false);
          return;
        }
        await login(email, name);
      } else if (mode === 'register') {
        if (!name || !email || !confirmEmail || !company || !password) {
          setError('Por favor, preencha todos os campos para se cadastrar.');
          setIsLoading(false);
          return;
        }
        if (email.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) {
          setError('Os e-mails informados não coincidem.');
          setIsLoading(false);
          return;
        }
        await register(name, email, company);
      } else {
        if (!email) {
          setError('Por favor, digite o e-mail cadastrado.');
          setIsLoading(false);
          return;
        }
        const successMsg = await recoverPassword(email);
        setMessage(successMsg);
      }
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden px-4">
      {/* Cinematic Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none"></div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <LogoFull iconSize={44} textClassName="text-2xl" subTextClassName="text-xs tracking-[0.2em] mt-0.5" />
          </div>
          <p className="text-gray-400 text-sm mt-3">
            {mode === 'login' && 'Bem-vindo de volta! Acesse sua fábrica de vídeos virais.'}
            {mode === 'register' && 'Crie sua conta em segundos e comece a escalar sua produção.'}
            {mode === 'recovery' && 'Redefina sua senha e volte a renderizar.'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-panel rounded-2xl p-8 border border-gray-800/80 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-500/20 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-200 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu Nome Completo"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 rounded-xl border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-200 text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 rounded-xl border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-200 text-sm outline-none transition"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Confirmar E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Confirme seu e-mail"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 rounded-xl border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-200 text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Nome da Empresa / Canal</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Ex: Viral S.A."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 rounded-xl border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-200 text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            {mode !== 'recovery' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Senha</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('recovery'); setError(''); setMessage(''); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-950/60 rounded-xl border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-200 text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 border border-indigo-500/30"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Entrar no Workspace'}
                    {mode === 'register' && 'Criar Minha Conta'}
                    {mode === 'recovery' && 'Enviar Link de Redefinição'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 pt-5 border-t border-gray-900 text-center">
            {mode === 'login' && (
              <p className="text-gray-400 text-xs">
                Ainda não tem conta?{' '}
                <button
                  onClick={() => { setMode('register'); setError(''); setMessage(''); setConfirmEmail(''); }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
                >
                  Cadastre-se grátis
                </button>
              </p>
            )}

            {mode === 'register' && (
              <p className="text-gray-400 text-xs">
                Já possui uma conta?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); setMessage(''); setConfirmEmail(''); }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
                >
                  Fazer login
                </button>
              </p>
            )}

            {mode === 'recovery' && (
              <button
                onClick={() => { setMode('login'); setError(''); setMessage(''); setConfirmEmail(''); }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
              >
                Voltar para o login
              </button>
            )}
          </div>
        </div>

        {/* Demo Fast Login info block */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500/80">
            Dica: Digite qualquer e-mail para testar instantaneamente.
          </p>
        </div>
      </div>
    </div>
  );
};
