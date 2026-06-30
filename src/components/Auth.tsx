/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogoFull } from './Logo';
import { Sparkles, Mail, Lock, User, Building, ArrowRight, Video, AlertCircle } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, register, loginWithGoogle, recoverPassword } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com sua conta Google.');
    } finally {
      setIsLoading(false);
    }
  };

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
        await login(email, password);
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
        await register(name, email, company, password);
      } else {
        if (!email) {
          setError('Por favor, digite o e-mail cadastrado.');
          setIsLoading(false);
          return;
        }
        const successMsg = await recoverPassword(email);
        setMessage(successMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (
        errMsg.includes('Database error saving new user') || 
        errMsg.includes('database error') || 
        errMsg.includes('trigger') ||
        errMsg.includes('saas_users')
      ) {
        setError('Erro de Trigger no Supabase (saas_users ou tabelas ausentes). Para solucionar isso e liberar todos os cadastros imediatamente, execute o script SQL de tabelas fornecido no console ou siga as instruções abaixo para criar a tabela de usuários.');
      } else {
        setError(errMsg || 'Ocorreu um erro. Tente novamente.');
      }
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

            {mode !== 'recovery' && (
              <>
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-900/80"></div>
                  </div>
                  <span className="relative px-3 bg-[#0d101e] text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    ou continue com
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-200 hover:text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-3 cursor-pointer shadow-md"
                >
                  <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Entrar com o Google</span>
                </button>
              </>
            )}
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

        {/* Database Security info block */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-gray-500/80 font-mono">
            Conexão com banco de dados ativa e criptografada.
          </p>
        </div>
      </div>
    </div>
  );
};
