import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { 
  Circle, Rect, Path, G, Defs, Pattern, 
  Polygon, Mask, Use 
} from 'react-native-svg';
import { Colors } from '../../core/theme';

export type BaseShape = 'circle' | 'square' | 'hexagon' | 'octagon' | 'triangle' | 'pentagon' | 'rhombus' | 'shield';
export type AvatarPattern = 'dots' | 'grid' | 'stripes' | 'waves' | 'zigzag' | 'radial' | 'scanlines' | 'none';
export type AvatarSymbol = 'star' | 'cross' | 'diamond' | 'bolt' | 'arrow' | 'pulse' | 'target' | 'none';

export const BASE_SHAPES: BaseShape[] = ['circle', 'square', 'hexagon', 'octagon', 'triangle', 'pentagon', 'rhombus', 'shield'];
export const AVATAR_PATTERNS: AvatarPattern[] = ['none', 'dots', 'grid', 'stripes', 'waves', 'zigzag', 'radial', 'scanlines'];
export const AVATAR_SYMBOLS: AvatarSymbol[] = ['none', 'star', 'cross', 'diamond', 'bolt', 'arrow', 'pulse', 'target'];

export interface AvatarConfig {
  baseShape: BaseShape;
  color: string;
  pattern: AvatarPattern;
  symbol: AvatarSymbol;
  backgroundColor: string;
  useCustomTileColor?: boolean;
}

interface ProceduralAvatarProps {
  size?: number;
  config?: AvatarConfig;
}

/**
 * ProceduralAvatar renders a unique geometric profile picture based on a configuration.
 * It uses SVG to maintain crispness and allow for infinite combinations without using images.
 */
