// ============================================================
// PATHRIX - Empty Tile Hint
// Shows ghost tiles on valid placement positions
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Canvas, RoundedRect, Path, Skia } from '@shopify/react-native-skia';
import { TileType, PlayerColor } from '../../../domain/enums';
import { Colors, TILE_SIZE } from '../../../core/theme';

interface EmptyTileHintProps {
  validTypes: TileType[];
  onPress: (pos: { row: number; col: number }) => void;
  row: number;
  col: number;
  currentPlayer: PlayerColor;
}

const EmptyTileHint: React.FC<EmptyTileHintProps> = ({
  validTypes,
  onPress,
  row,
  col,
  currentPlayer,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const playerColor =
    currentPlayer === PlayerColor.CYAN ? Colors.cyan : Colors.orange;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress({ row, col })}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.hint, { opacity: pulseAnim }]}>
        <Canvas style={{ width: TILE_SIZE, height: TILE_SIZE }}>
          <RoundedRect
            x={2}
            y={2}
            width={TILE_SIZE - 4}
            height={TILE_SIZE - 4}
            r={5}
            color={`rgba(${currentPlayer === PlayerColor.CYAN ? '0, 245, 255' : '255, 107, 53'}, 0.1)`}
          />
        </Canvas>
        {/* Plus icon */}
        <View style={[styles.plusH, { backgroundColor: playerColor }]} />
        <View style={[styles.plusV, { backgroundColor: playerColor }]} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  hint: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plusH: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
  },
  plusV: {
    position: 'absolute',
    width: 2,
    height: 16,
    borderRadius: 1,
    opacity: 0.7,
  },
});

export default EmptyTileHint;
