// ============================================================
// PATHRIX - Tutorial Screen
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Svg, { Path } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius, TILE_SIZE } from '../../core/theme';
import { TileType } from '../../domain/enums';
import TilePainter from '../components/board/TilePainter';
import { useI18n } from '../../core/i18n';

const { width } = Dimensions.get('window');

// ── Static visuals (no text) ──────────────────────────────────

const TileShowcase: React.FC = () => (
  <View style={{ flexDirection: 'row', gap: 24, justifyContent: 'center', marginVertical: 16 }}>
    <View style={{ alignItems: 'center', gap: 8 }}>
      <TilePainter type={TileType.TYPE_A} size={TILE_SIZE * 2} />
      <Text style={{ color: Colors.textSecondary, fontSize: Typography.sm }}>Type A</Text>
    </View>
    <View style={{ alignItems: 'center', gap: 8 }}>
      <TilePainter type={TileType.TYPE_B} size={TILE_SIZE * 2} />
      <Text style={{ color: Colors.textSecondary, fontSize: Typography.sm }}>Type B</Text>
    </View>
  </View>
);

const MiniBoard: React.FC = () => {
  const S = TILE_SIZE * 1.4;
  const GAP = 3;
  // Valid 3×3 board state — all adjacent edges match.
  // Edge colors per type: A(N=C,E=O,S=C,W=O) A90(N=O,E=C,S=O,W=C)
  //   B(N=C,E=C,S=O,W=O) B90(N=O,E=C,S=C,W=O) B180(N=O,E=O,S=C,W=C) B270(N=C,E=O,S=O,W=C)
  // null = empty cell, 'selected' = highlighted empty cell (player tap target)
  const grid: (TileType | null | 'selected')[][] = [
    [TileType.TYPE_A,     'selected',          TileType.TYPE_B_270],
    [TileType.TYPE_B,     TileType.TYPE_B_270, TileType.TYPE_B_90 ],
    [TileType.TYPE_B_180, null,                TileType.TYPE_B_270],
  ];
  return (
    <View style={{ alignSelf: 'center', marginVertical: 16, gap: GAP }}>
      {grid.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: GAP }}>
          {row.map((cell, c) => {
            if (cell !== null && cell !== 'selected') {
              return <TilePainter key={c} type={cell} size={S} />;
            }
            const selected = cell === 'selected';
            return (
              <View
                key={c}
                style={{
                  width: S, height: S,
                  borderRadius: S * 0.18,
                  backgroundColor: selected ? '#2a2a2a' : Colors.tileEmpty,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? Colors.cyan : Colors.tileEmptyBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{
                  color: selected ? Colors.cyan : Colors.tileEmptyBorder,
                  fontSize: S * 0.45,
                  fontWeight: '300',
                  lineHeight: S * 0.5,
                }}>+</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// ── Translated visuals ────────────────────────────────────────

const WinConditionsVisual: React.FC = () => {
  const t = useI18n(s => s.t);
  const lang = useI18n(s => s.lang); // re-render on lang change
  void lang;
  return (
    <View style={{ gap: 12, marginVertical: 16 }}>
      <View style={[winStyles.conditionCard, { borderColor: Colors.cyan }]}>
        <Text style={winStyles.conditionIcon}>🔄</Text>
        <View style={{ flex: 1 }}>
          <Text style={winStyles.conditionTitle}>{t('tutorial.step5.loopTitle')}</Text>
          <Text style={winStyles.conditionDesc}>{t('tutorial.step5.loopDesc')}</Text>
        </View>
      </View>
      <View style={[winStyles.conditionCard, { borderColor: Colors.orange }]}>
        <Text style={winStyles.conditionIcon}>↔</Text>
        <View style={{ flex: 1 }}>
          <Text style={winStyles.conditionTitle}>{t('tutorial.step5.edgeTitle')}</Text>
          <Text style={winStyles.conditionDesc}>{t('tutorial.step5.edgeDesc')}</Text>
        </View>
      </View>
    </View>
  );
};

const ForcedMoveExample: React.FC = () => {
  const t = useI18n(s => s.t);
  const lang = useI18n(s => s.lang);
  void lang;
  return (
    <View style={{ padding: 16, backgroundColor: Colors.bgCardAlt, borderRadius: Radius.lg, marginVertical: 16 }}>
      <Text style={{ color: Colors.warning, fontSize: Typography.md, fontWeight: 'bold', marginBottom: 8 }}>
        {t('tutorial.step4.exampleTitle')}
      </Text>
      <Text style={{ color: Colors.textSecondary, fontSize: Typography.sm, lineHeight: 20 }}>
        {t('tutorial.step4.exampleBody')}
      </Text>
    </View>
  );
};

const PlayModesVisual: React.FC = () => {
  const t = useI18n(s => s.t);
  const lang = useI18n(s => s.lang);
  void lang;
  const modes = [
    { icon: '🤖', labelKey: 'tutorial.step6.botLabel', descKey: 'tutorial.step6.botDesc' },
    { icon: '🌍', labelKey: 'tutorial.step6.randomLabel', descKey: 'tutorial.step6.randomDesc' },
    { icon: '👥', labelKey: 'tutorial.step6.friendLabel', descKey: 'tutorial.step6.friendDesc' },
  ];
  return (
    <View style={{ gap: 8, marginVertical: 16 }}>
      {modes.map(item => (
        <View
          key={item.labelKey}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: Colors.bgCardAlt, borderRadius: Radius.lg }}
        >
          <Text style={{ fontSize: 24 }}>{item.icon}</Text>
          <View>
            <Text style={{ color: Colors.textPrimary, fontWeight: 'bold' }}>{t(item.labelKey)}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: Typography.sm }}>{t(item.descKey)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const GoBackVisual: React.FC = () => {
  const t = useI18n(s => s.t);
  const lang = useI18n(s => s.lang);
  void lang;
  return (
    <View style={{ gap: 16, marginVertical: 16 }}>
      {/* Button preview */}
      <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.bgCard, borderRadius: Radius.xl, paddingVertical: 12, paddingHorizontal: 24 }}>
        <Svg width={26} height={24} viewBox="0 0 36 34" fill="none">
          <Path d="M28.2352 28.625C28.2352 27.996 28.4851 27.3919 28.9315 26.9463C29.378 26.5007 29.9845 26.2501 30.6171 26.25C31.2498 26.25 31.857 26.5006 32.3036 26.9463C32.75 27.3919 32.9999 27.9961 32.9999 28.625C32.9999 29.2539 32.75 29.8581 32.3036 30.3037C31.857 30.7494 31.2498 31 30.6171 31C29.9845 30.9999 29.378 30.7493 28.9315 30.3037C28.4851 29.8581 28.2352 29.254 28.2352 28.625ZM4.94128 28.625C4.94128 27.996 5.19111 27.3919 5.63757 26.9463C6.08406 26.5007 6.69049 26.2501 7.32312 26.25C7.95572 26.25 8.56214 26.5008 9.00867 26.9463C9.45513 27.3919 9.70593 27.996 9.70593 28.625C9.70593 29.254 9.45513 29.8581 9.00867 30.3037C8.56214 30.7492 7.95572 31 7.32312 31C6.69049 30.9999 6.08406 30.7493 5.63757 30.3037C5.19111 29.8581 4.94128 29.254 4.94128 28.625ZM2.55945 10.126C1.97312 9.54076 1.02359 9.54162 0.438354 10.1279C-0.146868 10.7143 -0.146005 11.6638 0.440308 12.249L6.26355 18.0615C6.84907 18.6459 7.79713 18.6459 8.38269 18.0615L14.2069 12.249C14.793 11.6638 14.7938 10.7142 14.2089 10.1279C13.6237 9.54165 12.6741 9.54092 12.0878 10.126L8.82312 13.3838V13.125C8.82312 10.4406 9.89217 7.86582 11.7948 5.9668C13.6975 4.06772 16.2785 3 18.9706 3C21.6626 3.00003 24.2437 4.0677 26.1464 5.9668C28.049 7.86582 29.1171 10.4406 29.1171 13.125V17C29.1171 17.8283 29.7888 18.4998 30.6171 18.5C31.4455 18.5 32.1171 17.8284 32.1171 17V13.125C32.1171 9.64312 30.7314 6.30397 28.2655 3.84277C25.7998 1.38194 22.4563 3.02478e-05 18.9706 0C15.4847 0 12.1405 1.38168 9.67468 3.84277C7.20882 6.30397 5.82312 9.64312 5.82312 13.125V13.3828L2.55945 10.126ZM25.2352 28.625C25.2352 30.0514 25.8027 31.419 26.8124 32.4268C27.8219 33.4343 29.1907 33.9999 30.6171 34C32.0436 34 33.4131 33.4345 34.4227 32.4268C35.4323 31.419 35.9999 30.0514 35.9999 28.625C35.9999 27.1986 35.4323 25.831 34.4227 24.8232C33.4131 23.8155 32.0436 23.25 30.6171 23.25C29.1907 23.2501 27.8219 23.8157 26.8124 24.8232C25.8027 25.831 25.2352 27.1986 25.2352 28.625ZM1.94128 28.625C1.94128 30.0515 2.50874 31.419 3.51843 32.4268C4.52797 33.4344 5.89665 33.9999 7.32312 34C8.74969 34 10.1192 33.4345 11.1288 32.4268C12.1384 31.419 12.7059 30.0514 12.7059 28.625C12.7059 27.1986 12.1384 25.831 11.1288 24.8232C10.1192 23.8155 8.74969 23.25 7.32312 23.25C5.89665 23.2501 4.52797 23.8156 3.51843 24.8232C2.50874 25.831 1.94128 27.1985 1.94128 28.625Z" fill="#8B7359"/>
        </Svg>
        <Text style={{ color: Colors.textSecondary, fontSize: Typography.md, fontWeight: 'bold' }}>Go Back</Text>
      </View>
      {/* Info cards */}
      {[
        { labelKey: 'tutorial.step7.once', descKey: 'tutorial.step7.onceDesc', icon: '🎯' },
        { labelKey: 'tutorial.step7.works', descKey: 'tutorial.step7.worksDesc', icon: '🌐' },
      ].map(item => (
        <View key={item.labelKey} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: Colors.bgCardAlt, borderRadius: Radius.lg }}>
          <Text style={{ fontSize: 22 }}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: 'bold', letterSpacing: 0.5 }}>{t(item.labelKey)}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: Typography.sm, marginTop: 2 }}>{t(item.descKey)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const winStyles = StyleSheet.create({
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.bgCardAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  conditionIcon: { fontSize: 28 },
  conditionTitle: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: 'bold' },
  conditionDesc: { color: Colors.textSecondary, fontSize: Typography.sm, marginTop: 2 },
});

// ── Screen ────────────────────────────────────────────────────

interface TutorialScreenProps {
  navigation: any;
}

const TutorialScreen: React.FC<TutorialScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const t = useI18n(s => s.t);
  const lang = useI18n(s => s.lang);

  const STEPS = useMemo(() => [
    {
      id: 1,
      title: t('tutorial.step1.title'),
      description: t('tutorial.step1.desc'),
      visual: (
        <View style={{ alignItems: 'center', marginVertical: 16 }}>
          <Text style={{ fontSize: 64 }}>🎮</Text>
        </View>
      ),
    },
    {
      id: 2,
      title: t('tutorial.step2.title'),
      description: t('tutorial.step2.desc'),
      visual: <TileShowcase />,
    },
    {
      id: 3,
      title: t('tutorial.step3.title'),
      description: t('tutorial.step3.desc'),
      visual: <MiniBoard />,
    },
    {
      id: 4,
      title: t('tutorial.step4.title'),
      description: t('tutorial.step4.desc'),
      visual: <ForcedMoveExample />,
    },
    {
      id: 5,
      title: t('tutorial.step7.title'),
      description: t('tutorial.step7.desc'),
      visual: <GoBackVisual />,
    },
    {
      id: 6,
      title: t('tutorial.step5.title'),
      description: t('tutorial.step5.desc'),
      visual: <WinConditionsVisual />,
    },
    {
      id: 7,
      title: t('tutorial.step6.title'),
      description: t('tutorial.step6.desc'),
      visual: <PlayModesVisual />,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lang]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigation.navigate('Home');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => navigation.navigate('Home');

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>{t('tutorial.skip')}</Text>
      </TouchableOpacity>

      {/* Current step */}
      {(() => {
        const item = STEPS[currentStep];
        return (
          <View style={[styles.stepContainer, { width }]}>
            <Text style={styles.stepNumber}>{item.id}/{STEPS.length}</Text>
            <Text style={styles.stepTitle}>{item.title}</Text>
            {item.visual}
            <Text style={styles.stepDescription}>{item.description}</Text>
          </View>
        );
      })()}

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentStep && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={styles.btnRow}>
        {currentStep > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>{t('tutorial.back')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {currentStep === STEPS.length - 1 ? t('tutorial.letsPlay') : t('tutorial.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  skipBtn: { position: 'absolute', top: 56, right: Spacing.lg, zIndex: 10 },
  skipText: { color: Colors.textMuted, fontSize: Typography.md },

  stepContainer: {
    padding: Spacing.xl,
    paddingTop: 80,
    flex: 1,
  },
  stepNumber: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  stepTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.xxl,
    fontWeight: '900',
    marginBottom: Spacing.lg,
    lineHeight: 32,
  },
  stepDescription: {
    color: Colors.textSecondary,
    fontSize: Typography.md,
    lineHeight: 24,
    marginTop: Spacing.md,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.cyan,
  },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backBtn: {
    flex: 1,
    backgroundColor: Colors.bgCardAlt,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  backBtnText: { color: Colors.textSecondary, fontSize: Typography.lg, fontWeight: 'bold' },
  backBtnPlaceholder: { flex: 1 },
  nextBtn: {
    flex: 2,
    backgroundColor: Colors.cyan,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  nextBtnText: { color: Colors.textOnCyan, fontSize: Typography.lg, fontWeight: 'bold' },
});

export default TutorialScreen;