export const ProceduralAvatar: React.FC<ProceduralAvatarProps> = ({ 
  size = 64, 
  config 
}) => {
  // Generate a unique ID for this instance to avoid SVG mask collisions
  const [compId] = React.useState(() => Math.random().toString(36).substring(7));
  const maskId = `mask-${compId}`;

  // Fallback for existing users without config
  const finalConfig: AvatarConfig = config || {
    baseShape: 'circle',
    color: Colors.cyan,
    pattern: 'grid',
    symbol: 'diamond',
    backgroundColor: '#1A1A1A',
    useCustomTileColor: false
  };

  const { baseShape, color, pattern, symbol, backgroundColor } = finalConfig;
  const half = 50;
  const vb = "0 0 100 100";

  // Render Base Shape
  const renderBase = () => {
    switch (baseShape) {
      case 'square':
        return <Rect x="5" y="5" width="90" height="90" rx="10" fill={backgroundColor} />;
      case 'hexagon':
        return (
          <Polygon 
            points="50,5 93,30 93,70 50,95 7,70 7,30" 
            fill={backgroundColor} 
          />
        );
      case 'octagon':
        return (
          <Polygon 
            points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" 
            fill={backgroundColor} 
          />
        );
      case 'triangle':
        return <Polygon points="50,5 95,85 5,85" fill={backgroundColor} />;
      case 'pentagon':
        return <Polygon points="50,5 95,38 78,92 22,92 5,38" fill={backgroundColor} />;
      case 'rhombus':
        return <Polygon points="50,5 95,50 50,95 5,50" fill={backgroundColor} />;
      case 'shield':
        return <Path d="M50 5 L90 15 V55 C90 80 50 95 50 95 C50 95 10 80 10 55 V15 L50 5 Z" fill={backgroundColor} />;
      default: // circle
        return <Circle cx="50" cy="50" r="45" fill={backgroundColor} />;
    }
  };

  // Render Pattern
  const renderPattern = () => {
    switch (pattern) {
      case 'dots':
        return (
          <G opacity="1">
            {Array.from({ length: 12 }).map((_, i) =>
              Array.from({ length: 12 }).map((__, j) => (
                <Circle key={`${i}-${j}`} cx={10 + i * 7.2} cy={10 + j * 7.2} r="0.8" fill={color} />
              ))
            )}
          </G>
        );
      case 'grid':
        return (
          <G opacity="1">
            {Array.from({ length: 20 }).map((_, i) => (
              <React.Fragment key={i}>
                <Path d={`M0 ${i * 5} H100`} stroke={color} strokeWidth="0.5" />
                <Path d={`M${i * 5} 0 V100`} stroke={color} strokeWidth="0.5" />
              </React.Fragment>
            ))}
          </G>
        );
      case 'stripes':
        return (
          <G opacity="1">
            {Array.from({ length: 30 }).map((_, i) => (
              <Path key={i} d={`M-100 ${i * 6} L100 ${i * 6 + 100}`} stroke={color} strokeWidth="1" />
            ))}
          </G>
        );
      case 'waves':
        return (
          <G opacity="1">
            <Path d="M0 20 Q 25 10, 50 20 T 100 20 M0 40 Q 25 30, 50 40 T 100 40 M0 60 Q 25 50, 50 60 T 100 60 M0 80 Q 25 70, 50 80 T 100 80" stroke={color} strokeWidth="2" fill="none" />
          </G>
        );
      case 'zigzag':
        return (
          <G opacity="1">
            {Array.from({ length: 15 }).map((_, i) => (
              <Path 
                key={i} 
                d={`M0 ${i * 8} L10 ${i * 8 + 5} L20 ${i * 8} L30 ${i * 8 + 5} L40 ${i * 8} L50 ${i * 8 + 5} L60 ${i * 8} L70 ${i * 8 + 5} L80 ${i * 8} L90 ${i * 8 + 5} L100 ${i * 8}`} 
                stroke={color} 
                strokeWidth="1" 
                fill="none" 
              />
            ))}
          </G>
        );
      case 'radial':
        return (
          <G opacity="1">
            <Path d="M50 50 L50 0 M50 50 L100 50 M50 50 L50 100 M50 50 L0 50 M50 50 L85 15 M50 50 L85 85 M50 50 L15 85 M50 50 L15 15" stroke={color} strokeWidth="1.5" />
          </G>
        );
      case 'scanlines':
        return (
          <G opacity="1">
            {Array.from({ length: 50 }).map((_, i) => (
              <Rect key={i} x="0" y={i * 2} width="100" height="0.8" fill={color} />
            ))}
          </G>
        );
      default:
        return null;
    }
  };

  // Render Symbol
  const renderSymbol = () => {
    switch (symbol) {
      case 'star':
        return (
          <Path 
            d="M50 20 L55 40 L75 45 L55 50 L50 70 L45 50 L25 45 L45 40 Z" 
            fill={color} 
          />
        );
      case 'cross':
        return (
          <Path 
            d="M35 35 L65 65 M65 35 L35 65" 
            stroke={color} 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
        );
      case 'diamond':
        return <Polygon points="50,25 75,50 50,75 25,50" fill={color} />;
      case 'bolt':
        return <Path d="M60 10 L25 55 H50 L40 90 L75 45 H50 L60 10 Z" fill={color} />;
      case 'arrow':
        return <Path d="M50 15 L85 50 L65 50 V85 H35 V50 L15 50 Z" fill={color} />;
      case 'pulse':
        return (
          <G fill="none" stroke={color} strokeWidth="4">
            <Circle cx="50" cy="50" r="10" />
            <Path d="M25 50 A25 25 0 0 1 75 50 M15 50 A35 35 0 0 1 85 50" opacity="0.6" />
          </G>
        );
      case 'target':
        return (
          <G fill="none" stroke={color} strokeWidth="3">
            <Circle cx="50" cy="50" r="30" />
            <Circle cx="50" cy="50" r="15" fill={color} />
            <Path d="M50 10 V30 M50 70 V90 M10 50 H30 M70 50 H90" strokeWidth="4" />
          </G>
        );
      default:
        return null;
    }
  };

  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox={vb} 
      preserveAspectRatio="xMidYMid meet"
      style={{ alignSelf: 'center' }}
    >
        {/* Mask generation based on base shape to clip pattern */}
        <Defs>
          <Mask id={maskId}>
            <G fill="white">{renderBase()}</G>
          </Mask>
        </Defs>

        {/* Gray border background */}
        <Rect x="0" y="0" width="100" height="100" fill="transparent" />
        
        {/* The Base */}
        {renderBase()}

        {/* Pattern (masked to base) */}
        <G mask={`url(#${maskId})`}>
          {renderPattern()}
        </G>

        {/* Central Symbol */}
        {renderSymbol()}

        {/* Border Overlay */}
        <G fill="none" strokeWidth="2" stroke={color} opacity="0.5">
          {renderBase()}
        </G>
      </Svg>
  );
};

// Default generator to initialize new users
export const generateRandomAvatar = (): AvatarConfig => {
  const palette = ['#FFFFFF', Colors.orange, '#00E5FF', '#39FF14', '#FF007F', '#9D00FF', '#FCEE09', '#FF3131'];
  const bgPalette = ['#1A1A1A', '#262626', '#171717'];

  return {
    baseShape: BASE_SHAPES[Math.floor(Math.random() * BASE_SHAPES.length)],
    color: palette[Math.floor(Math.random() * palette.length)],
    pattern: AVATAR_PATTERNS[Math.floor(Math.random() * AVATAR_PATTERNS.length)],
    symbol: AVATAR_SYMBOLS[Math.floor(Math.random() * AVATAR_SYMBOLS.length)],
    backgroundColor: bgPalette[Math.floor(Math.random() * bgPalette.length)],
  };
};
