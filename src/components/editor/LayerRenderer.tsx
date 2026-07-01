/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditorLayer } from './types';

interface LayerRendererProps {
  layer: EditorLayer;
  currentTime: number; // For rendering animations or time-dependent layers
}

export const LayerRenderer: React.FC<LayerRendererProps> = ({ layer, currentTime }) => {
  // Check if layer is active at the current playhead time
  const isActive = currentTime >= layer.durationStart && currentTime <= layer.durationEnd;
  
  if (!layer.visible || !isActive) {
    return null;
  }

  // Build inline styles dynamically for exact positioning, scaling and rotating
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${layer.x}px`,
    top: `${layer.y}px`,
    width: `${layer.width}px`,
    height: `${layer.height}px`,
    transform: `rotate(${layer.rotation}deg)`,
    opacity: layer.opacity / 100,
    zIndex: layer.order,
    pointerEvents: layer.locked ? 'none' : 'auto',
    transition: 'opacity 0.2s ease',
    transformOrigin: 'center center',
  };

  const textStyle: React.CSSProperties = {
    color: layer.color || '#ffffff',
    fontFamily: layer.font || 'Inter',
    fontSize: `${layer.size || 24}px`,
    fontWeight: layer.weight || 'normal',
    letterSpacing: layer.spacing ? `${layer.spacing}px` : 'normal',
    textAlign: layer.align || 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: layer.align === 'left' ? 'flex-start' : layer.align === 'right' ? 'flex-end' : 'center',
    width: '100%',
    height: '100%',
    wordBreak: 'break-word',
    userSelect: 'none',
    padding: layer.padding ? `${layer.padding}px` : '0px',
  };

  // Add text effects: shadow, glow, stroke
  if (layer.shadowEnabled) {
    const shadowColor = layer.shadowColor || 'rgba(0,0,0,0.5)';
    const shadowBlur = layer.shadowBlur !== undefined ? layer.shadowBlur : 4;
    const shadowOffsetX = layer.shadowOffsetX !== undefined ? layer.shadowOffsetX : 2;
    const shadowOffsetY = layer.shadowOffsetY !== undefined ? layer.shadowOffsetY : 2;
    textStyle.textShadow = `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`;
  }

  if (layer.glowEnabled) {
    const glowColor = layer.glowColor || 'rgba(129, 140, 248, 0.8)';
    const glowBlur = layer.glowBlur !== undefined ? layer.glowBlur : 10;
    textStyle.textShadow = (textStyle.textShadow ? `${textStyle.textShadow}, ` : '') + `0 0 ${glowBlur}px ${glowColor}`;
  }

  if (layer.strokeEnabled) {
    const strokeColor = layer.strokeColor || '#000000';
    const strokeWidth = layer.strokeWidth !== undefined ? layer.strokeWidth : 1;
    // Standard webkit text stroke
    textStyle.WebkitTextStroke = `${strokeWidth}px ${strokeColor}`;
  }

  const renderContent = () => {
    switch (layer.type) {
      case 'video': {
        const hasPlaceholder = !!layer.placeholder;
        if (hasPlaceholder) {
          return (
            <div className="w-full h-full bg-slate-900/90 border-2 border-dashed border-indigo-500/40 rounded-lg flex flex-col items-center justify-center p-4 text-center select-none">
              <div className="text-indigo-400 font-mono text-sm font-bold animate-pulse mb-1">{layer.placeholder}</div>
              <div className="text-[10px] text-gray-500 font-medium font-mono">Espaço Reservado de Vídeo Dinâmico</div>
            </div>
          );
        }
        
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg bg-black">
            {layer.contentUrl ? (
              <video 
                src={layer.contentUrl} 
                className="w-full h-full object-cover pointer-events-none" 
                muted 
                playsInline
                loop
              />
            ) : (
              <div className="w-full h-full bg-slate-950 flex items-center justify-center font-mono text-[10px] text-gray-600">
                Sem Fonte de Vídeo
              </div>
            )}
          </div>
        );
      }

      case 'image':
      case 'logo':
      case 'watermark': {
        const isDynamic = !!layer.placeholder;
        if (isDynamic) {
          return (
            <div className="w-full h-full bg-gray-900/80 border border-dashed border-gray-700 rounded flex flex-col items-center justify-center text-center p-2 select-none">
              <span className="text-pink-400 font-mono text-xs font-bold">{layer.placeholder}</span>
              <span className="text-[9px] text-gray-600 font-mono uppercase mt-1">Logo / Imagem</span>
            </div>
          );
        }

        return (
          <div className="w-full h-full overflow-hidden rounded-lg flex items-center justify-center">
            {layer.contentUrl ? (
              <img 
                src={layer.contentUrl} 
                alt={layer.name} 
                className="w-full h-full object-contain pointer-events-none" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-gray-950 border border-gray-900 rounded flex items-center justify-center text-[10px] text-gray-600 font-mono">
                [Img: {layer.name}]
              </div>
            )}
          </div>
        );
      }

      case 'headline':
      case 'subheadline':
      case 'text':
      case 'cta':
      case 'subtitle': {
        const displayText = layer.placeholder ? layer.placeholder : (layer.text || 'Digite seu texto');
        const isPlaceholder = !!layer.placeholder;
        return (
          <div style={textStyle}>
            <span className={isPlaceholder ? 'text-amber-400 font-mono font-bold tracking-wide' : ''}>
              {displayText}
            </span>
          </div>
        );
      }

      case 'progressBar': {
        // Calculate progress percentage based on playhead and layer's duration
        const duration = layer.durationEnd - layer.durationStart;
        const progress = duration > 0 ? Math.min(100, Math.max(0, ((currentTime - layer.durationStart) / duration) * 100)) : 100;
        
        return (
          <div 
            className="w-full bg-gray-900/60 overflow-hidden border border-gray-800"
            style={{ 
              height: '100%', 
              borderRadius: `${layer.radius || 4}px`,
              padding: '1px'
            }}
          >
            <div 
              className="h-full rounded transition-all duration-100"
              style={{ 
                width: `${progress}%`,
                backgroundColor: layer.color || '#6366f1'
              }}
            />
          </div>
        );
      }

      case 'shape': {
        const shapeStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          backgroundColor: layer.color || '#6366f1',
          borderRadius: layer.shapeType === 'circle' ? '50%' : `${layer.radius || 0}px`,
          border: layer.strokeEnabled ? `${layer.strokeWidth || 1}px solid ${layer.strokeColor || '#000000'}` : 'none',
        };

        if (layer.shapeType === 'line') {
          return (
            <div 
              className="w-full"
              style={{
                height: `${layer.strokeWidth || 2}px`,
                backgroundColor: layer.color || '#6366f1',
              }}
            />
          );
        }

        return <div style={shapeStyle} />;
      }

      case 'overlay': {
        const overlayStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          borderRadius: `${layer.radius || 0}px`,
        };

        if (layer.overlayType === 'blur') {
          overlayStyle.backdropFilter = `blur(${layer.size || 8}px)`;
          overlayStyle.backgroundColor = layer.color || 'rgba(0,0,0,0.15)';
        } else if (layer.overlayType === 'gradient') {
          overlayStyle.background = `linear-gradient(180deg, ${layer.gradientColorStart || 'transparent'} 0%, ${layer.gradientColorEnd || 'rgba(0,0,0,0.8)'} 100%)`;
        } else {
          overlayStyle.backgroundColor = layer.color || 'rgba(0,0,0,0.5)';
        }

        return <div style={overlayStyle} />;
      }

      default:
        return (
          <div className="w-full h-full bg-indigo-500/10 border border-indigo-500/20 rounded flex items-center justify-center text-xs text-indigo-400 font-mono">
            {layer.name}
          </div>
        );
    }
  };

  return (
    <div style={baseStyle}>
      {renderContent()}
    </div>
  );
};
