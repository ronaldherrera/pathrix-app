// ============================================================
// PATHRIX - Game Board Component
// ============================================================

import React, { useMemo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { GameState, BoardPosition, posKey } from '../../../domain/entities';
import { TileType, PlayerColor } from '../../../domain/enums';
import { PlacementRules } from '../../../game-engine/rules/PlacementRules';
import TilePainter from './TilePainter';

const { width: SW } = Dimensions.get('window');

const COLS    = 8;
const ROWS    = 8;
const GAP     = 3;
const CELL    = Math.floor((SW - GAP * (COLS + 1)) / COLS);
const ROW_MIN = -3;
const COL_MIN = -3;

interface GameBoardProps {
  gameState: GameState;
  onCellPress: (pos: BoardPosition, validTypes: TileType[]) => void;
  selectedPos?: BoardPosition | null;
  isMyTurn: boolean;
  winPath?: BoardPosition[];
  winner?: PlayerColor | null;
  disabled?: boolean;
  customCyanColor?: string;
  customOrangeColor?: string;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onCellPress,
  selectedPos = null,
  isMyTurn,
  winPath = [],
  winner = null,
  disabled = false,
  customCyanColor,
  customOrangeColor,
}) => {
  const winColor = winner === PlayerColor.CYAN 
    ? (customCyanColor || '#FBFBFB') 
    : (customOrangeColor || '#A45F34');
  const winColorDim = winner === PlayerColor.CYAN 
    ? (customCyanColor ? `${customCyanColor}40` : 'rgba(251,251,251,0.25)') 
    : (customOrangeColor ? `${customOrangeColor}50` : 'rgba(164,95,52,0.35)');
  const legalMoves = useMemo(() => {
    if (!isMyTurn || disabled) return new Map<string, TileType[]>();
    const moves = new Map<string, TileType[]>();
    for (const pos of PlacementRules.getLegalPositions(gameState)) {
      const types = PlacementRules.getValidTypesAt(gameState, pos);
      if (types.length > 0) moves.set(posKey(pos), types);
    }
    return moves;
  }, [gameState, isMyTurn, disabled]);

  const winPathSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of winPath) s.add(posKey(p));
    return s;
  }, [winPath]);

  // Animation: pulses between 0 and 1
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const hasWin = winPath.length > 0;

  useEffect(() => {
    if (!hasWin) {
      pulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hasWin]);

  // Dim overlay opacity: 0 normally, up to 0.72 when win
  const dimOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [hasWin ? 0.55 : 0, 0.72] });

  // Win tile glow overlay color
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.0, 0.35] });
  const winBorderColor = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [winColor, '#ffffff'] });
  const winBorderWidth = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 3] });

  return (
    <View style={styles.board}>
      {Array.from({ length: ROWS }, (_, ri) => {
        const row = ROW_MIN + ri;
        return (
          <View key={row} style={styles.row}>
            {Array.from({ length: COLS }, (_, ci) => {
              const col = COL_MIN + ci;
              const key = posKey({ row, col });
              const tile = gameState.board[key];
              const validTypes = legalMoves.get(key);
              const isSelected = selectedPos?.row === row && selectedPos?.col === col;
              const isWin = winPathSet.has(key);

              if (tile) {
                if (isWin) {
                  // Win tile: sits above dim overlay, pulses border + bright glow overlay
                  return (
                    <Animated.View
                      key={key}
                      style={[
                        styles.cell,
                        {
                          zIndex: 2,
                          borderColor: winBorderColor,
                          borderWidth: winBorderWidth,
                          overflow: 'hidden',
                        },
                      ]}
                    >
                      <TilePainter 
                        type={tile.type} 
                        size={CELL} 
                        highlighted={isWin}
                        customCyanColor={customCyanColor}
                        customOrangeColor={customOrangeColor}
                      />
                      {/* Glow overlay */}
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          StyleSheet.absoluteFill,
                          { backgroundColor: winColorDim, opacity: glowOpacity, borderRadius: 4 },
                        ]}
                      />
                    </Animated.View>
                  );
                }

                // Non-win tile: dimmed by overlay
                return (
                  <View key={key} style={[styles.cell, { zIndex: 1 }]}>
                    <TilePainter 
                      type={tile.type} 
                      size={CELL} 
                      customCyanColor={customCyanColor}
                      customOrangeColor={customOrangeColor}
                    />
                    {hasWin && (
                      <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: dimOpacity, borderRadius: 4 }]}
                      />
                    )}
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.cell,
                    { zIndex: 1 },
                    !!validTypes && styles.legalCell,
                    isSelected && styles.selectedCell,
                  ]}
                  onPress={() => onCellPress({ row, col }, validTypes ?? [])}
                  activeOpacity={0.8}
                >
                  {!!validTypes && (
                    <View style={styles.plusWrap} pointerEvents="none">
                      <View style={[styles.plusV, { backgroundColor: isSelected ? '#ffffff' : '#3a3a3a' }]} />
                      <View style={[styles.plusH, { backgroundColor: isSelected ? '#ffffff' : '#3a3a3a' }]} />
                    </View>
                  )}
                  {hasWin && (
                    <Animated.View
                      pointerEvents="none"
                      style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: dimOpacity, borderRadius: 4 }]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    width: SW,
    paddingHorizontal: GAP,
    paddingTop: GAP,
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    backgroundColor: '#131313',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalCell: {
    borderColor: '#2a2a2a',
  },
  selectedCell: {
    borderColor: '#888888',
    borderWidth: 2,
    backgroundColor: '#1e1e1e',
  },
  plusWrap: {
    width: CELL * 0.4,
    height: CELL * 0.4,
    position: 'relative',
  },
  plusV: {
    position: 'absolute',
    width: 2,
    top: 0,
    bottom: 0,
    left: CELL * 0.2 - 1,
    borderRadius: 1,
  },
  plusH: {
    position: 'absolute',
    height: 2,
    left: 0,
    right: 0,
    top: CELL * 0.2 - 1,
    borderRadius: 1,
  },
});

export default GameBoard;
