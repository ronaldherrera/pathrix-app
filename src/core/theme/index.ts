// ============================================================
// PATHRIX - Design System / Theme
// ============================================================

export const Colors = {
  // ── Brand colors ──────────────────────────────────────────
  // Player 1 (Cyan tile path → usamos el blanco del diseño)
  cyan:      '#FBFBFB',
  cyanDark:  '#cccccc',
  cyanGlow:  'rgba(251, 251, 251, 0.15)',

  // Player 2 (Orange tile path → marrón/naranja de la marca)
  orange:    '#A45F34',
  orangeDark:'#7a4526',
  orangeGlow:'rgba(164, 95, 52, 0.25)',

  // ── Board ─────────────────────────────────────────────────
  boardBg:        '#1a1a1a',
  tileEmpty:      '#242424',
  tileEmptyBorder:'#2F2F2F',
  tileHover:      '#333333',
  tileHighlight:  '#3a3020',

  // ── UI Backgrounds ────────────────────────────────────────
  bg:          '#111111',       // fondo global
  bgCard:      '#2F2F2F',       // tarjetas
  bgCardAlt:   '#252525',       // tarjetas secundarias
  bgModal:     '#1e1e1e',

  // ── Text ──────────────────────────────────────────────────
  textPrimary:   '#FBFBFB',
  textSecondary: '#aaaaaa',
  textMuted:     '#666666',
  textOnCyan:    '#111111',
  textOnOrange:  '#FBFBFB',

  // ── States ────────────────────────────────────────────────
  success: '#4caf50',
  error:   '#ef5350',
  warning: '#A45F34',
  info:    '#90caf9',

  // ── Borders ───────────────────────────────────────────────
  border:      '#3a3a3a',
  borderLight: '#444444',
  borderFocus: '#A45F34',

  // ── Gradients ─────────────────────────────────────────────
  gradientTop:    '#1a1a1a',
  gradientBottom: '#0a0a0a',

  // ── Overlays ──────────────────────────────────────────────
  overlay:      'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(0, 0, 0, 0.6)',

  // ── Rank colors ───────────────────────────────────────────
  rankBronze:   '#A45F34',
  rankSilver:   '#aaaaaa',
  rankGold:     '#d4a843',
  rankPlatinum: '#c8d6e5',
  rankDiamond:  '#90caf9',
  rankMaster:   '#FBFBFB',
};

export const Typography = {
  fontBold:    'SofiaSans_400Regular',
  fontRegular: 'SofiaSans_400Regular',

  // letter-spacing base: 7% de 16px = 1.12
  letterSpacing: 1.12,

  xs:    11,
  sm:    13,
  md:    16,
  lg:    17,
  xl:    20,
  xxl:   24,
  xxxl:  32,
  display: 48,

  lineHeightTight:  1.2,
  lineHeightNormal: 1.5,
  lineHeightLoose:  1.8,
};

export const Spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl:64,
};

export const Radius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  24,
  full: 9999,
};

export const Shadow = {
  orange: {
    shadowColor: '#A45F34',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Helper: estilo de texto base para toda la app (Sofia Sans, ls 7%)
export const textBase = {
  fontFamily: 'SofiaSans_400Regular',
  letterSpacing: 1.12,
} as const;

// Board tile dimensions
export const TILE_SIZE          = 60;
export const TILE_PADDING       = 3;
export const PATH_STROKE_WIDTH  = 11;
export const PATH_STROKE_HIGHLIGHT = 15;
