import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { theme } from '../theme';
import { useTranslation } from '../context/TranslationContext';
import { Language } from '../services/translation/languages';
import { AppText } from './AppText';
import { AppTextInput } from './AppTextInput';

export function OnboardingLanguageScreen() {
  const {
    supportedLanguages,
    completeOnboardingAndSetLanguage,
    skipOnboarding,
    isModelDownloading,
    downloadProgress,
    isNativeReady,
    bridgeStatus,
  } = useTranslation();

  const [selected, setSelected] = useState<string>('en');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return supportedLanguages;
    const q = search.toLowerCase();
    return supportedLanguages.filter(l => l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q) || l.code.includes(q));
  }, [supportedLanguages, search]);

  const selectedLang: Language | undefined = supportedLanguages.find(l => l.code === selected);

  const handleContinue = async () => {
    if (selected === 'en') {
      await skipOnboarding();
      return;
    }
    setError(null);
    try {
      await completeOnboardingAndSetLanguage(selected);
    } catch (e: any) {
      setError(e?.message || 'Failed to download translation model. Check your internet and try again.');
    }
  };

  const handleSkip = async () => {
    await skipOnboarding();
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText style={styles.logo}>🌐</AppText>
          <AppText style={styles.title}>Choose your language</AppText>
          <AppText style={styles.subtitle}>Select your native language</AppText>
          <AppText style={styles.desc}>
            OctoPulse will download a FREE on-device ML Kit for your language and translate every screen automatically. Works
            offline.
          </AppText>
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>⚡ FREE • Offline • No API Key • Powered by Google ML Kit</AppText>
          </View>
          {!isNativeReady && (
            <View style={styles.warnBox}>
              <AppText style={styles.warnText}>{bridgeStatus}</AppText>
              <AppText style={[styles.warnText, { marginTop: 4, opacity: 0.8, fontSize: 11 }]}>
                Translation will use bundled dictionaries until you build a development APK with native ML Kit.
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.searchBox}>
          <AppTextInput
            style={styles.searchInput}
            placeholder="Search languages..."
            placeholderTextColor={theme.colors.textDim}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        <View style={styles.grid}>
          {filtered.map(lang => {
            const isSelected = selected === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => setSelected(lang.code)}
                style={[styles.langCard, isSelected && styles.langCardSelected]}
                activeOpacity={0.85}>
                <AppText style={styles.flag}>{lang.flag}</AppText>
                <AppText style={[styles.langNative, isSelected && styles.langNativeSelected]} numberOfLines={1}>
                  {lang.nativeName}
                </AppText>
                <AppText style={[styles.langName, isSelected && styles.langNameSelected]} numberOfLines={1}>
                  {lang.name}
                </AppText>
                <AppText style={styles.langMeta}>
                  {lang.code === 'en' ? 'Default' : `~${lang.modelSizeMb} MB`}
                </AppText>
                {isSelected && <View style={styles.check}><AppText style={styles.checkText}>✓</AppText></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <AppText style={styles.errorTitle}>Download failed</AppText>
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        )}

        {isModelDownloading ? (
          <View style={styles.downloadingCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText style={styles.downloadingTitle}>Downloading ML Kit model...</AppText>
            <AppText style={styles.downloadingSubtitle}>
              {selectedLang?.flag} {selectedLang?.nativeName} • ~{selectedLang?.modelSizeMb} MB • Offline model • Free
            </AppText>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
            </View>
            <AppText style={styles.progressText}>{downloadProgress}%</AppText>
            <AppText style={styles.downloadingHint}>Keep the app open. Download uses Google ML Kit (no API key).</AppText>
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleContinue}
              style={[styles.primaryBtn, selected !== 'en' && styles.primaryBtnHighlight]}
              activeOpacity={0.9}>
              <AppText style={styles.primaryBtnText}>
                {selected === 'en' ? 'Continue in English →' : `Download ML Kit & Continue →`}
              </AppText>
              {selected !== 'en' && <AppText style={styles.primaryBtnSub}>{selectedLang?.flag} {selectedLang?.nativeName} • FREE • ~{selectedLang?.modelSizeMb} MB</AppText>}
            </TouchableOpacity>

            {selected !== 'en' && (
              <TouchableOpacity onPress={handleSkip} style={styles.secondaryBtn}>
                <AppText style={styles.secondaryBtnText}>Skip (Stay in English)</AppText>
              </TouchableOpacity>
            )}
            <AppText style={styles.footerNote}>
              You can change the language anytime in Settings → Language & Translation. Models are stored on-device and work without internet after download.
            </AppText>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 18, paddingBottom: 8 },
  logo: { fontSize: 44, marginBottom: 10 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' },
  subtitle: { color: theme.colors.primaryLight, fontSize: 13, fontWeight: '800', marginTop: 4, letterSpacing: 0.5, textAlign: 'center' },
  desc: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10, paddingHorizontal: 12 },
  badge: {
    marginTop: 12,
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: theme.colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  warnBox: {
    marginTop: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 10,
    borderRadius: 10,
    width: '100%',
  },
  warnText: { color: '#f59e0b', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  searchBox: {
    marginTop: 16,
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'android' ? 2 : 10,
  },
  searchInput: { color: theme.colors.text, fontSize: 14, paddingVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  langCard: {
    width: (require('react-native').Dimensions.get('window').width - 16 * 2 - 10) / 2,
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  langCardSelected: { borderColor: theme.colors.primary, backgroundColor: 'rgba(14,165,233,0.08)', borderWidth: 2 },
  flag: { fontSize: 30, marginBottom: 6 },
  langNative: { color: theme.colors.text, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  langNativeSelected: { color: theme.colors.primary },
  langName: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  langNameSelected: { color: theme.colors.text },
  langMeta: { color: theme.colors.textDim, fontSize: 10, marginTop: 4, fontWeight: '700' },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 2,
  },
  primaryBtnHighlight: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  primaryBtnSub: { color: '#e0f2fe', fontSize: 11, fontWeight: '700', marginTop: 3 },
  secondaryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '800' },
  footerNote: { color: theme.colors.textDim, fontSize: 10, textAlign: 'center', marginTop: 14, lineHeight: 14, paddingHorizontal: 8 },
  errorBox: {
    marginTop: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 12,
    borderRadius: 12,
  },
  errorTitle: { color: theme.colors.error, fontSize: 13, fontWeight: '800' },
  errorText: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4, lineHeight: 15 },
  downloadingCard: {
    marginTop: 18,
    backgroundColor: theme.colors.bgCardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  downloadingTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 12 },
  downloadingSubtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.bg,
    borderRadius: 8,
    marginTop: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 8 },
  progressText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800', marginTop: 6 },
  downloadingHint: { color: theme.colors.textDim, fontSize: 10, marginTop: 8, textAlign: 'center' },
});
