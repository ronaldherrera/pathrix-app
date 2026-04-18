// ============================================================
// PATHRIX - Tile Painter Fallback (Web / sin Skia nativo)
// ============================================================

import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { TileType, PlayerColor } from '../../../domain/enums';
import { TILE_SIZE } from '../../../core/theme';

interface Props {
  type: TileType;
  size?: number;
  highlighted?: boolean;
  playerColor?: PlayerColor | null; // if set, renders only that color's path
  customCyanColor?: string;
  customOrangeColor?: string;
}

const ROTATIONS: Record<TileType, number> = {
  [TileType.TYPE_A]:    0,
  [TileType.TYPE_A_90]: 90,
  [TileType.TYPE_B]:    0,
  [TileType.TYPE_B_90]: 90,
  [TileType.TYPE_B_180]:180,
  [TileType.TYPE_B_270]:270,
};

const isCurve = (type: TileType) =>
  type === TileType.TYPE_B || type === TileType.TYPE_B_90 ||
  type === TileType.TYPE_B_180 || type === TileType.TYPE_B_270;

const TilePainterFallback: React.FC<Props> = ({ type, size = TILE_SIZE, highlighted = false, playerColor = null, customCyanColor, customOrangeColor }) => {
  const rotation = ROTATIONS[type];
  const curve = isCurve(type);
  const bg = highlighted ? '#3a2a00' : '#2F2F2F';

  const showCyan   = playerColor === null || playerColor === PlayerColor.CYAN;
  const showOrange = playerColor === null || playerColor === PlayerColor.ORANGE;

  const cyanFinal   = customCyanColor || '#FBFBFB';
  const orangeFinal = customOrangeColor || '#A45F34';

  return (
    <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      {curve ? (
        <Svg width={size} height={size} viewBox="0 0 273 273" fill="none">
          <Rect width={273} height={273} rx={46} fill={bg} />
          {showCyan   && <Path d="M272.044 153C187.429 153.219 118.825 84.6144 119.044 0H153.044C152.873 65.7681 206.276 119.171 272.044 119V153Z" fill={cyanFinal} />}
          {showOrange && <Path d="M0 119C84.6144 118.781 153.263 187.429 153.044 272.044L119.044 271.956C119.214 206.188 65.8558 152.829 0.0876978 153L0 119Z" fill={orangeFinal} />}
        </Svg>
      ) : (
        <Svg width={size} height={size} viewBox="0 0 272 272" fill="none">
          <Rect width={272} height={272} rx={46} fill={bg} />
          {showCyan   && <Path d="M119 0H153V272H119V0Z" fill={cyanFinal} />}
          {showOrange && <Path d="M114 119V153L0 153L0 119L114 119Z" fill={orangeFinal} />}
          {showOrange && <Path d="M272 119V153L158 153V119L272 119Z" fill={orangeFinal} />}
        </Svg>
      )}
    </View>
  );
};

export default TilePainterFallback;
