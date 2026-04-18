// ============================================================
// PATHRIX - Shared UI Components
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../../core/theme';
import { glassStyle, GlassCard } from './Common';
export { glassStyle, GlassCard };

const { width: SW } = Dimensions.get('window');

const BOARD_COLS = 8;
const BOARD_ROWS = 8;
const BOARD_GAP  = 3;
const TILE_SZ    = (SW - BOARD_GAP * (BOARD_COLS + 1)) / BOARD_COLS;

// ── Board background ─────────────────────────────────────────

export const ScreenBg: React.FC = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={bgStyles.grid}>
      {Array.from({ length: BOARD_ROWS }, (_, r) => (
        <View key={r} style={bgStyles.row}>
          {Array.from({ length: BOARD_COLS }, (_, c) => (
            <View key={c} style={bgStyles.cell} />
          ))}
        </View>
      ))}
    </View>
  </View>
);

const bgStyles = StyleSheet.create({
  grid: {
    paddingHorizontal: BOARD_GAP,
    paddingTop: BOARD_GAP,
    gap: BOARD_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: BOARD_GAP,
  },
  cell: {
    width: TILE_SZ,
    height: TILE_SZ,
    backgroundColor: '#131313',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
});

// ── PageHeader ────────────────────────────────────────────────

export const PageHeader: React.FC<{
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
}> = ({ title, onBack, rightElement }) => (
  <View style={headerStyles.header}>
    <TouchableOpacity onPress={onBack} style={headerStyles.backBtn} activeOpacity={0.7}>
      <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
    </TouchableOpacity>
    <Text style={headerStyles.title}>{title}</Text>
    <View style={headerStyles.right}>
      {rightElement ?? <View style={{ width: 40 }} />}
    </View>
  </View>
);

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing?.lg || 24,
    paddingVertical: Spacing?.md || 16,
  },
  backBtn: { padding: 4 },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.lg,
    fontWeight: 'bold',
  },
  right: { width: 40, alignItems: 'flex-end' },
});
import ConfirmModal from './ConfirmModal';
export { ConfirmModal };
