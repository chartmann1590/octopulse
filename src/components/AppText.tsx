import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useTranslation } from '../context/TranslationContext';

/**
 * AppText — drop-in replacement for React Native <Text> that auto-translates
 * every string child via FREE on-device Google ML Kit (or JS fallback dictionary).
 *
 * This ensures "translate every single piece of text everywhere" without manually
 * wrapping each literal with t("...") — the component intercepts render and calls
 * t() on any string children at display time. Cache is persisted and populated
 * lazily via native batch translation after the ML Kit model is downloaded.
 *
 * Technical / emoji-only strings are left untouched to avoid corrupting data like
 * "192.168.1.50:5000" or "M105".
 */
export function AppText(props: TextProps) {
  const { t, currentLanguage } = useTranslation();

  // Heuristic to decide if a string should be translated
  const shouldTranslate = (s: string): boolean => {
    if (!s || s.trim().length === 0) return false;
    if (currentLanguage === 'en') return false;
    const trimmed = s.trim();
    // Skip pure emoji / symbols / very short codes
    if (trimmed.length <= 1) return false;
    // Skip strings that look like technical data (IPs, URLs, file paths, codes)
    if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(trimmed)) return false; // IP
    if (/^https?:\/\//.test(trimmed)) return false; // URL start
    if (/^[A-Z0-9_]+\s*\(M\d+\)/.test(trimmed)) return false; // e.g., "M105"
    if (/^\d+(\.\d+)?\s*(KB|MB|°|mm|%|s)$/.test(trimmed)) return false; // units alone
    if (/^[\d\s\/:%°\.]+$/.test(trimmed)) return false; // pure numbers/symbols
    // Must contain at least one letter (including accented) to be human language
    if (!/[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]/.test(trimmed)) return false;
    // Skip G-code snippets that are mostly uppercase codes
    if (/^[GM]\d+(\s+[A-Z]\-?\d+(\.\d+)?)+$/.test(trimmed)) return false;
    return true;
  };

  const translateNode = (node: any): any => {
    if (typeof node === 'string') {
      return shouldTranslate(node) ? t(node) : node;
    }
    if (Array.isArray(node)) {
      return node.map((child, idx) => {
        if (typeof child === 'string') {
          return shouldTranslate(child) ? t(child) : child;
        }
        // React element children (e.g., nested <AppText> or <Text>) will translate themselves
        return child;
      });
    }
    return node;
  };

  const translatedChildren = translateNode(props.children);

  return <RNText {...props}>{translatedChildren}</RNText>;
}

// Also export as default for convenience
export default AppText;
