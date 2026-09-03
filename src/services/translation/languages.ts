/**
 * Supported languages for on-device ML Kit translation.
 * Each entry corresponds to a downloadable ML Kit Translate model.
 * Models are FREE, on-device, offline-capable, ~30-40MB each.
 * Source language is always English (en) -> target language.
 */

export type Language = {
  code: string; // BCP-47 lowercase, e.g., "es", "fr", "zh", "ar"
  mlKitCode: string; // Code expected by native MLKitTranslateModule
  name: string; // English name
  nativeName: string; // Autonym
  flag: string; // Emoji flag
  rtl?: boolean;
  modelSizeMb?: number; // Approx download size
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', mlKitCode: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', modelSizeMb: 0 },
  { code: 'es', mlKitCode: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', modelSizeMb: 32 },
  { code: 'fr', mlKitCode: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', modelSizeMb: 34 },
  { code: 'de', mlKitCode: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', modelSizeMb: 35 },
  { code: 'zh', mlKitCode: 'zh', name: 'Chinese (Simplified)', nativeName: '中文', flag: '🇨🇳', modelSizeMb: 38 },
  { code: 'ja', mlKitCode: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', modelSizeMb: 36 },
  { code: 'pt', mlKitCode: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', modelSizeMb: 32 },
  { code: 'ru', mlKitCode: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', modelSizeMb: 34 },
  { code: 'ar', mlKitCode: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true, modelSizeMb: 33 },
  { code: 'hi', mlKitCode: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', modelSizeMb: 31 },
  { code: 'it', mlKitCode: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', modelSizeMb: 32 },
  { code: 'ko', mlKitCode: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', modelSizeMb: 35 },
  { code: 'nl', mlKitCode: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', modelSizeMb: 31 },
  { code: 'tr', mlKitCode: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', modelSizeMb: 30 },
  { code: 'pl', mlKitCode: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', modelSizeMb: 32 },
  { code: 'uk', mlKitCode: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', modelSizeMb: 31 },
  { code: 'vi', mlKitCode: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', modelSizeMb: 30 },
  { code: 'id', mlKitCode: 'id', name: 'Indonesian', nativeName: 'Indonesia', flag: '🇮🇩', modelSizeMb: 30 },
  { code: 'th', mlKitCode: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', modelSizeMb: 32 },
  { code: 'el', mlKitCode: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', modelSizeMb: 31 },
];

export const DEFAULT_LANGUAGE_CODE = 'en';

export function getLanguageByCode(code: string): Language | undefined {
  const normalized = code.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.find(l => l.code === normalized);
}

export function getLanguageDisplayName(code: string): string {
  const lang = getLanguageByCode(code);
  if (!lang) return code;
  return `${lang.flag} ${lang.nativeName} (${lang.name})`;
}
