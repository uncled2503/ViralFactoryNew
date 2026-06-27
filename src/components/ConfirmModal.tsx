/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-md bg-gray-950/95 border border-gray-900 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-900 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4">
              {/* Type-specific Icon Indicator */}
              <div className="shrink-0">
                {type === 'danger' && (
                  <div className="h-10 w-10 rounded-xl bg-red-950/30 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                )}
                {type === 'warning' && (
                  <div className="h-10 w-10 rounded-xl bg-amber-950/30 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                {type === 'info' && (
                  <div className="h-10 w-10 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 space-y-2">
                <h3 className="text-sm font-bold text-gray-100 tracking-tight leading-none mt-1">
                  {title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white bg-transparent border border-gray-800 hover:border-gray-700 rounded-xl transition cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition shadow-lg cursor-pointer ${
                  type === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-600/10'
                    : type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/10'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/10'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
