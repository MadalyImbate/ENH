import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppLanguage, MainTabParamList } from '../navigation/types';
import { radii, shadows, spacing, type as typo } from '../theme/tokens';
import { useAppTheme } from '../theme/useAppTheme';
import AnimatedView from '../components/AnimatedView';
import IOSCard from '../components/IOSCard';
import PressableScale from '../components/PressableScale';
import { haptic } from '../utils/haptics';
import { mobileApi, type CustomerDashboard } from '../services/api';

type HomeScreenProps = {
  language: AppLanguage;
};

type TabsNav = BottomTabNavigationProp<MainTabParamList>;

const copy = {
  pt: {
    eyebrow: 'Resumo da conta',
    morning: 'Bom dia',
    afternoon: 'Boa tarde',
    evening: 'Boa noite',
    subtitleLoading: 'A carregar os seus dados…',
    subtitleReady: 'Aqui está o resumo da sua conta ENH-KOGAS.',
    buyGas: 'Comprar recarga',
    buyGasSub: 'Recarregue o seu contador em segundos',
    meters: 'Contadores',
    metersSub: 'na conta',
    tickets: 'Tickets',
    ticketsSub: 'em aberto',
    transactions: 'Recargas',
    transactionsSub: 'no histórico',
    lastRecharge: 'Última recarga',
    lastRechargeEmpty: 'Ainda não fez nenhuma recarga.',
    lastRechargeCta: 'Faça a primeira agora',
    quickActions: 'Ações rápidas',
    myMeters: 'Meus contadores',
    myMetersSub: 'Histórico de compras e detalhes',
    support: 'Suporte',
    supportSub: 'Abrir ticket ou reportar fuga',
    profile: 'Perfil',
    profileSub: 'Dados e definições da conta',
    errorTitle: 'Não foi possível carregar',
  },
  en: {
    eyebrow: 'Account summary',
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    subtitleLoading: 'Loading your data…',
    subtitleReady: "Here's your ENH-KOGAS account summary.",
    buyGas: 'Buy gas',
    buyGasSub: 'Top up your meter in seconds',
    meters: 'Meters',
    metersSub: 'on account',
    tickets: 'Tickets',
    ticketsSub: 'open',
    transactions: 'Recharges',
    transactionsSub: 'in history',
    lastRecharge: 'Last recharge',
    lastRechargeEmpty: "You haven't made a recharge yet.",
    lastRechargeCta: 'Make your first one now',
    quickActions: 'Quick actions',
    myMeters: 'My meters',
    myMetersSub: 'Purchase history and details',
    support: 'Support',
    supportSub: 'Open a ticket or report a leak',
    profile: 'Profile',
    profileSub: 'Account details and settings',
    errorTitle: 'Could not load your data',
  },
};

function greetingFor(t: typeof copy.pt) {
  const hour = new Date().getHours();
  if (hour < 12) return t.morning;
  if (hour < 19) return t.afternoon;
  return t.evening;
}

