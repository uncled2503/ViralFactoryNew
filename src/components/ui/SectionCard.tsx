/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

// Standard card shell (glass-panel + rounded-2xl) reused across screens instead of
// each screen mixing rounded-xl/2xl/3xl and ad-hoc border colors.
export const SectionCard: React.FC<SectionCardProps> = ({ children, className = '' }) => (
  <div className={`glass-panel rounded-2xl border border-gray-900 ${className}`}>{children}</div>
);
