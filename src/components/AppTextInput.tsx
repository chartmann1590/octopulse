import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { useTranslation } from '../context/TranslationContext';

/**
 * AppTextInput — wraps RN TextInput to auto-translate placeholder text
 * via FREE on-device ML Kit. Value/typed text is NOT translated, only placeholder hints.
 */
export function AppTextInput(props: TextInputProps) {
  const { t, currentLanguage } = useTranslation();
  const placeholder = props.placeholder;
  const translatedPlaceholder =
    placeholder && typeof placeholder === 'string' && currentLanguage !== 'en' && /[A-Za-z]/.test(placeholder)
      ? t(placeholder)
      : placeholder;
  return <RNTextInput {...props} placeholder={translatedPlaceholder} />;
}

export default AppTextInput;
