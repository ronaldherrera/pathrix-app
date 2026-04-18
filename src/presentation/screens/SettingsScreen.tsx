// ============================================================
// PATHRIX - Settings Screen
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { GlassCard, PageHeader, glassStyle } from '../components/ui';
import { useI18n, LANGUAGES, LangCode } from '../../core/i18n';

interface Settings {
  notificationsEnabled: boolean; showForcedMoveHints: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true, showForcedMoveHints: true, vibrationEnabled: true,
};

interface SettingsScreenProps { navigation: any; }

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { t, lang, setLang } = useI18n();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showLangModal, setShowLangModal] = useState(false);

  const toggle = (key: keyof Settings) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem('@pathrix_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const currentLang = LANGUAGES.find(l => l.code === lang);

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title={t('settings.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#000000' }}
      >
        <Section title={t('settings.gameplay')}>
          <SettingsToggle icon="bulb-outline"           label={t('settings.hints')}             description={t('settings.hints.desc')}             value={settings.showForcedMoveHints} onToggle={() => toggle('showForcedMoveHints')} />
          <SettingsToggle icon="phone-portrait-outline" label={t('settings.vibration')}         description={t('settings.vibration.desc')}         value={settings.vibrationEnabled}     onToggle={() => toggle('vibrationEnabled')} />
        </Section>

        <Section title={t('settings.notifications')}>
          <SettingsToggle icon="notifications-outline"  label={t('settings.pushNotifications')} description={t('settings.pushNotifications.desc')} value={settings.notificationsEnabled} onToggle={() => toggle('notificationsEnabled')} />
        </Section>

        <Section title={t('settings.language')}>
          <TouchableOpacity style={rowStyles.row} onPress={() => setShowLangModal(true)} activeOpacity={0.7}>
            <View style={rowStyles.iconBg}>
              <Ionicons name="language-outline" size={18} color={Colors.textSecondary} />
            </View>
            <View style={rowStyles.text}>
              <Text style={rowStyles.label}>{t('settings.language')}</Text>
              <Text style={rowStyles.description}>{t('settings.language.desc')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Text style={styles.langValue}>{currentLang?.flag} {currentLang?.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        </Section>

        <Section title={t('settings.about')}>
          <SettingsRow icon="information-circle-outline" label={t('settings.version')}  value="1.0.0" />
          <SettingsRow icon="star-outline"               label={t('settings.rate')}     onPress={() => {}} />
          <SettingsRow icon="share-outline"              label={t('settings.share')}    onPress={() => {}} />
          <SettingsRow icon="shield-outline"             label={t('settings.privacy')}  onPress={() => {}} />
          <SettingsRow icon="document-text-outline"      label={t('settings.terms')}    onPress={() => {}} />
        </Section>

        <Text style={styles.footerText}>
          Pathrix — original path-connection strategy game.{'\n'}© 2024 Pathrix. All rights reserved.
        </Text>
      </ScrollView>

      {/* Language picker modal */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.langSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('settings.language')}</Text>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langRow, l.code === lang && styles.langRowActive]}
                onPress={async () => { await setLang(l.code as LangCode); setShowLangModal(false); }}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langLabel, l.code === lang && styles.langLabelActive]}>{l.label}</Text>
                {l.code === lang && <Ionicons name="checkmark" size={20} color={Colors.orange} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLangModal(false)}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Sub-components ────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={sectionStyles.container}>
    <Text style={sectionStyles.title}>{title}</Text>
    <GlassCard style={sectionStyles.card}>{children}</GlassCard>
  </View>
);

const sectionStyles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  title: { color: Colors.textMuted, fontSize: Typography.xs, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs },
  card: { borderRadius: Radius.xl, overflow: 'hidden' },
});

const Toggle: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => (
  <TouchableOpacity
    onPress={onToggle}
    activeOpacity={0.8}
    style={[toggleStyles.track, value && toggleStyles.trackActive]}
  >
    <View style={[toggleStyles.thumb, value && toggleStyles.thumbActive]} />
  </TouchableOpacity>
);

const toggleStyles = StyleSheet.create({
  track: {
    width: 36, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  trackActive: { backgroundColor: Colors.orange },
  thumb: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.textMuted,
    alignSelf: 'flex-start',
  },
  thumbActive: {
    backgroundColor: Colors.textPrimary,
    alignSelf: 'flex-end',
  },
});

const SettingsToggle: React.FC<{ icon: string; label: string; description: string; value: boolean; onToggle: () => void }> = ({ icon, label, description, value, onToggle }) => (
  <View style={rowStyles.row}>
    <View style={rowStyles.iconBg}>
      <Ionicons name={icon as any} size={18} color={Colors.textSecondary} />
    </View>
    <View style={rowStyles.text}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.description}>{description}</Text>
    </View>
    <Toggle value={value} onToggle={onToggle} />
  </View>
);

const SettingsRow: React.FC<{ icon: string; label: string; value?: string; onPress?: () => void }> = ({ icon, label, value, onPress }) => (
  <TouchableOpacity style={rowStyles.row} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={rowStyles.iconBg}>
      <Ionicons name={icon as any} size={18} color={Colors.textSecondary} />
    </View>
    <Text style={[rowStyles.label, { flex: 1 }]}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      {value && <Text style={rowStyles.description}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
    </View>
  </TouchableOpacity>
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.md,
  },
  iconBg: {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  text: { flex: 1 },
  label: { color: Colors.textPrimary, fontSize: Typography.md },
  description: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { padding: Spacing?.lg || 24, paddingBottom: 48 },
  footerText: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center', lineHeight: 18, marginTop: Spacing?.lg || 24 },
  langValue: { color: Colors.textSecondary, fontSize: Typography.sm },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  langSheet: { borderTopLeftRadius: Radius?.xxl || 24, borderTopRightRadius: Radius?.xxl || 24, padding: Spacing?.lg || 24, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: Spacing?.lg || 24 },
  sheetTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing?.lg || 24 },

  langRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing?.md || 16, paddingVertical: Spacing?.md || 16, paddingHorizontal: Spacing?.sm || 8, borderRadius: Radius?.lg || 12, marginBottom: 4 },
  langRowActive: { backgroundColor: 'rgba(164, 95, 52, 0.15)' },
  langFlag: { fontSize: 24 },
  langLabel: { flex: 1, color: Colors.textSecondary, fontSize: Typography.md },
  langLabelActive: { color: Colors.textPrimary, fontWeight: '600' },

  cancelBtn: { marginTop: Spacing?.sm || 8, paddingVertical: Spacing?.md || 16, alignItems: 'center', ...glassStyle, borderRadius: Radius?.xl || 16 },
  cancelText: { color: Colors.textSecondary, fontSize: Typography.md },
});

export default SettingsScreen;
