// ============================================================
// PATHRIX - Tile Painter (React Native Skia)
// ============================================================
// Renders a single board tile using Skia canvas.
// Uses bezier curves to draw the two colored paths on each tile.
// Falls back to TilePainterFallback if Skia is not available.

import React from 'react';
import { TileType, PlayerColor } from '../../../domain/enums';
import { Colors, TILE_SIZE, PATH_STROKE_WIDTH } from '../../../core/theme';
import TilePainterFallback from './TilePainterFallback';

let Canvas: any, Path: any, Skia: any, RoundedRect: any, Group: any;
// Force SVG renderer on all platforms for visual consistency
const skiaAvailable = false;

interface TilePainterProps {
  type: TileType;
  size?: number;
  highlighted?: boolean;
  animationProgress?: number; // 0-1, for placement animation
  customCyanColor?: string;
  customOrangeColor?: string;
}

/**
 * Creates a path between two edge midpoints.
 * Type A uses straight lines (cross), Type B uses bezier curves.
 * Edges: 0=N, 1=E, 2=S, 3=W
 */
function makePathBetweenEdges(
  edge1: number,
  edge2: number,
  size: number,
  straight: boolean = false,
): ReturnType<typeof Skia.Path.Make> {
  const half = size / 2;

  const edgeMids: Record<number, [number, number]> = {
    0: [half, 0],      // North
    1: [size, half],   // East
    2: [half, size],   // South
    3: [0, half],      // West
  };

  const [x1, y1] = edgeMids[edge1];
  const [x2, y2] = edgeMids[edge2];

  const path = Skia.Path.Make();
  path.moveTo(x1, y1);

  if (straight) {
    path.lineTo(x2, y2);
  } else {
    // Quadratic bezier toward the corner between the two edges
    const corners: Record<string, [number, number]> = {
      '0_1': [size, 0], '1_0': [size, 0], // NE
      '0_3': [0, 0],    '3_0': [0, 0],    // NW
      '2_1': [size, size], '1_2': [size, size], // SE
      '2_3': [0, size], '3_2': [0, size], // SW
    };
    const corner = corners[`${edge1}_${edge2}`];
    if (corner) {
      path.quadTo(corner[0], corner[1], x2, y2);
    } else {
      path.lineTo(x2, y2);
    }
  }
  return path;
}

/**
 * Get edge indices for each color based on tile type.
 * Type A (Cross): Cyan → [N(0), S(2)], Orange → [E(1), W(3)]
 * Type B (Curved): Cyan → [N(0), E(1)], Orange → [S(2), W(3)]
 */
function getColorEdgeIndices(
  type: TileType,
  color: PlayerColor,
): [number, number] {
  if (type === TileType.TYPE_A) {
    return color === PlayerColor.CYAN ? [0, 2] : [1, 3]; // N-S / E-W straight
  } else {
    return color === PlayerColor.CYAN ? [0, 1] : [2, 3]; // NE / SW curve
  }
}

const TilePainter: React.FC<TilePainterProps> = ({
  type,
  size = TILE_SIZE,
  highlighted = false,
  animationProgress = 1,
  customCyanColor,
  customOrangeColor,
}) => {
  // Use fallback renderer if Skia is not available (e.g., Expo Go)
  if (!skiaAvailable) {
    return (
      <TilePainterFallback 
        type={type} 
        size={size} 
        highlighted={highlighted} 
        customCyanColor={customCyanColor}
        customOrangeColor={customOrangeColor}
      />
    );
  }
  const pad = 2;
  const innerSize = size - pad * 2;

  const isStraight = type === TileType.TYPE_A;

  // Cyan path
  const [cE1, cE2] = getColorEdgeIndices(type, PlayerColor.CYAN);
  const cyanPath = makePathBetweenEdges(cE1, cE2, innerSize, isStraight);

  // Orange path
  const [oE1, oE2] = getColorEdgeIndices(type, PlayerColor.ORANGE);
  const orangePath = makePathBetweenEdges(oE1, oE2, innerSize, isStraight);

  const strokeWidth = PATH_STROKE_WIDTH;
  const alpha = animationProgress;

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Tile background */}
      <RoundedRect
        x={pad}
        y={pad}
        width={innerSize}
        height={innerSize}
        r={6}
        color={highlighted ? Colors.tileHighlight : Colors.tileEmptyBorder}
      />
      <RoundedRect
        x={pad + 1}
        y={pad + 1}
        width={innerSize - 2}
        height={innerSize - 2}
        r={5}
        color={highlighted ? Colors.tileHighlight : Colors.bgCard}
      />

      {/* Cyan path */}
      <Group transform={[{ translateX: pad }, { translateY: pad }]}>
        {/* Glow layer */}
        <Path
          path={cyanPath}
          style="stroke"
          strokeWidth={strokeWidth + 4}
          color={`rgba(0, 245, 255, ${0.2 * alpha})`}
          strokeCap="round"
        />
        {/* Main path */}
        <Path
          path={cyanPath}
          style="stroke"
          strokeWidth={strokeWidth}
          color={`rgba(0, 245, 255, ${alpha})`}
          strokeCap="round"
        />
      </Group>

      {/* Orange path */}
      <Group transform={[{ translateX: pad }, { translateY: pad }]}>
        {/* Glow layer */}
        <Path
          path={orangePath}
          style="stroke"
          strokeWidth={strokeWidth + 4}
          color={`rgba(255, 107, 53, ${0.2 * alpha})`}
          strokeCap="round"
        />
        {/* Main path */}
        <Path
          path={orangePath}
          style="stroke"
          strokeWidth={strokeWidth}
          color={`rgba(255, 107, 53, ${alpha})`}
          strokeCap="round"
        />
      </Group>
    </Canvas>
  );
};

export default TilePainter;
