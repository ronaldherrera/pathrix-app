// ============================================================
// PATHRIX - Profile Screen
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Modal, TextInput, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { useAuthStore, eloToRank } from '../store/authStore';
import {
  firebaseSignOut,
  updateDisplayName,
  deleteUserAccount,
  watchFriendRequests,
  getPendingChallenges,
  watchUserDocument,
  searchUsers,
  sendFriendRequest,
  watchSentFriendRequests,
  declineFriendRequest,
  reauthenticateUser,
  firebaseUpdateEmail,
  firebaseUpdatePassword,
  updateAvatarConfig,
} from '../../data/services/FirebaseService';
import { GlassCard, glassStyle, PageHeader, ConfirmModal } from '../components/ui';
import { 
  ProceduralAvatar, 
  generateRandomAvatar, 
  AvatarConfig,
  BaseShape,
  AvatarPattern,
  AvatarSymbol,
  BASE_SHAPES,
  AVATAR_PATTERNS,
  AVATAR_SYMBOLS
} from '../components/ProceduralAvatar';
import { useI18n } from '../../core/i18n';
import { hapticButtonPress } from '../../core/haptics';

interface ProfileScreenProps { navigation: any; route: any; }

function getRankColor(rank: string): string {
  const map: Record<string, string> = {
    Bronze: Colors.rankBronze, Silver: Colors.rankSilver, Gold: Colors.rankGold,
    Platinum: Colors.rankPlatinum, Diamond: Colors.rankDiamond, Master: Colors.rankMaster,
  };
  return map[rank] ?? Colors.textPrimary;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const { user: currentUser, signOut, updateProfile } = useAuthStore();
  const { t } = useI18n();

  const targetId = route?.params?.userId || currentUser?.uid;
  const isSelf = targetId === currentUser?.uid;

  const [otherUser, setOtherUser] = useState<any>(null);
  const [loadingOther, setLoadingOther] = useState(false);
  const [friendsBadge, setFriendsBadge] = useState(0);

  // Status/Context state for social actions
  const [isFriend, setIsFriend] = useState(false);
  const [sentRequestId, setSentRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !isSelf) return;
    let requests = 0, challenges = 0;
    const unsubReq = watchFriendRequests(currentUser.uid, (list) => { requests = list.length; setFriendsBadge(requests + challenges); });
    const unsubCh  = getPendingChallenges(currentUser.uid,  (list) => { challenges = list.length; setFriendsBadge(requests + challenges); });
    return () => { unsubReq(); unsubCh(); };
  }, [currentUser?.uid, isSelf]);

  useEffect(() => {
    if (!targetId) return;
    if (isSelf) {
      setOtherUser(null);
      setLoadingOther(false);
      return;
    }

    setLoadingOther(true);
    const unsub = watchUserDocument(targetId, (data) => {
      setOtherUser(data);
      setLoadingOther(false);
    });
    return unsub;
  }, [targetId, isSelf]);

  // Check relationship if NOT self
  useEffect(() => {
    if (isSelf || !currentUser || !targetId) return;
    setIsFriend(currentUser.friendIds.includes(targetId));

    const unsub = watchSentFriendRequests(currentUser.uid, (list) => {
      const found = list.find(r => r.toUid === targetId);
      setSentRequestId(found ? found.id : null);
    });
    return unsub;
  }, [isSelf, currentUser?.friendIds, targetId]);

  const user = isSelf ? currentUser : otherUser;


  const [showEditName, setShowEditName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Security actions state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'email'|'password'|null>(null);
  
  const [tempEmail, setTempEmail] = useState('');
  const [tempPass, setTempPass] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Avatar editor state
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<AvatarConfig | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<'shape' | 'pattern' | 'symbol' | 'color'>('shape');

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <PageHeader title={t('profile.title')} onBack={() => navigation.goBack()} />
        <View style={styles.notLoggedIn}>
          <Ionicons name="person-circle-outline" size={80} color={Colors.textMuted} />
          <Text style={styles.notLoggedInText}>{t('profile.notLoggedIn')}</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInBtnText}>{t('common.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingOther || (!user && targetId)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <PageHeader title={t('profile.title')} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.cyan} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <PageHeader title={t('profile.title')} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.notLoggedInText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const rank = eloToRank(user.elo);
  const rankColor = getRankColor(rank);
  const winRate = user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0;

  // ── Edit name ────────────────────────────────────────────────

  const openEditName = () => {
    setNewName(user.displayName);
    setShowEditName(true);
    hapticButtonPress();
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === user.displayName) {
      setShowEditName(false);
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(user.uid, newName.trim());
      updateProfile({ displayName: newName.trim() });
      setShowEditName(false);
    } catch (err: any) {
      if (err.message === 'USERNAME_TAKEN') {
        Alert.alert(t('common.error'), t('auth.usernameTaken'));
      } else {
        Alert.alert(t('common.error'), 'Could not update name.');
      }
    } finally {
      setSavingName(false);
    }
  };

  // ── Avatar Editor ──────────────────────────────────────────

  const openAvatarEditor = () => {
    setTempAvatar(user.avatarConfig || generateRandomAvatar());
    setShowAvatarEditor(true);
    hapticButtonPress();
  };

  const randomizeAvatar = () => {
    setTempAvatar(generateRandomAvatar());
    hapticButtonPress();
  };

  const saveAvatar = async () => {
    if (!tempAvatar || !isSelf) return;
    setIsSavingAvatar(true);
    try {
      await updateAvatarConfig(user.uid, tempAvatar);
      updateProfile({ avatarConfig: tempAvatar });
      setShowAvatarEditor(false);
    } catch {
      Alert.alert(t('common.error'), 'Could not save avatar');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // ── Sign out ─────────────────────────────────────────────────

  const handleSignOut = () => {
    hapticButtonPress();
    setShowSignOutConfirm(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutConfirm(false);
    await firebaseSignOut(); 
    signOut(); 
    navigation.navigate('Home');
  };

  // ── Delete account ───────────────────────────────────────────

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteUserAccount(user.uid);
      signOut();
      navigation.navigate('Home');
    } catch (err: any) {
      setShowDeleteModal(false);
      if (err?.code === 'auth/requires-recent-login') {
        Alert.alert(t('common.error'), t('profile.relogin'));
      } else {
        Alert.alert(t('common.error'), 'Could not delete account. Please try again.');
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  // ── Security & Reauth ───────────────────────────────────────

  const handleSecurityAction = (action: 'email' | 'password') => {
    hapticButtonPress();
    setPendingAction(action);
    setCurrentPass('');
    setShowReauthModal(true);
  };

  const onReauthConfirm = async () => {
    if (!currentPass) return;
    setIsProcessing(true);
    try {
      await reauthenticateUser(currentPass);
      setShowReauthModal(false);
      if (pendingAction === 'email') {
        setTempEmail(user.email || '');
        setShowEmailModal(true);
      } else {
        setTempPass('');
        setShowPassModal(true);
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), t('auth.invalidPassword') || 'Invalid password.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onUpdateEmailConfirm = async () => {
    if (!tempEmail || tempEmail === user.email) { setShowEmailModal(false); return; }
    setIsProcessing(true);
    try {
      await firebaseUpdateEmail(tempEmail);
      updateProfile({ email: tempEmail });
      setShowEmailModal(false);
      Alert.alert('Success', 'Email updated successfully.');
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Could not update email.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onUpdatePassConfirm = async () => {
    if (!tempPass || tempPass.length < 6) { 
      Alert.alert(t('common.error'), 'Password must be at least 6 characters.'); 
      return; 
    }
    setIsProcessing(true);
    try {
      await firebaseUpdatePassword(tempPass);
      setShowPassModal(false);
      Alert.alert('Success', 'Password updated successfully.');
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Could not update password.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader
        title={isSelf ? t('profile.title') : user.displayName}
        onBack={() => navigation.goBack()}
        rightElement={isSelf ? (
          <TouchableOpacity onPress={() => { hapticButtonPress(); navigation.navigate('Settings'); }}>
            <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: '#000000' }}
      >
        {/* ── Avatar & identity ──────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <ProceduralAvatar size={96} config={user.avatarConfig} />
              )}
            </View>
            {isSelf && (
              <TouchableOpacity style={styles.cameraBtn} onPress={openAvatarEditor} activeOpacity={0.8}>
                <Ionicons name="color-palette" size={16} color="#000" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            onPress={isSelf ? openEditName : undefined} 
            style={styles.nameRow} 
            activeOpacity={isSelf ? 0.8 : 1}
          >
            <Text style={styles.displayName}>{user.displayName}</Text>
            {isSelf && <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />}
          </TouchableOpacity>

          <View style={styles.rankRow}>
            <Text style={[styles.rankBadge, { color: rankColor, borderColor: rankColor }]}>{rank}</Text>
            {user.status && (
              <View style={[styles.statusIndicator, { backgroundColor: user.status === 'free' ? '#4ade80' : user.status === 'playing' ? Colors.orange : Colors.textMuted }]} />
            )}
          </View>
          <Text style={styles.eloText}>{user.elo} ELO</Text>
          {isSelf && user.email ? <Text style={styles.emailText}>{user.email}</Text> : null}
        </View>

        {/* ── Stats grid ─────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatCard icon="game-controller-outline" label={t('profile.played')}   value={String(user.gamesPlayed)}   color={Colors.info} />
          <StatCard icon="trophy-outline"           label={t('profile.wins')}     value={String(user.gamesWon)}      color={Colors.success} />
          <StatCard icon="close-circle-outline"     label={t('profile.losses')}   value={String(user.gamesLost)}     color={Colors.error} />
          <StatCard icon="trending-up-outline"      label={t('profile.winRate')}  value={`${winRate}%`}              color={Colors.warning} />
          <StatCard icon="flame-outline"            label={t('profile.streak')}   value={String(user.currentStreak)} color={Colors.orange} />
          <StatCard icon="medal-outline"            label={t('profile.best')}     value={String(user.bestStreak)}    color={Colors.cyan} />
        </View>

        {/* ── Social Actions (for other users) ────────────────── */}
        {!isSelf && (
          <View style={styles.socialActions}>
            {isFriend ? (
              <TouchableOpacity 
                style={styles.challengeFullBtn} 
                onPress={() => { hapticButtonPress(); navigation.navigate('FriendChallenge', { friend: user }); }}
              >
                <Ionicons name="flash" size={20} color="#000" />
                <Text style={styles.challengeFullBtnText}>{t('challenge.btn')}</Text>
              </TouchableOpacity>
            ) : sentRequestId ? (
              <TouchableOpacity 
                style={[styles.challengeFullBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]} 
                onPress={() => { hapticButtonPress(); declineFriendRequest(sentRequestId); }}
              >
                <Ionicons name="close-outline" size={20} color={Colors.textMuted} />
                <Text style={[styles.challengeFullBtnText, { color: Colors.textMuted }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.challengeFullBtn, { backgroundColor: Colors.cyan }]} 
                onPress={() => { hapticButtonPress(); sendFriendRequest(currentUser.uid, currentUser.displayName, user.uid, user.displayName); }}
              >
                <Ionicons name="person-add-outline" size={20} color="#000" />
                <Text style={styles.challengeFullBtnText}>{t('friends.add')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Account actions (Self only) ────────────────────── */}
        {isSelf && (
          <GlassCard style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
            <ActionRow icon="people-outline"        label={t('profile.friends')}     value={`${user.friendIds.length}`} badge={friendsBadge} onPress={() => navigation.navigate('Friends')} />
            <ActionRow icon="trophy-outline"        label={t('profile.leaderboard')} onPress={() => navigation.navigate('Leaderboard')} />
            <ActionRow icon="pencil-outline"        label={t('profile.displayName')} onPress={openEditName} />
          </GlassCard>
        )}

        {/* ── Security actions (Self only) ────────────────────── */}
        {isSelf && (
          <GlassCard style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>{t('profile.security')}</Text>
            <ActionRow icon="mail-outline" label={t('profile.changeEmail')} subtitle={user.email} onPress={() => handleSecurityAction('email')} />
            <ActionRow icon="lock-closed-outline" label={t('profile.changePassword')} onPress={() => handleSecurityAction('password')} />
            
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* ── Danger zone (Self only) ────────────────────────── */}
        {isSelf && (
          <GlassCard style={[styles.actionsCard, styles.dangerCard]}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => { hapticButtonPress(); setShowDeleteModal(true); }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
              <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {isSelf && <Text style={styles.version}>{t('profile.version')}</Text>}
      </ScrollView>

      {/* ── Edit name modal ──────────────────────────────────── */}
      <Modal visible={showEditName} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.editModal}>
            <Text style={styles.modalTitle}>{t('profile.editName')}</Text>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('profile.namePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditName(false)}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveName} disabled={savingName}>
                {savingName
                  ? <ActivityIndicator color={Colors.textPrimary} size="small" />
                  : <Text style={styles.modalSaveText}>{t('profile.save')}</Text>}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* ── Sign out confirm modal ────────────────────────────── */}
      <ConfirmModal
        visible={showSignOutConfirm}
        title={t('profile.signOut')}
        message={t('profile.signOut.confirm')}
        confirmLabel={t('profile.signOut')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
        isDestructive
      />

      {/* ── Delete account confirm modal ────────────────────────── */}
      <ConfirmModal
        visible={showDeleteModal}
        title={t('profile.deleteAccount')}
        message={t('profile.deleteAccount.warning')}
        confirmLabel={t('profile.deleteAccount.btn')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
        isDestructive
      />

      {/* ── Re-auth Modal ────────────────────────────────────── */}
      <Modal visible={showReauthModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.editModal}>
            <Text style={styles.modalTitle}>{t('profile.reauthTitle')}</Text>
            <Text style={styles.modalSub}>{t('profile.reauthDesc')}</Text>
            <TextInput
              style={styles.nameInput}
              value={currentPass}
              onChangeText={setCurrentPass}
              placeholder={t('auth.password')}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowReauthModal(false)}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={onReauthConfirm} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={styles.modalSaveText}>{t('common.continue')}</Text>}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* ── New Email Modal ───────────────────────────────────── */}
      <Modal visible={showEmailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.editModal}>
            <Text style={styles.modalTitle}>{t('profile.changeEmail')}</Text>
            <TextInput
              style={styles.nameInput}
              value={tempEmail}
              onChangeText={setTempEmail}
              placeholder="new@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEmailModal(false)}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={onUpdateEmailConfirm} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={styles.modalSaveText}>{t('profile.save')}</Text>}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* ── Avatar Editor Modal ─────────────────────────────── */}
      <Modal visible={showAvatarEditor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.editModal, { maxHeight: '85%' }]}>
            <View style={styles.editorHeader}>
              <Text style={styles.modalTitle}>{t('profile.customizeAvatar')}</Text>
              <TouchableOpacity style={styles.headerDice} onPress={randomizeAvatar}>
                <Ionicons name="dice-outline" size={24} color={Colors.orange} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editorPreview}>
              {tempAvatar && (
                <View style={styles.previewContainer}>
                  <ProceduralAvatar size={140} config={tempAvatar} />
                </View>
              )}
            </View>

            {/* Category Tabs */}
            <View style={styles.tabContainer}>
              <TabIcon 
                name="shapes-outline" 
                active={activeTab === 'shape'} 
                label={t('profile.avatar.shape')}
                onPress={() => setActiveTab('shape')} 
              />
              <TabIcon 
                name="apps-outline" 
                active={activeTab === 'pattern'} 
                label={t('profile.avatar.pattern')}
                onPress={() => setActiveTab('pattern')} 
              />
              <TabIcon 
                name="sparkles-outline" 
                active={activeTab === 'symbol'} 
                label={t('profile.avatar.symbol')}
                onPress={() => setActiveTab('symbol')} 
              />
              <TabIcon 
                name="color-palette-outline" 
                active={activeTab === 'color'} 
                label={t('profile.avatar.color')}
                onPress={() => setActiveTab('color')} 
              />
            </View>

            <View style={styles.optionsArea}>
              {tempAvatar && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsContent}>
                  {activeTab === 'shape' && (
                    <View style={styles.optionGrid}>
                      {BASE_SHAPES.map(shape => (
                        <OptionItem 
                          key={shape}
                          active={tempAvatar.baseShape === shape}
                          onPress={() => setTempAvatar({...tempAvatar, baseShape: shape})}
                        >
                          <ProceduralAvatar size={46} config={{...tempAvatar, baseShape: shape, pattern: 'none', symbol: 'none'}} />
                        </OptionItem>
                      ))}
                    </View>
                  )}

                  {activeTab === 'pattern' && (
                    <View style={styles.optionGrid}>
                      {AVATAR_PATTERNS.map(pat => (
                        <OptionItem 
                          key={pat}
                          active={tempAvatar.pattern === pat}
                          onPress={() => setTempAvatar({...tempAvatar, pattern: pat})}
                        >
                          <ProceduralAvatar size={46} config={{...tempAvatar, pattern: pat, symbol: 'none'}} />
                        </OptionItem>
                      ))}
                    </View>
                  )}

                  {activeTab === 'symbol' && (
                    <View style={styles.optionGrid}>
                      {AVATAR_SYMBOLS.map(sym => (
                        <OptionItem 
                          key={sym}
                          active={tempAvatar.symbol === sym}
                          onPress={() => setTempAvatar({...tempAvatar, symbol: sym})}
                        >
                          <ProceduralAvatar size={46} config={{...tempAvatar, symbol: sym, pattern: 'none'}} />
                        </OptionItem>
                      ))}
                    </View>
                  )}

                  {activeTab === 'color' && tempAvatar && (
                    <View style={styles.pickerContainer}>
                      {/* Hue Spectrum Slider */}
                      <Text style={styles.pickerLabel}>{t('profile.avatar.hue')}</Text>
                      <ColorSlider 
                        color={tempAvatar.color} 
                        onChange={(newColor) => setTempAvatar({...tempAvatar, color: newColor})} 
                      />

                      {/* Lightness Slider */}
                      <Text style={styles.pickerLabel}>{t('profile.avatar.brightness')}</Text>
                      <BrightnessSlider 
                        color={tempAvatar.color} 
                        onChange={(newColor) => setTempAvatar({...tempAvatar, color: newColor})} 
                      />

                      {/* --- NUEVO: Toggle de Color en Fichas --- */}
                      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12 }}>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                          onPress={() => setTempAvatar({...tempAvatar, useCustomTileColor: !tempAvatar.useCustomTileColor})}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="color-filter-outline" size={18} color={tempAvatar.useCustomTileColor ? Colors.orange : Colors.textMuted} />
                            <Text style={{ color: Colors.textPrimary, fontSize: 13 }}>{t('profile.avatar.useCustomTileColor')}</Text>
                          </View>
                          <View style={{ 
                            width: 36, height: 20, borderRadius: 10, 
                            backgroundColor: tempAvatar.useCustomTileColor ? Colors.orange : 'rgba(255,255,255,0.1)',
                            justifyContent: 'center', paddingHorizontal: 2
                          }}>
                            <View style={{ 
                              width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff',
                              transform: [{ translateX: tempAvatar.useCustomTileColor ? 16 : 0 }]
                            }} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAvatarEditor(false)}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveAvatar} disabled={isSavingAvatar}>
                {isSavingAvatar ? <ActivityIndicator color="#000" /> : <Text style={styles.modalSaveText}>{t('profile.save')}</Text>}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* ── New Password Modal ────────────────────────────────── */}
      <Modal visible={showPassModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.editModal}>
            <Text style={styles.modalTitle}>{t('profile.changePassword')}</Text>
            <TextInput
              style={styles.nameInput}
              value={tempPass}
              onChangeText={setTempPass}
              placeholder={t('profile.changePassword')}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPassModal(false)}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={onUpdatePassConfirm} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={styles.modalSaveText}>{t('profile.save')}</Text>}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Sub-components ────────────────────────────────────────────

const StatCard: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <View style={[statStyles.card, glassStyle]}>
    <Ionicons name={icon as any} size={22} color={color} />
    <Text style={statStyles.value}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

// ── Color Picker Utilities ───────────────────────────────────

const hexToHsl = (hex: string) => {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100; const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

const ColorSlider: React.FC<{ color: string; onChange: (hex: string) => void }> = ({ color, onChange }) => {
  const { h, s, l } = hexToHsl(color);
  const [width, setWidth] = useState(0);

  const updateColor = (x: number) => {
    if (width === 0) return;
    const newH = Math.max(0, Math.min(360, (x / width) * 360));
    onChange(hslToHex(newH, s > 0 ? s : 100, l > 0 ? l : 50));
  };

  const gesture = Gesture.Pan()
    .onBegin((e) => updateColor(e.x))
    .onUpdate((e) => updateColor(e.x))
    .runOnJS(true);

  return (
    <GestureDetector gesture={gesture}>
      <View 
        style={pickerStyles.sliderWrap} 
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <LinearGradient
          colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={pickerStyles.gradient}
        />
        <View style={[pickerStyles.cursor, { left: `${(h / 360) * 100}%` }]} />
      </View>
    </GestureDetector>
  );
};

const BrightnessSlider: React.FC<{ color: string; onChange: (hex: string) => void }> = ({ color, onChange }) => {
  const { h, s, l } = hexToHsl(color);
  const [width, setWidth] = useState(0);

  const updateBrightness = (x: number) => {
    if (width === 0) return;
    const newL = Math.max(0, Math.min(100, (x / width) * 100));
    onChange(hslToHex(h, s, newL));
  };

  const gesture = Gesture.Pan()
    .onBegin((e) => updateBrightness(e.x))
    .onUpdate((e) => updateBrightness(e.x))
    .runOnJS(true);

  return (
    <GestureDetector gesture={gesture}>
      <View 
        style={pickerStyles.sliderWrap}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <LinearGradient
          colors={['#000000', hslToHex(h, s, 50), '#FFFFFF']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={pickerStyles.gradient}
        />
        <View style={[pickerStyles.cursor, { left: `${l}%` }]} />
      </View>
    </GestureDetector>
  );
};

const pickerStyles = StyleSheet.create({
  sliderWrap: { height: 24, borderRadius: 12, marginVertical: 4, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  gradient: { flex: 1 },
  cursor: { position: 'absolute', top: 0, width: 6, height: '100%', backgroundColor: '#fff', borderRadius: 3, borderWidth: 1, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 2 },
});

const OptionItem: React.FC<{ children: React.ReactNode; active: boolean; onPress: () => void }> = ({ children, active, onPress }) => (
  <TouchableOpacity 
    style={[optionStyles.item, active && optionStyles.active]} 
    onPress={() => { hapticButtonPress(); onPress(); }}
    activeOpacity={0.8}
  >
    {children}
  </TouchableOpacity>
);

const optionStyles = StyleSheet.create({
  item: { 
    width: '21%', 
    aspectRatio: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: Radius.lg, 
    borderWidth: 2, 
    borderColor: 'transparent',
    padding: 8,
  },
  active: { 
    borderColor: Colors.orange, 
    backgroundColor: 'rgba(164,95,52,0.25)',
    borderWidth: 2,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

const TabIcon: React.FC<{ name: string; active: boolean; label: string; onPress: () => void }> = ({ name, active, label, onPress }) => (
  <TouchableOpacity style={[tabStyles.btn, active && tabStyles.active]} onPress={onPress}>
    <Ionicons name={name as any} size={20} color={active ? Colors.orange : Colors.textMuted} />
    <Text style={[tabStyles.label, active && tabStyles.labelActive]}>{label}</Text>
  </TouchableOpacity>
);

const tabStyles = StyleSheet.create({
  btn: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 6, 
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  active: { 
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  label: { fontSize: 10, color: Colors.textMuted },
  labelActive: { color: Colors.textPrimary, fontWeight: 'bold' },
});

const statStyles = StyleSheet.create({
  card: { width: '30%', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: Spacing.xs },
  value: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold' },
  label: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center' },
});

const ActionRow: React.FC<{ icon: string; label: string; value?: string; subtitle?: string; badge?: number; onPress: () => void }> = ({ icon, label, value, subtitle, badge = 0, onPress }) => (
  <TouchableOpacity style={actionStyles.row} onPress={() => { hapticButtonPress(); onPress(); }} activeOpacity={0.7}>
    <View style={actionStyles.left}>
      <View style={actionStyles.iconBg}>
        <Ionicons name={icon as any} size={18} color={Colors.textSecondary} />
        {badge > 0 && (
          <View style={actionStyles.badge}>
            <Text style={actionStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <View>
        <Text style={actionStyles.label}>{label}</Text>
        {subtitle && <Text style={actionStyles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={actionStyles.right}>
      {value && <Text style={actionStyles.value}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </View>
  </TouchableOpacity>
);

const actionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBg: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -6, backgroundColor: Colors.error, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#000' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  label: { color: Colors.textPrimary, fontSize: Typography.md },
  subtitle: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  value: { color: Colors.textMuted, fontSize: Typography.sm },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { padding: Spacing.lg, paddingBottom: 48 },

  // Avatar section
  avatarSection: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  avatarWrapper: { position: 'relative', marginBottom: Spacing.xs },
  avatar: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 96, height: 96, borderWidth: 0.4, borderColor: 'rgba(255,255,255,0.25)' },
  avatarInitial: { color: Colors.textPrimary, fontSize: 42, fontWeight: '900' },
  cameraBtn: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  displayName: { color: Colors.textPrimary, fontSize: Typography.xxl, fontWeight: 'bold' },
  rankBadge: { borderWidth: 0.5, paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: Radius.full, fontSize: Typography.sm, fontWeight: 'bold' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#000' },
  eloText: { color: Colors.textSecondary, fontSize: Typography.md },
  emailText: { color: Colors.textMuted, fontSize: Typography.sm },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'space-between', marginBottom: Spacing.md },

  // Social
  socialActions: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.xs },
  challengeFullBtn: { height: 52, borderRadius: Radius.xl, backgroundColor: Colors.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  challengeFullBtnText: { color: '#000', fontSize: Typography.md, fontWeight: 'bold' },

  // Actions
  actionsCard: { borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.lg },
  dangerCard: { borderColor: 'rgba(220,50,50,0.2)', borderWidth: 0.5 },
  sectionTitle: { color: Colors.textMuted, fontSize: Typography.xs, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.sm },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  signOutText: { color: Colors.error, fontSize: Typography.md, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm },
  deleteText: { color: Colors.error, fontSize: Typography.md, fontWeight: '600' },
  version: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center' },

  // Not logged in
  notLoggedIn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xl },
  notLoggedInText: { color: Colors.textSecondary, fontSize: Typography.lg, textAlign: 'center' },
  signInBtn: { backgroundColor: Colors.orange, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.xl },
  signInBtnText: { color: Colors.textPrimary, fontWeight: 'bold', fontSize: Typography.md },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: Spacing.sm },
  editModal: { width: '95%', maxHeight: '90%', borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm, overflow: 'hidden' },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerDice: { padding: 8 },
  editorPreview: { alignItems: 'center', marginVertical: Spacing.md },
  previewContainer: { padding: 12, borderRadius: Radius.xl, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionsArea: { flexShrink: 1, minHeight: 180, maxHeight: 300 },
  optionsContent: { paddingVertical: Spacing.sm },
  optionGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12, 
    justifyContent: 'center',
    width: '100%',
    paddingVertical: Spacing.sm,
  },
  pickerContainer: { gap: 12, paddingHorizontal: 4 },
  pickerLabel: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  quickColors: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quickColorBtn: { flex: 1, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
  quickColorText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', paddingHorizontal: 10 },
  colorBubble: { width: 44, height: 44, borderRadius: 22 },
  modalTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold', textAlign: 'center' },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    color: Colors.textPrimary,
    fontSize: Typography.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  modalSub: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', marginBottom: Spacing.xs },
  deleteWarning: { color: Colors.textSecondary, fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalCancelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  modalCancelText: { color: Colors.textSecondary, fontSize: Typography.md },
  modalSaveBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.orange, alignItems: 'center' },
  modalDeleteBtn: { backgroundColor: Colors.error },
  modalSaveText: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '600' },

  // Avatar Editor Styles
  editorActions: { alignItems: 'center', marginBottom: Spacing.md },
  randomizeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  randomizeText: { color: Colors.textPrimary, fontWeight: 'bold' },
  optionsScroll: { maxHeight: 60, marginBottom: Spacing.md },
  optionsGrid: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  colorOption: { width: 40, height: 40, borderRadius: 20 },
});

export default ProfileScreen;
