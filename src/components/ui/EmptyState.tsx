/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Empty states across the app used to be a line of gray text with no way forward.
// This always pairs the "nothing here yet" message with a primary CTA so the user
// never lands on a dead end.
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, actionLabel, onAction }) => (
  <div className="col-span-full flex flex-col items-center text-center gap-3 py-12 px-6 rounded-2xl border border-dashed border-gray-900 bg-gray-950/40">
    <div className="h-11 w-11 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-center text-gray-500">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>}
    </div>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
