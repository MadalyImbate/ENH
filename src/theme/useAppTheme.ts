import { useColorScheme } from 'react-native';
import { palette, type ThemeColors } from './tokens';

export type AppTheme = {
  isDark: boolean;
  colors: ThemeColors;
};

/**
 * Theme hook — returns the current iOS-style palette plus the
 * dark-mode flag so screens can branch on a single import.
 */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    colors: isDark ? palette.dark : palette.light,
  };
}
