import { Platform, Vibration } from 'react-native';

/**
 * Lightweight haptics wrapper. Uses native impact feedback when the
 * 'react-native-haptic-feedback' module is present; otherwise falls
 * back to a short Vibration on Android and a no-op on iOS so the app
 * never throws if the optional dependency is not installed.
 */

type HapticType = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

let hapticModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  hapticModule = require('react-native-haptic-feedback').default;
} catch {
  hapticModule = null;
}

const map: Record<HapticType, string> = {
  selection: 'selection',
  light: 'impactLight',
  medium: 'impactMedium',
  heavy: 'impactHeavy',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
};

export function haptic(type: HapticType = 'selection') {
  if (hapticModule && typeof hapticModule.trigger === 'function') {
    try {
      hapticModule.trigger(map[type], { enableVibrateFallback: true, ignoreAndroidSystemSettings: false });
      return;
    } catch {
      // fall through to vibration fallback
    }
  }

  if (Platform.OS === 'android') {
    const ms = type === 'heavy' ? 18 : type === 'medium' ? 12 : 6;
    Vibration.vibrate(ms);
  }
}

export default haptic;
