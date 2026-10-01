import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiToken } from './api';

const SESSION_STORAGE_KEY = 'enh-kogas-customer-session';

export type MobileSession = {
  token: string;
  savedAt: string;
};

/**
 * Espelho em memória da sessão. O armazenamento persistente é best-effort:
 * se o módulo nativo do AsyncStorage não estiver disponível no binário
 * (ex.: falta `pod install`), o login continua a funcionar — apenas não
 * sobrevive ao fecho da app. A autenticação nunca pode falhar por causa
 * da persistência.
 */
let memorySession: MobileSession | null = null;

export async function saveMobileSession(token: string) {
  const session: MobileSession = { token, savedAt: new Date().toISOString() };
  memorySession = session;
  setApiToken(token);
  try {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sem armazenamento nativo: mantém-se apenas em memória.
  }
  return session;
}

export async function restoreMobileSession(): Promise<MobileSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw) as MobileSession;
      if (session?.token) {
        memorySession = session;
        setApiToken(session.token);
        return session;
      }
    }
  } catch {
    // Ignora e recorre ao espelho em memória.
  }

  if (memorySession?.token) {
    setApiToken(memorySession.token);
    return memorySession;
  }
  return null;
}

export async function clearMobileSession() {
  memorySession = null;
  setApiToken(null);
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nada a limpar se não houver armazenamento nativo.
  }
}
