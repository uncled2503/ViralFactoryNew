/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CanvasSettings } from './types';
import { SnapLine } from './SnapSystem';

interface GuidesProps {
  settings: CanvasSettings;
  snapLines: SnapLine[];
}

export const Guides: React.FC<GuidesProps> = ({ settings, snapLines }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9998 }}>
      {/* 1. Grid lines overlay */}
      {settings.gridEnabled && (
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #ffffff 1px, transparent 1px),
              linear-gradient(to bottom, #ffffff 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      )}

      {/* 2. Safe Areas (90% Action Safe & 80% Title Safe) */}
      {settings.safeAreaEnabled && (
        <>
          {/* Action Safe (90%) */}
          <div 
            className="absolute border border-dashed border-sky-500/20 rounded"
            style={{
              left: '5%',
              top: '5%',
              right: '5%',
              bottom: '5%',
            }}
          >
            <span className="absolute bottom-1 right-2 text-[8px] font-mono tracking-wider text-sky-500/30 select-none uppercase">
              Action Safe 90%
            </span>
          </div>

          {/* Title Safe (80%) */}
          <div 
            className="absolute border border-dashed border-amber-500/20 rounded"
            style={{
              left: '10%',
              top: '10%',
              right: '10%',
              bottom: '10%',
            }}
          >
            <span className="absolute bottom-1 right-2 text-[8px] font-mono tracking-wider text-amber-500/30 select-none uppercase">
              Title Safe 80%
            </span>
          </div>

          {/* Golden ratio or vertical center markers */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dotted border-gray-500/10" />
          <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dotted border-gray-500/10" />
        </>
      )}

      {/* 3. Realtime Snapping alignment guidelines */}
      {settings.guidesEnabled && snapLines.map((line, idx) => {
        if (line.type === 'x') {
          return (
            <div
              key={`snap-x-${idx}`}
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
              style={{ left: `${line.value}px` }}
            />
          );
        } else {
          return (
            <div
              key={`snap-y-${idx}`}
              className="absolute left-0 right-0 h-0.5 bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
              style={{ top: `${line.value}px` }}
            />
          );
        }
      })}
    </div>
  );
};
