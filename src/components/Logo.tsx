/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const LogoIcon: React.FC<LogoProps> = ({ className = '', size = 40 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        {/* Gradient for the icon matching the purple-to-pink gradient in the logo */}
        <linearGradient id="logo-gradient" x1="15%" y1="85%" x2="85%" y2="15%">
          <stop offset="0%" stopColor="#7c3aed" /> {/* Violet 600 */}
          <stop offset="50%" stopColor="#a855f7" /> {/* Purple 500 */}
          <stop offset="100%" stopColor="#ec4899" /> {/* Pink 500 */}
        </linearGradient>
      </defs>

      {/* Outer Rounded Triangle */}
      <path
        d="M 32,24 L 76,50 L 32,76 Z"
        stroke="url(#logo-gradient)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Inner Chevron > Symbol */}
      <path
        d="M 45,40 L 58,50 L 45,60"
        stroke="url(#logo-gradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

interface LogoFullProps extends LogoProps {
  textClassName?: string;
  subTextClassName?: string;
  iconSize?: number;
}

export const LogoFull: React.FC<LogoFullProps> = ({
  className = '',
  textClassName = '',
  subTextClassName = '',
  iconSize = 36,
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon size={iconSize} />
      <div className="flex flex-col items-start leading-none">
        <span
          className={`text-gray-100 font-medium tracking-wide text-sm md:text-base uppercase ${textClassName}`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Viral
        </span>
        <span
          className={`text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400 font-bold tracking-wider text-[11px] md:text-xs uppercase mt-0.5 ${subTextClassName}`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Factory
        </span>
      </div>
    </div>
  );
};
