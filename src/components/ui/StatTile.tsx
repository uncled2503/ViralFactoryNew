/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'indigo' | 'purple' | 'pink' | 'blue' | 'yellow' | 'teal' | 'orange' | 'emerald';
}

// Full static class strings — Tailwind's scanner only picks up literal class names,
// so these must not be built via string interpolation.
const ICON_CHIP_CLASSES: Record<NonNullable<StatTileProps['color']>, string> = {
  indigo: 'bg-indigo-950/30 border-indigo-500/10 text-indigo-400',
  purple: 'bg-purple-950/30 border-purple-500/10 text-purple-400',
  pink: 'bg-pink-950/30 border-pink-500/10 text-pink-400',
  blue: 'bg-blue-950/30 border-blue-500/10 text-blue-400',
  yellow: 'bg-yellow-950/30 border-yellow-500/10 text-yellow-400',
  teal: 'bg-teal-950/30 border-teal-500/10 text-teal-400',
  orange: 'bg-orange-950/30 border-orange-500/10 text-orange-400',
  emerald: 'bg-emerald-950/30 border-emerald-500/10 text-emerald-400'
};

const CARD_HOVER_CLASSES: Record<NonNullable<StatTileProps['color']>, string> = {
  indigo: 'hover:border-indigo-500/20',
  purple: 'hover:border-purple-500/20',
  pink: 'hover:border-pink-500/20',
  blue: 'hover:border-blue-500/20',
  yellow: 'hover:border-yellow-500/20',
  teal: 'hover:border-teal-500/20',
  orange: 'hover:border-orange-500/20',
  emerald: 'hover:border-emerald-500/20'
};

// Generalized version of the metric tile the Dashboard already used — reused as-is
// so metrics stay visually identical across screens.
export const StatTile: React.FC<StatTileProps> = ({ label, value, icon: Icon, color = 'indigo' }) => {
  return (
    <div className={`glass-panel rounded-xl p-4 border border-gray-900 flex flex-col justify-between group transition-all duration-300 ${CARD_HOVER_CLASSES[color]}`}>
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
        <span className={`p-1.5 rounded-lg border ${ICON_CHIP_CLASSES[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <h3 className="text-xl font-bold font-mono text-gray-100 mt-4">{value}</h3>
    </div>
  );
};
