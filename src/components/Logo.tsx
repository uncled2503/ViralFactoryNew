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
    <img
      src="/fotos/logo_simbolo.png"
      alt="Viral Factory Symbol"
      style={{ width: size, height: size }}
      className={`shrink-0 object-contain rounded-lg ${className}`}
      referrerPolicy="no-referrer"
    />
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
    <div className={`flex items-center ${className}`}>
      <img
        src="/fotos/logo_com_nome.png"
        alt="Viral Factory Logo"
        style={{ height: iconSize }}
        className="shrink-0 object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

