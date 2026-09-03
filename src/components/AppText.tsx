import React, { useEffect, useState } from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useTranslation } from '../context/TranslationContext';
import { onCacheUpdate } from '../services/translation';

/**
 * AppText — drop-in replacement for React Native <Text> that auto-translates
 * every string child via FREE on-device Google ML Kit.
 *
 * It listens for async ML Kit batch completions and triggers re-renders so text
 * immediately changes everywhere when a language is selected or model downloads.
 */
export function AppText(props: TextProps) {
  const { t, currentLanguage, version } = useTranslation();
  const [, setLocalVersion] = useState(0);

  useEffect(() => {
    const unsub = onCacheUpdate(() => {
      setLocalVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Filter to avoid translating non-human text (IPs, URLs, raw telemetry numbers, G-Code)
  const shouldTranslate = (s: string): boolean => {
    if (!s || typeof s !== 'string') return false;
    if (currentLanguage === 'en') return false;
    const trimmed = s.trim();
    if (trimmed.length <= 1) return false;
    // Skip IP addresses
    if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(trimmed)) return false;
    // Skip URLs
    if (/^https?:\/\//i.test(trimmed)) return false;
    // Skip pure numbers, times, percentages, and telemetry values (e.g. "239° / 240°", "100%", "50.0%", "1500")
    if (/^[\d\s\/:%°\.\-+—–]+$/.test(trimmed)) return false;
    // Skip pure units (e.g. "KB", "MB", "mm", "s", "°C")
    if (/^\d+(\.\d+)?\s*(KB|MB|GB|mm|°C|s|ms)$/i.test(trimmed)) return false;
    // Skip single G-code instructions like "M105", "G28 X Y", "M112"
    if (/^[GM]\d{1,4}(\s+[A-Z]\-?\d+(\.\d+)?)*$/i.test(trimmed)) return false;
    // Must have at least one letter (Latin, Greek, Cyrillic, CJK, etc.)
    if (!/\p{L}/u.test(trimmed)) return false;
    return true;
  };

  const translateString = (s: string): string => {
    if (!shouldTranslate(s)) return s;
    return t(s);
  };

  const translateNode = (node: any): any => {
    if (typeof node === 'string') {
      return translateString(node);
    }
    if (Array.isArray(node)) {
      return node.map((child, idx) => {
        if (typeof child === 'string') {
          return translateString(child);
        }
        return child;
      });
    }
    return node;
  };

  // Read version from context to ensure dependency tracking
  void version;

  const translatedChildren = translateNode(props.children);

  return <RNText {...props}>{translatedChildren}</RNText>;
}

export default AppText;
