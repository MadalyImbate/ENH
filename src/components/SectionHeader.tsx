import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';
import { spacing, type as typo } from '../theme/tokens';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
};

/**
 * iOS-grouped style section header. Small uppercase label sits
 * above the card group it labels.
 */
export function SectionHeader({ title, subtitle, trailing }: SectionHeaderProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.primary }]}>{title.toUpperCase()}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.8,
  },
  subtitle: {
    marginTop: 2,
    fontSize: typo.footnote.fontSize,
    fontFamily: 'Manrope_500Medium',
  },
});

export default SectionHeader;
