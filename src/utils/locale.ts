import { NativeModules, Platform } from 'react-native';
import type { AppLanguage } from '../navigation/types';

/**
 * Idioma do dispositivo, sem depender de nenhuma lib nativa extra
 * (SettingsManager/I18nManager já vêm com o React Native core).
 * Só 'en' e 'pt' são suportados — qualquer outro locale cai em 'pt'
 * (mercado principal é Moçambique).
 */
export function getDeviceLanguage(): AppLanguage {
  try {
    const locale: string | undefined =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        : NativeModules.I18nManager?.localeIdentifier;

    if (typeof locale === 'string' && locale.toLowerCase().startsWith('en')) {
      return 'en';
    }
  } catch {
    // Ignora e cai no default.
  }
  return 'pt';
}
