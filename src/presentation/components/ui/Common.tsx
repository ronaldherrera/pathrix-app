import React from 'react';
import { View } from 'react-native';

// ── Glass style ───────────────────────────────────────────────

export const glassStyle: Record<string, any> = {
  backgroundColor: 'rgba(38, 38, 42, 0.82)',
  borderTopWidth: 0.8,
  borderLeftWidth: 0.8,
  borderBottomWidth: 0.2,
  borderRightWidth: 0.2,
  borderTopColor: 'rgba(255, 255, 255, 0.30)',
  borderLeftColor: 'rgba(255, 255, 255, 0.30)',
  borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  borderRightColor: 'rgba(255, 255, 255, 0.04)',
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 12,
  elevation: 8,
  backdropFilter: 'blur(6px) saturate(140%)',
  WebkitBackdropFilter: 'blur(6px) saturate(140%)',
};

// ── GlassCard ─────────────────────────────────────────────────

export const GlassCard: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => (
  <View style={[glassStyle, style]}>{children}</View>
);