function formatMoney(value: unknown, locale: string) {
  const num = Number(value ?? 0);
  return `${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
}

function formatDate(value: unknown, locale: string) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function HomeScreen({ language }: HomeScreenProps) {
  const t = copy[language];
  const locale = language === 'pt' ? 'pt-PT' : 'en-US';
  const navigation = useNavigation<TabsNav>();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const topOffset = Platform.OS === 'ios' ? spacing.sm : Math.max(insets.top + spacing.md, 18);

  const [data, setData] = useState<CustomerDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const dashboard = await mobileApi.customerDashboard();
    setData(dashboard);
    setError('');
  }, []);

  useEffect(() => {
    let mounted = true;
    load()
      .catch(loadError => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [load]);

  const onRefresh = () => {
    haptic('selection');
    setRefreshing(true);
    load()
      .catch(refreshError => setError(refreshError instanceof Error ? refreshError.message : String(refreshError)))
      .finally(() => setRefreshing(false));
  };

  const firstName = (data?.cliente?.nome ?? '').split(' ')[0];
  const lastTx = data?.last_transaction as Record<string, unknown> | null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Saudação */}
        <View style={[styles.hero, { marginTop: topOffset }]}>
          <View style={styles.brandRow}>
            <Image
              source={require('../assets/icons/enh-kogas.png')}
              style={styles.brandLogo}
              resizeMode="contain"
              accessibilityLabel="ENH Kogas"
            />
            <Text style={[styles.eyebrow, { color: colors.labelTertiary }]}>{t.eyebrow.toUpperCase()}</Text>
          </View>
          <Text style={[styles.title, { color: colors.label }]} numberOfLines={2}>
            {greetingFor(t)}{firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>
            {loading ? t.subtitleLoading : t.subtitleReady}
          </Text>
        </View>

        {error ? (
          <IOSCard variant="inset" style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {t.errorTitle}: {error}
            </Text>
          </IOSCard>
        ) : null}

        <AnimatedView triggerKey={loading ? 'loading' : 'ready'}>
          {/* Ação principal em destaque */}
          <PressableScale
            onPress={() => {
              haptic('medium');
              navigation.navigate('Recargas', undefined);
            }}
            hapticType="none"
            style={[styles.primaryCta, { backgroundColor: colors.primary }, shadows.cardStrong as object]}
          >
            <View style={styles.primaryCtaIcon}>
              <MaterialCommunityIcons name="lightning-bolt" size={26} color={colors.primary} />
            </View>
            <View style={styles.primaryCtaText}>
              <Text style={[styles.primaryCtaTitle, { color: colors.labelOnPrimary }]}>{t.buyGas}</Text>
              <Text style={[styles.primaryCtaSub, { color: colors.labelOnPrimary }]}>{t.buyGasSub}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={22} color={colors.labelOnPrimary} />
          </PressableScale>

          {/* Indicadores — verde / dourado / grafite (paleta institucional) */}
          <View style={styles.statsGrid}>
            <StatTile tint="brand" icon="gauge" value={String(data?.meters_count ?? 0)} label={t.meters} sub={t.metersSub} />
            <StatTile tint="gold" icon="message-processing-outline" value={String(data?.tickets_open ?? 0)} label={t.tickets} sub={t.ticketsSub} />
            <StatTile tint="graphite" icon="receipt" value={String(data?.transactions_count ?? 0)} label={t.transactions} sub={t.transactionsSub} />
          </View>

          {/* Última recarga */}
          <Text style={[styles.sectionTitle, { color: colors.label }]}>{t.lastRecharge}</Text>
          <IOSCard variant="elevated">
            {lastTx ? (
              <View style={styles.lastRechargeRow}>
                <View style={[styles.lastRechargeIcon, { backgroundColor: colors.primarySoftBg }]}>
                  <MaterialCommunityIcons name="flash-outline" size={22} color={colors.primarySoftFg} />
                </View>
                <View style={styles.lastRechargeText}>
                  <Text style={[styles.lastRechargeAmount, { color: colors.label }]}>
                    {formatMoney(lastTx.valor_pago, locale)}
                  </Text>
                  <Text style={[styles.lastRechargeMeta, { color: colors.labelTertiary }]} numberOfLines={1}>
                    {formatDate(lastTx.data_de_compra, locale)}
                    {lastTx.metroscubicos ? ` · ${Number(lastTx.metroscubicos).toFixed(2)} m³` : ''}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyRecharge}>
                <View style={[styles.emptyRechargeIcon, { backgroundColor: colors.surfaceMuted }]}>
                  <MaterialCommunityIcons name="flash-outline" size={22} color={colors.labelTertiary} />
                </View>
                <View style={styles.lastRechargeText}>
                  <Text style={[styles.emptyRechargeTitle, { color: colors.labelSecondary }]}>{t.lastRechargeEmpty}</Text>
                  <Text style={[styles.emptyRechargeCta, { color: colors.primary }]}>{t.lastRechargeCta}</Text>
                </View>
              </View>
            )}
          </IOSCard>

          {/* Ações rápidas — lista, sem texto cortado */}
          <Text style={[styles.sectionTitle, { color: colors.label }]}>{t.quickActions}</Text>
          <IOSCard variant="elevated" padded={false}>
            <ActionRow
              icon="gauge"
              title={t.myMeters}
              subtitle={t.myMetersSub}
              onPress={() => {
                haptic('selection');
                navigation.navigate('MyMeters');
              }}
            />
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            <ActionRow
              icon="face-agent"
              title={t.support}
              subtitle={t.supportSub}
              onPress={() => {
                haptic('selection');
                navigation.navigate('Suporte');
              }}
            />
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            <ActionRow
              icon="account-outline"
              title={t.profile}
              subtitle={t.profileSub}
              isLast
              onPress={() => {
                haptic('selection');
                navigation.navigate('Perfil');
              }}
            />
          </IOSCard>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

type StatTint = 'brand' | 'gold' | 'graphite';

function StatTile({
  icon,
  value,
  label,
  sub,
  tint = 'brand',
}: {
  icon: string;
  value: string;
  label: string;
  sub: string;
  tint?: StatTint;
}) {
  const { colors } = useAppTheme();
  const palette =
    tint === 'gold'
      ? { bg: colors.warningSoftBg, fg: colors.warning }
      : tint === 'graphite'
      ? { bg: colors.surfaceMuted, fg: colors.labelSecondary }
      : { bg: colors.primarySoftBg, fg: colors.primarySoftFg };

  return (
    <IOSCard variant="elevated" style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: palette.bg }]}>
        <MaterialCommunityIcons name={icon} size={17} color={palette.fg} />
      </View>
      <Text style={[styles.statValue, { color: colors.label }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.label }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statSub, { color: colors.labelTertiary }]} numberOfLines={1}>
        {sub}
      </Text>
    </IOSCard>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  isLast,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <PressableScale onPress={onPress} hapticType="none" scaleTo={0.99}>
      <View style={[styles.actionRow, isLast ? styles.actionRowLast : null]}>
        <View style={[styles.actionIcon, { backgroundColor: colors.primarySoftBg }]}>
          <MaterialCommunityIcons name={icon} size={20} color={colors.primarySoftFg} />
        </View>
        <View style={styles.actionText}>
          <Text style={[styles.actionTitle, { color: colors.label }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.actionSub, { color: colors.labelTertiary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.labelTertiary} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },

  hero: { paddingHorizontal: spacing.xs },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  brandLogo: {
    // O PNG é 2100x1500 (rácio 1.4); a caixa usa esse rácio em pixels fixos
    // para o logo encostar à esquerda em vez de flutuar ao centro.
    width: 62,
    height: 44,
  },
  eyebrow: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: typo.largeTitle.fontSize,
    lineHeight: typo.largeTitle.lineHeight,
    fontFamily: typo.largeTitle.fontFamily,
    letterSpacing: typo.largeTitle.letterSpacing,
  },
  subtitle: {
    marginTop: 6,
    fontSize: typo.subheadline.fontSize,
    lineHeight: typo.subheadline.lineHeight,
    fontFamily: typo.subheadline.fontFamily,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: { flex: 1, fontSize: typo.footnote.fontSize, fontFamily: 'Manrope_600SemiBold' },

  /* CTA principal */
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  primaryCtaIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: { flex: 1 },
  primaryCtaTitle: {
    fontSize: typo.title3.fontSize,
    lineHeight: typo.title3.lineHeight,
    fontFamily: 'Manrope_800ExtraBold',
  },
  primaryCtaSub: {
    marginTop: 2,
    fontSize: typo.footnote.fontSize,
    lineHeight: typo.footnote.lineHeight,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.9,
  },

  /* Indicadores */
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statTile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    marginTop: spacing.sm,
    fontSize: typo.title2.fontSize,
    lineHeight: typo.title2.lineHeight,
    fontFamily: typo.title2.fontFamily,
  },
  statLabel: {
    marginTop: 2,
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
  },
  statSub: {
    marginTop: 1,
    fontSize: 10,
    fontFamily: typo.caption2.fontFamily,
  },

  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: typo.title3.fontSize,
    lineHeight: typo.title3.lineHeight,
    fontFamily: typo.title3.fontFamily,
  },

  /* Última recarga */
  lastRechargeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lastRechargeIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastRechargeText: { flex: 1 },
  lastRechargeAmount: {
    fontSize: typo.title3.fontSize,
    lineHeight: typo.title3.lineHeight,
    fontFamily: typo.title3.fontFamily,
  },
  lastRechargeMeta: {
    marginTop: 2,
    fontSize: typo.footnote.fontSize,
    fontFamily: typo.footnote.fontFamily,
  },
  emptyRecharge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyRechargeIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRechargeTitle: {
    fontSize: typo.callout.fontSize,
    lineHeight: typo.callout.lineHeight,
    fontFamily: 'Manrope_600SemiBold',
  },
  emptyRechargeCta: {
    marginTop: 2,
    fontSize: typo.footnote.fontSize,
    fontFamily: 'Manrope_700Bold',
  },

  /* Ações rápidas */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionRowLast: {},
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionTitle: {
    fontSize: typo.callout.fontSize,
    lineHeight: typo.callout.lineHeight,
    fontFamily: 'Manrope_700Bold',
  },
  actionSub: {
    marginTop: 2,
    fontSize: typo.footnote.fontSize,
    fontFamily: typo.footnote.fontFamily,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 40 + spacing.md,
  },
});

export default HomeScreen;
