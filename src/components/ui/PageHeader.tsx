/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

// Standardizes the top of every post-login screen: title + subtitle + an optional
// primary action on the right. Keeps screens visually consistent instead of each
// one hand-rolling its own header markup.
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
      {subtitle && <p className="text-xs text-gray-500 mt-1 max-w-xl">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
