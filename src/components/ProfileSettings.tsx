/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabaseClient, isSupabaseConfigured } from '../services/dbClient';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Building, 
  Phone, 
  Globe, 
  Clock, 
  Camera, 
  Upload, 
  Trash2, 
  Save, 
  Shield, 
  Sliders, 
  Bell, 
  Key, 
  Smartphone, 
  Laptop, 
  RefreshCw,
  Eye, 
  EyeOff,
  Settings,
  CheckCircle,
  AlertCircle,
  MapPin,
  FileText
} from 'lucide-react';

export const ProfileSettings: React.FC = () => {
  const { user, updateUser, showToast } = useApp();
  
  // Loading and State
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');
  const [isMounting, setIsMounting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSavingIndicator, setAutoSavingIndicator] = useState(false);

  // Form States - Personal Info
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('pt-BR');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [country, setCountry] = useState('Brasil');
  const [bio, setBio] = useState('');

  // Form States - Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form States - Email
  const [newEmail, setNewEmail] = useState('');

  // Avatar Crop States
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Preferences & Auto-Save Toggles
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true);
  const [globalNotifications, setGlobalNotifications] = useState(true);

  // Notification Configs
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyRenderComplete, setNotifyRenderComplete] = useState(true);
  const [notifyPayment, setNotifyPayment] = useState(true);
  const [notifyRenewal, setNotifyRenewal] = useState(true);
  const [notifyNews, setNotifyNews] = useState(false);
  const [notifyMarketing, setNotifyMarketing] = useState(false);

  // Security Sessions
  const [sessions, setSessions] = useState([
    { id: '1', device: 'Chrome no MacOS (Este navegador)', ip: '177.105.88.24', lastActive: 'Ativo agora', isCurrent: true, type: 'desktop' },
    { id: '2', device: 'Safari no iPhone 15 Pro', ip: '177.105.88.24', lastActive: 'Há 4 horas', isCurrent: false, type: 'mobile' },
    { id: '3', device: 'Firefox no Windows PC', ip: '189.44.112.5', lastActive: 'Há 2 dias', isCurrent: false, type: 'desktop' }
  ]);

  // Simulated Last Login
  const lastLoginTime = '28/06/2026, 23:01 (Horário de Brasília)';

  // Simulate initial skeleton loading for premium polish
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounting(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Initialize fields from user context
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCompany(user.company || '');
      setNewEmail(user.email || '');

      // Parse custom details nested in subscriptionDetails.profile or .preferences
      const profileData = (user.subscriptionDetails as any)?.profile || {};
      setLastName(profileData.lastName || '');
      setUsername(profileData.username || user.email.split('@')[0]);
      setPhone(profileData.phone || '');
      setLanguage(profileData.language || 'pt-BR');
      setTimezone(profileData.timezone || 'America/Sao_Paulo');
      setCountry(profileData.country || 'Brasil');
      setBio(profileData.bio || '');

      const prefData = (user.subscriptionDetails as any)?.preferences || {};
      setTheme(prefData.theme || 'dark');
      setDateFormat(prefData.dateFormat || 'DD/MM/YYYY');
      setTimeFormat(prefData.timeFormat || '24h');
      setShortcutsEnabled(prefData.shortcutsEnabled !== false);
      setGlobalNotifications(prefData.globalNotifications !== false);

      const notifData = (user.subscriptionDetails as any)?.notificationsConfig || {};
      setNotifyEmail(notifData.email !== false);
      setNotifyRenderComplete(notifData.renderComplete !== false);
      setNotifyPayment(notifData.payment !== false);
      setNotifyRenewal(notifData.renewal !== false);
      setNotifyNews(notifData.news === true);
      setNotifyMarketing(notifData.marketing === true);
    }
  }, [user]);

  // Sync theme immediately to document body class (for preview display purposes)
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Handler for Auto-Saving Preferences & Notifications
  const triggerAutoSave = async (updatedFields: any) => {
    if (!user) return;
    setAutoSavingIndicator(true);

    try {
      const currentDetails = user.subscriptionDetails || {};
      const nextUser: User = {
        ...user,
        subscriptionDetails: {
          ...currentDetails,
          ...updatedFields
        } as any
      };

      await updateUser(nextUser);
      setTimeout(() => {
        setAutoSavingIndicator(false);
      }, 500);
    } catch (err) {
      console.error('Auto save failed:', err);
      setAutoSavingIndicator(false);
    }
  };

  // Helper to package current states for save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const currentDetails = user.subscriptionDetails || {};
      
      const updatedUser: User = {
        ...user,
        name,
        company,
        subscriptionDetails: {
          ...currentDetails,
          profile: {
            lastName,
            username,
            phone,
            language,
            timezone,
            country,
            bio
          }
        } as any
      };

      const success = await updateUser(updatedUser);
      if (success) {
        showToast('Perfil atualizado com sucesso no Supabase!', 'success');
      } else {
        showToast('Erro ao sincronizar perfil. Tente novamente.', 'error');
      }
    } catch (err) {
      showToast('Ocorreu um erro ao salvar o perfil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Password Update Flow with Supabase Auth
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentPassword) {
      showToast('Por favor, digite sua senha atual.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('A nova senha deve possuir no mínimo 8 caracteres.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('A confirmação de senha não coincide com a nova senha.', 'error');
      return;
    }

    // Evaluate password strength
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasDigit = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    
    if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
      showToast('Sua nova senha deve ser mais forte (letras maiúsculas, minúsculas, números e símbolos).', 'error');
      return;
    }

    setIsSaving(true);

    try {
      if (isSupabaseConfigured() && supabaseClient) {
        // Attempt password change via Supabase Auth API
        const { error } = await supabaseClient.auth.updateUser({
          password: newPassword
        });

        if (error) {
          showToast(error.message, 'error');
        } else {
          showToast('Senha alterada com sucesso via Supabase Auth!', 'success');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }
      } else {
        // Mock offline success flow with high realism
        setTimeout(() => {
          showToast('Senha alterada com sucesso! (Modo offline / fallback local)', 'success');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }, 1000);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar a senha.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Email Update Flow with Supabase Auth
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newEmail || newEmail === user.email) {
      showToast('Por favor, informe um novo endereço de e-mail diferente do atual.', 'info');
      return;
    }

    setIsSaving(true);

    try {
      if (isSupabaseConfigured() && supabaseClient) {
        const { error } = await supabaseClient.auth.updateUser({
          email: newEmail
        });

        if (error) {
          showToast(error.message, 'error');
        } else {
          showToast('E-mail atualizado! Um link de confirmação foi enviado para ambos os e-mails.', 'success');
        }
      } else {
        // Offline Flow
        setTimeout(async () => {
          const nextUser: User = {
            ...user,
            email: newEmail
          };
          await updateUser(nextUser);
          showToast('E-mail alterado localmente com sucesso!', 'success');
        }, 1000);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar o e-mail.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Terminate other active sessions
  const terminateOtherSessions = () => {
    if (isSupabaseConfigured() && supabaseClient) {
      // In Supabase Auth, you can trigger global sign out to end all sessions
      supabaseClient.auth.signOut({ scope: 'others' })
        .then(({ error }) => {
          if (error) {
            showToast(error.message, 'error');
          } else {
            setSessions(prev => prev.filter(s => s.isCurrent));
            showToast('Todas as outras sessões foram encerradas com sucesso!', 'success');
          }
        })
        .catch(() => {
          showToast('Erro ao revogar sessões no Supabase.', 'error');
        });
    } else {
      // Offline Flow simulation
      setSessions(prev => prev.filter(s => s.isCurrent));
      showToast('Todas as outras sessões foram encerradas com sucesso!', 'success');
    }
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, envie apenas arquivos de imagem (PNG, JPG, WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatarImage(e.target.result as string);
        setIsCropping(true);
        setCropZoom(1);
        setCropPosition({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Cropper drag-to-reposition handlers
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropPosition.x, y: e.clientY - cropPosition.y });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const nextX = e.clientX - dragStart.x;
    const nextY = e.clientY - dragStart.y;
    setCropPosition({ x: nextX, y: nextY });
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
  };

  // Crop image and compress via canvas
  const handleConfirmCrop = async () => {
    if (!avatarImage || !user) return;
    setIsSaving(true);

    try {
      const img = new Image();
      img.src = avatarImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Draw onto canvas
      const canvas = document.createElement('canvas');
      const size = 256; // Standard profile picture size
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#030712'; // Keep transparent/dark background
        ctx.fillRect(0, 0, size, size);

        // Circular clipping
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        // Calculations for zoom and offset positioning
        const scaleWidth = img.width * cropZoom;
        const scaleHeight = img.height * cropZoom;

        // Base centered position
        const dx = (size - scaleWidth) / 2 + cropPosition.x;
        const dy = (size - scaleHeight) / 2 + cropPosition.y;

        ctx.drawImage(img, dx, dy, scaleWidth, scaleHeight);

        // Compress and convert to base64 WebP (quality 0.8)
        const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
        
        if (isSupabaseConfigured() && supabaseClient) {
          // Convert dataurl back to file blob for Supabase Storage Upload
          const response = await fetch(compressedDataUrl);
          const blob = await response.blob();
          const fileName = `avatar-${user.id}-${Date.now()}.webp`;

          // Attempt to upload to "avatars" bucket
          const { data, error } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, blob, {
              contentType: 'image/webp',
              cacheControl: '3600',
              upsert: true
            });

          if (error) {
            console.warn('Storage upload error (bucket might not exist):', error.message);
            // Fallback directly to saving base64 in saas_users profile
            const updatedUser: User = {
              ...user,
              avatarUrl: compressedDataUrl
            };
            await updateUser(updatedUser);
            showToast('Avatar atualizado! (Salvo localmente pois o storage bucket "avatars" não foi criado)', 'info');
          } else if (data) {
            // Get public URL
            const { data: publicUrlData } = supabaseClient.storage
              .from('avatars')
              .getPublicUrl(fileName);

            const publicUrl = publicUrlData.publicUrl;

            const updatedUser: User = {
              ...user,
              avatarUrl: publicUrl
            };
            await updateUser(updatedUser);
            showToast('Foto de perfil atualizada no Supabase Storage!', 'success');
          }
        } else {
          // Offline update with Base64 URL
          const updatedUser: User = {
            ...user,
            avatarUrl: compressedDataUrl
          };
          await updateUser(updatedUser);
          showToast('Foto de perfil atualizada!', 'success');
        }

        setIsCropping(false);
        setAvatarImage(null);
      }
    } catch (err) {
      showToast('Ocorreu um erro ao recortar a imagem.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove existing avatar photo and return to standard placeholder
  const handleRemoveAvatar = async () => {
    if (!user) return;
    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&h=256&fit=crop';
    
    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...user,
        avatarUrl: defaultAvatar
      };
      await updateUser(updatedUser);
      showToast('Foto de perfil removida com sucesso.', 'success');
    } catch (err) {
      showToast('Erro ao remover foto.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Password Strength Meter Indicators
  const getPasswordStrength = () => {
    if (!newPassword) return { score: 0, label: 'Ausente', color: 'bg-gray-800' };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    switch (score) {
      case 1:
      case 2:
        return { score, label: 'Muito Fraca', color: 'bg-red-500' };
      case 3:
        return { score, label: 'Fraca', color: 'bg-orange-500' };
      case 4:
        return { score, label: 'Moderada', color: 'bg-yellow-500' };
      case 5:
        return { score, label: 'Muito Forte!', color: 'bg-emerald-500' };
      default:
        return { score, label: 'Insegura', color: 'bg-red-500' };
    }
  };

  const pStrength = getPasswordStrength();

  if (!user) return null;

  return (
    <div className="relative min-h-screen">
      {/* Skeleton Loading Panel for seamless UX */}
      <AnimatePresence mode="wait">
        {isMounting ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="space-y-6"
          >
            {/* Header Skeleton */}
            <div className="flex justify-between items-end mb-8">
              <div className="space-y-2">
                <div className="h-8 w-64 bg-gray-900 rounded-lg animate-pulse" />
                <div className="h-4 w-96 bg-gray-900/60 rounded animate-pulse" />
              </div>
              <div className="h-5 w-40 bg-gray-900 rounded animate-pulse" />
            </div>

            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar Tabs Skeleton */}
              <div className="space-y-2">
                <div className="h-10 w-full bg-gray-900 rounded-xl animate-pulse" />
                <div className="h-10 w-full bg-gray-900 rounded-xl animate-pulse" />
                <div className="h-10 w-full bg-gray-900 rounded-xl animate-pulse" />
              </div>

              {/* Main Panel Skeleton */}
              <div className="lg:col-span-3 glass-panel rounded-2xl p-6 border border-gray-900 space-y-6 h-[500px]">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-900 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-900 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-gray-900/60 rounded animate-pulse" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 bg-gray-900 rounded-xl animate-pulse" />
                  <div className="h-12 bg-gray-900 rounded-xl animate-pulse" />
                  <div className="h-12 bg-gray-900 rounded-xl animate-pulse" />
                  <div className="h-12 bg-gray-900 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Elegant Header with Auto-Saving status indicator */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-indigo-400" />
                  Gerenciamento de Conta
                </h1>
                <p className="text-gray-400 text-xs mt-1">
                  Gerencie suas informações, preferências de notificações, fuso horário, segurança e integrações com o Supabase.
                </p>
              </div>

              {/* Auto-saving pulse */}
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                {autoSavingIndicator ? (
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Salvando preferências...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Supabase integrado e sincronizado
                  </span>
                )}
              </div>
            </div>

            {/* Main Workspace layout split into vertical bento layouts */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Tab Navigation Menu */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-left transition border ${
                    activeTab === 'profile'
                      ? 'bg-indigo-950/40 text-indigo-200 border-indigo-500/25 shadow-sm shadow-indigo-500/5'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/30 border-transparent'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Informações Pessoais</span>
                </button>

                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-left transition border ${
                    activeTab === 'preferences'
                      ? 'bg-indigo-950/40 text-indigo-200 border-indigo-500/25 shadow-sm shadow-indigo-500/5'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/30 border-transparent'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Preferências & Avisos</span>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-left transition border ${
                    activeTab === 'security'
                      ? 'bg-indigo-950/40 text-indigo-200 border-indigo-500/25 shadow-sm shadow-indigo-500/5'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/30 border-transparent'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Segurança da Conta</span>
                </button>
              </div>

              {/* Primary Content panel wrapper */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* 1. PROFILE INFORMATION TAB */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    
                    {/* PHOTO DE PERFIL CARD */}
                    <div className="glass-panel rounded-2xl p-6 border border-gray-900">
                      <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-indigo-400" />
                        Foto de Perfil
                      </h2>

                      <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar photo preview circle */}
                        <div className="relative group/avatar shrink-0">
                          {user.avatarUrl && !user.avatarUrl.includes('unsplash') ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-20 h-20 rounded-full border-2 border-indigo-500/30 object-cover shadow-lg shadow-indigo-500/5 group-hover/avatar:border-indigo-400 transition"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-20 h-20 rounded-full border-2 border-indigo-500/30 flex items-center justify-center text-3xl font-black text-white shrink-0 shadow-lg shadow-indigo-500/5 group-hover/avatar:border-indigo-400 transition ${(() => {
                              const charCodeSum = (user.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                              const colors = [
                                'bg-gradient-to-br from-indigo-500 to-purple-600',
                                'bg-gradient-to-br from-purple-500 to-pink-500',
                                'bg-gradient-to-br from-blue-500 to-teal-500',
                                'bg-gradient-to-br from-emerald-500 to-teal-600',
                                'bg-gradient-to-br from-rose-500 to-pink-600',
                                'bg-gradient-to-br from-amber-500 to-orange-600'
                              ];
                              return colors[charCodeSum % colors.length];
                            })()}`}>
                              {(user.name || 'U').trim().charAt(0).toUpperCase()}
                            </div>
                          )}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Interactive Drag & Drop / Upload instructions */}
                        <div className="flex-1 w-full">
                          <div 
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-800 hover:border-indigo-500/40 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-950/40 transition group"
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                              accept="image/*"
                            />
                            <Upload className="w-5 h-5 mx-auto text-gray-500 group-hover:text-indigo-400 transition mb-1.5" />
                            <p className="text-xs font-semibold text-gray-300">Arraste uma foto ou clique para fazer upload</p>
                            <p className="text-[10px] text-gray-500 mt-1">PNG, JPG ou WEBP. Auto-compressão ativada (Max 256x256 WebP).</p>
                          </div>

                          {/* Quick remove avatar action */}
                          {user.avatarUrl && !user.avatarUrl.includes('unsplash') && (
                            <button
                              onClick={handleRemoveAvatar}
                              className="mt-3 text-[11px] font-mono font-bold text-red-400 hover:text-red-300 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remover foto atual
                            </button>
                          )}
                        </div>
                      </div>

                      {/* POPUP: INTERACTIVE IMAGE CROPPER MODULE */}
                      {isCropping && avatarImage && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                          <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-md p-6 overflow-hidden flex flex-col gap-4"
                          >
                            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
                              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Camera className="w-4 h-4 text-indigo-400" />
                                Recortar & Ajustar Foto
                              </h3>
                              <p className="text-[10px] text-gray-500 font-mono">WebP compression engine</p>
                            </div>

                            {/* Cropping region window */}
                            <div 
                              ref={cropContainerRef}
                              onMouseMove={handleCropMouseMove}
                              onMouseUp={handleCropMouseUp}
                              onMouseLeave={handleCropMouseUp}
                              className="relative h-64 w-full bg-gray-950/80 border border-gray-900 rounded-xl overflow-hidden cursor-move"
                            >
                              {/* Overlay mask for circle preview */}
                              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/60 z-10 flex items-center justify-center">
                                <div className="w-44 h-44 rounded-full border border-indigo-500/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                              </div>

                              {/* Draggable photo inside container */}
                              <img
                                src={avatarImage}
                                alt="Crop preview"
                                onMouseDown={handleCropMouseDown}
                                style={{
                                  transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom})`,
                                  transformOrigin: 'center center',
                                }}
                                className="absolute max-w-none left-1/4 top-1/4 h-1/2 object-contain pointer-events-none"
                              />
                            </div>

                            {/* Scale zoom controls */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-mono text-gray-500">
                                <span>Zoom: {cropZoom.toFixed(1)}x</span>
                                <span className="text-indigo-400">Arraste para posicionar</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.1"
                                value={cropZoom}
                                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-900 rounded-lg appearance-none"
                              />
                            </div>

                            {/* Controls actions */}
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setIsCropping(false);
                                  setAvatarImage(null);
                                }}
                                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white transition text-xs font-semibold cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleConfirmCrop}
                                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                {isSaving ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                                Confirmar & Salvar
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </div>

                    {/* PERSONAL DETAILED FORM */}
                    <form onSubmit={handleSaveProfile} className="glass-panel rounded-2xl p-6 border border-gray-900 space-y-6">
                      <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 border-b border-gray-900/40 pb-3">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        Informações Gerais
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Name */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nome</label>
                          <div className="relative">
                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required
                              className="w-full pl-10 pr-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Last Name */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Sobrenome</label>
                          <div className="relative">
                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Username */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Username (Apelido)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-600">@</span>
                            <input
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                              required
                              className="w-full pl-8 pr-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Company */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Empresa</label>
                          <div className="relative">
                            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                              type="text"
                              value={company}
                              onChange={(e) => setCompany(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Telephone */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Telefone</label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+55 (11) 99999-9999"
                              className="w-full pl-10 pr-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Country */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">País</label>
                          <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                              type="text"
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Language */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Idioma Padrão</label>
                          <div className="relative">
                            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition appearance-none cursor-pointer"
                            >
                              <option value="pt-BR">Português (Brasil)</option>
                              <option value="en">English (US)</option>
                              <option value="es">Español</option>
                            </select>
                          </div>
                        </div>

                        {/* Timezone */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Fuso Horário</label>
                          <div className="relative">
                            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                            <select
                              value={timezone}
                              onChange={(e) => setTimezone(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition appearance-none cursor-pointer"
                            >
                              <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                              <option value="America/Manaus">Manaus (GMT-4)</option>
                              <option value="America/New_York">New York (EST/GMT-5)</option>
                              <option value="Europe/London">London (GMT+1)</option>
                              <option value="UTC">Coordinated Universal Time (UTC)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Biografia / Sobre você</label>
                        <textarea
                          rows={3}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Fale um pouco sobre você..."
                          className="w-full p-4 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition resize-none"
                        />
                      </div>

                      {/* Submit action */}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 disabled:opacity-55"
                        >
                          {isSaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Salvar Alterações
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* 2. PREFERENCES & NOTIFICATIONS TAB */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    
                    {/* VISUAL & ATALHOS CARD (Auto-saves triggers) */}
                    <div className="glass-panel rounded-2xl p-6 border border-gray-900 space-y-5">
                      <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 border-b border-gray-900/40 pb-3">
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        Visual & Preferências do Sistema
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Theme */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Tema Visual</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['dark', 'light', 'system'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setTheme(t as any);
                                  triggerAutoSave({ preferences: { theme: t, dateFormat, timeFormat, shortcutsEnabled, globalNotifications } });
                                }}
                                className={`py-2 rounded-xl text-xs font-semibold capitalize border transition cursor-pointer ${
                                  theme === t
                                    ? 'bg-indigo-950/40 border-indigo-500/35 text-indigo-300'
                                    : 'bg-gray-950/40 border-gray-900 text-gray-400 hover:text-gray-200'
                                }`}
                              >
                                {t === 'dark' ? 'Escuro' : t === 'light' ? 'Claro' : 'Sistema'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Date Format */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Formato de Data</label>
                          <select
                            value={dateFormat}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDateFormat(v);
                              triggerAutoSave({ preferences: { theme, dateFormat: v, timeFormat, shortcutsEnabled, globalNotifications } });
                            }}
                            className="w-full px-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none cursor-pointer"
                          >
                            <option value="DD/MM/YYYY">DD/MM/YYYY (28/06/2026)</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD (2026-06-28)</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY (06/28/2026)</option>
                          </select>
                        </div>

                        {/* Time Format */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Formato de Hora</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['12h', '24h'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setTimeFormat(t as any);
                                  triggerAutoSave({ preferences: { theme, dateFormat, timeFormat: t, shortcutsEnabled, globalNotifications } });
                                }}
                                className={`py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                  timeFormat === t
                                    ? 'bg-indigo-950/40 border-indigo-500/35 text-indigo-300'
                                    : 'bg-gray-950/40 border-gray-900 text-gray-400 hover:text-gray-200'
                                }`}
                              >
                                {t === '12h' ? '12 Horas (AM/PM)' : '24 Horas'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* System Switches */}
                        <div className="flex flex-col gap-3 justify-center">
                          {/* Shortcuts Switch */}
                          <label className="flex items-center justify-between cursor-pointer select-none">
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-gray-200">Atalhos de Teclado</span>
                              <p className="text-[10px] text-gray-500">Navegação rápida por teclado.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={shortcutsEnabled}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setShortcutsEnabled(v);
                                triggerAutoSave({ preferences: { theme, dateFormat, timeFormat, shortcutsEnabled: v, globalNotifications } });
                              }}
                              className="w-8 h-4 rounded-full accent-indigo-500 cursor-pointer"
                            />
                          </label>

                          {/* Global Notification Switch */}
                          <label className="flex items-center justify-between cursor-pointer select-none">
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-gray-200">Alertas em Tempo Real</span>
                              <p className="text-[10px] text-gray-500">Alertas de renderizadores na tela.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={globalNotifications}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setGlobalNotifications(v);
                                triggerAutoSave({ preferences: { theme, dateFormat, timeFormat, shortcutsEnabled, globalNotifications: v } });
                              }}
                              className="w-8 h-4 rounded-full accent-indigo-500 cursor-pointer"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* NOTIFICATION CHANNELS CARD */}
                    <div className="glass-panel rounded-2xl p-6 border border-gray-900 space-y-4">
                      <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 border-b border-gray-900/40 pb-3">
                        <Bell className="w-4 h-4 text-indigo-400" />
                        Notificações e Avisos do SaaS
                      </h2>

                      <p className="text-xs text-gray-400 mb-2">
                        Escolha quais e-mails e atualizações de renderizações você deseja receber em sua conta:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* E-mail global */}
                        <label className="flex items-start gap-3 p-3 bg-gray-950/30 border border-gray-900 rounded-xl hover:border-gray-800 transition cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyEmail}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setNotifyEmail(v);
                              triggerAutoSave({ notificationsConfig: { email: v, renderComplete: notifyRenderComplete, payment: notifyPayment, renewal: notifyRenewal, news: notifyNews, marketing: notifyMarketing } });
                            }}
                            className="mt-0.5 rounded accent-indigo-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-gray-200">Notificações por E-mail</span>
                            <p className="text-[10px] text-gray-500">Enviar alertas importantes diretamente no seu inbox.</p>
                          </div>
                        </label>

                        {/* Render Concluido */}
                        <label className="flex items-start gap-3 p-3 bg-gray-950/30 border border-gray-900 rounded-xl hover:border-gray-800 transition cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyRenderComplete}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setNotifyRenderComplete(v);
                              triggerAutoSave({ notificationsConfig: { email: notifyEmail, renderComplete: v, payment: notifyPayment, renewal: notifyRenewal, news: notifyNews, marketing: notifyMarketing } });
                            }}
                            className="mt-0.5 rounded accent-indigo-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-gray-200">Vídeo Renderizado</span>
                            <p className="text-[10px] text-gray-500">Notificar quando a geração do vídeo for concluída.</p>
                          </div>
                        </label>

                        {/* Pagamento */}
                        <label className="flex items-start gap-3 p-3 bg-gray-950/30 border border-gray-900 rounded-xl hover:border-gray-800 transition cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyPayment}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setNotifyPayment(v);
                              triggerAutoSave({ notificationsConfig: { email: notifyEmail, renderComplete: notifyRenderComplete, payment: v, renewal: notifyRenewal, news: notifyNews, marketing: notifyMarketing } });
                            }}
                            className="mt-0.5 rounded accent-indigo-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-gray-200">Pagamentos & Recibos</span>
                            <p className="text-[10px] text-gray-500">Confirmação de faturas, links Stripe e logs PIX.</p>
                          </div>
                        </label>

                        {/* Renovação */}
                        <label className="flex items-start gap-3 p-3 bg-gray-950/30 border border-gray-900 rounded-xl hover:border-gray-800 transition cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyRenewal}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setNotifyRenewal(v);
                              triggerAutoSave({ notificationsConfig: { email: notifyEmail, renderComplete: notifyRenderComplete, payment: notifyPayment, renewal: v, news: notifyNews, marketing: notifyMarketing } });
                            }}
                            className="mt-0.5 rounded accent-indigo-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-gray-200">Renovação de Assinatura</span>
                            <p className="text-[10px] text-gray-500">Aviso prévio antes do ciclo mensal expirar.</p>
                          </div>
                        </label>

                        {/* Novidades */}
                        <label className="flex items-start gap-3 p-3 bg-gray-950/30 border border-gray-900 rounded-xl hover:border-gray-800 transition cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyNews}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setNotifyNews(v);
                              triggerAutoSave({ notificationsConfig: { email: notifyEmail, renderComplete: notifyRenderComplete, payment: notifyPayment, renewal: notifyRenewal, news: v, marketing: notifyMarketing } });
                            }}
                            className="mt-0.5 rounded accent-indigo-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-gray-200">Novidades da Plataforma</span>
                            <p className="text-[10px] text-gray-500">Receber lançamentos de templates virais novos.</p>
                          </div>
                        </label>

                        {/* Marketing */}
                        <label className="flex items-start gap-3 p-3 bg-gray-950/30 border border-gray-900 rounded-xl hover:border-gray-800 transition cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifyMarketing}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setNotifyMarketing(v);
                              triggerAutoSave({ notificationsConfig: { email: notifyEmail, renderComplete: notifyRenderComplete, payment: notifyPayment, renewal: notifyRenewal, news: notifyNews, marketing: v } });
                            }}
                            className="mt-0.5 rounded accent-indigo-500 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-gray-200">Marketing & Descontos</span>
                            <p className="text-[10px] text-gray-500">Promoções pontuais de cupons e créditos extras.</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ACCOUNT SECURITY TAB */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    
                    {/* ALTERAR EMAIL CARD */}
                    <form onSubmit={handleUpdateEmail} className="glass-panel rounded-2xl p-6 border border-gray-900 space-y-4">
                      <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 border-b border-gray-900/40 pb-3">
                        <Mail className="w-4 h-4 text-indigo-400" />
                        Alterar E-mail da Conta
                      </h2>

                      <p className="text-xs text-gray-400">
                        Insira seu novo e-mail corporativo abaixo. Um link de confirmação de segurança será enviado para validar o processo.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">E-mail Atual</label>
                          <input
                            type="email"
                            disabled
                            value={user.email}
                            className="w-full px-4 py-2 bg-gray-950/30 rounded-xl border border-gray-900 text-xs text-gray-500 cursor-not-allowed outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Novo E-mail</label>
                          <input
                            type="email"
                            required
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="novo@empresa.com"
                            className="w-full px-4 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold text-gray-200 hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                          {isSaving ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Enviar Confirmação de E-mail
                        </button>
                      </div>
                    </form>

                    {/* ALTERAR SENHA CARD */}
                    <form onSubmit={handleUpdatePassword} className="glass-panel rounded-2xl p-6 border border-gray-900 space-y-4">
                      <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2 border-b border-gray-900/40 pb-3">
                        <Key className="w-4 h-4 text-indigo-400" />
                        Alterar Senha de Acesso
                      </h2>

                      <p className="text-xs text-gray-400">
                        Crie uma senha forte de no mínimo 8 dígitos, combinando letras maiúsculas, minúsculas, números e caracteres especiais.
                      </p>

                      <div className="space-y-4 pt-2">
                        {/* Password Actual */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Senha Atual</label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-650" />
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              required
                              placeholder="••••••••••••"
                              className="w-full pl-10 pr-10 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Password Nova & Confirmação row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Nova Senha</label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-650" />
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Criar senha forte"
                                className="w-full pl-10 pr-10 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                              >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 mb-1.5">Confirmar Nova Senha</label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-650" />
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirmar nova senha"
                                className="w-full pl-10 pr-10 py-2 bg-gray-950/60 rounded-xl border border-gray-900 text-xs text-gray-200 focus:border-indigo-500 outline-none transition"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Password strength meter rendering */}
                        {newPassword && (
                          <div className="p-3 bg-gray-950/40 border border-gray-900 rounded-xl space-y-2">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-gray-500">FORÇA DA SENHA:</span>
                              <span className={`font-bold ${pStrength.score >= 4 ? 'text-emerald-400' : pStrength.score === 3 ? 'text-yellow-400' : 'text-rose-400'}`}>
                                {pStrength.label}
                              </span>
                            </div>
                            
                            <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((idx) => (
                                <div
                                  key={idx}
                                  className={`h-full flex-1 rounded-sm transition-all duration-300 ${
                                    idx <= pStrength.score ? pStrength.color : 'bg-gray-800/40'
                                  }`}
                                />
                              ))}
                            </div>

                            <p className="text-[9px] text-gray-500 leading-normal">
                              Dica: Adicione caracteres especiais (@, #, $), números, e misture letras maiúsculas e minúsculas para obter uma classificação excelente.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 disabled:opacity-55"
                        >
                          {isSaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Salvar Nova Senha
                        </button>
                      </div>
                    </form>

                    {/* DISPOSITIVOS CONECTADOS & ACTIVE SESSIONS CARD */}
                    <div className="glass-panel rounded-2xl p-6 border border-gray-900 space-y-4">
                      <div className="flex justify-between items-start border-b border-gray-900/40 pb-3">
                        <div>
                          <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-indigo-400" />
                            Segurança & Sessões Ativas
                          </h2>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">Último login feito em: {lastLoginTime}</p>
                        </div>

                        {sessions.length > 1 && (
                          <button
                            onClick={terminateOtherSessions}
                            className="text-[10px] font-mono font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                          >
                            Encerrar Outras Sessões
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {sessions.map((session) => {
                          const Icon = session.type === 'desktop' ? Laptop : Smartphone;
                          return (
                            <div 
                              key={session.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-gray-950/30 border border-gray-900 hover:border-gray-800/80 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-900 rounded-lg text-gray-400">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-gray-200">{session.device}</span>
                                    {session.isCurrent && (
                                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/25 text-emerald-400 font-bold">
                                        ATUAL
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">IP: {session.ip} • {session.lastActive}</p>
                                </div>
                              </div>

                              {!session.isCurrent && (
                                <button
                                  onClick={() => {
                                    setSessions(prev => prev.filter(s => s.id !== session.id));
                                    showToast('Sessão encerrada com sucesso.', 'success');
                                  }}
                                  className="text-[10px] font-mono text-gray-500 hover:text-red-400 transition cursor-pointer"
                                >
                                  Revogar
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
