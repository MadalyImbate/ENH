import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedView from '../components/AnimatedView';
import IOSCard from '../components/IOSCard';
import IOSButton from '../components/IOSButton';
import Field from '../components/Field';
import SectionHeader from '../components/SectionHeader';
import PressableScale from '../components/PressableScale';
import type { AppLanguage, MainTabParamList } from '../navigation/types';
import { radii, spacing, type as typo } from '../theme/tokens';
import { useAppTheme } from '../theme/useAppTheme';
import { haptic } from '../utils/haptics';
import { mobileApi } from '../services/api';

type MyMetersScreenProps = {
  language: AppLanguage;
};

type PurchaseHistoryItem = {
  id: string;
  date: string;
  amount: number;
  token: string;
  m3: number;
  /** Rótulo do gateway tal como devolvido pelo backend (ex.: 'Mpesa', 'emola', 'RecargaAKI'). */
  method: string;
};

type MeterItem = {
  meterNumber: string;
  estado: string;
  history: PurchaseHistoryItem[];
};

type ViewMode = 'list' | 'details' | 'report';

type TabsNav = BottomTabNavigationProp<MainTabParamList>;

const copy = {
  pt: {
    eyebrow: 'Carteira de gás',
    title: 'Meus Contadores',
    subtitle: 'Selecione um contador para ver o histórico de compras.',
    metersSection: 'Contadores',
    metersSectionSub: 'Toque para abrir',
    meter: 'Contador',
    status: 'Estado',
    viewHistory: 'Ver histórico',
    buyGas: 'Comprar gás',
    purchasesTitle: 'Histórico de compras',
    purchasesSub: 'Mais recentes primeiro',
    detailsSection: 'Informações do contador',
    date: 'Data',
    amount: 'Valor pago',
    method: 'Método',
    token: 'Token',
    m3: 'm³',
    back: 'Voltar',
    reportIssue: 'Reportar problema',
    issueTitle: 'Reportar problema do contador',
    issueSub: 'A nossa equipa responde em até 24h.',
    issueType: 'Tipo de problema',
    issuePlaceholder: 'Ex: contador não liga, erro no display…',
    issueDetails: 'Detalhes',
    issueDetailsPlaceholder: 'Descreva o problema observado',
    submitIssue: 'Enviar relatório',
    issueSent: 'Relatório enviado com sucesso.',
    noHistory: 'Sem compras registadas para este contador.',
    purchases: 'compras',
    totalSpent: 'Total gasto',
    loadingMeters: 'A carregar contadores…',
    noMeters: 'Ainda não tem contadores associados a esta conta.',
  },
  en: {
    eyebrow: 'Gas wallet',
    title: 'My Meters',
    subtitle: 'Select a meter to see purchase history.',
    metersSection: 'Meters',
    metersSectionSub: 'Tap to open',
    meter: 'Meter',
    status: 'Status',
    viewHistory: 'View history',
    buyGas: 'Buy gas',
    purchasesTitle: 'Purchase history',
    purchasesSub: 'Most recent first',
    detailsSection: 'Meter details',
    date: 'Date',
    amount: 'Paid value',
    method: 'Method',
    token: 'Token',
    m3: 'm³',
    back: 'Back',
    reportIssue: 'Report issue',
    issueTitle: 'Report meter issue',
    issueSub: 'Our team replies within 24h.',
    issueType: 'Issue type',
    issuePlaceholder: 'Ex: meter is off, display error…',
    issueDetails: 'Details',
    issueDetailsPlaceholder: 'Describe the observed issue',
    submitIssue: 'Submit report',
    issueSent: 'Issue submitted successfully.',
    noHistory: 'No purchases for this meter yet.',
    purchases: 'purchases',
    totalSpent: 'Total spent',
    loadingMeters: 'Loading meters…',
    noMeters: 'You have no meters linked to this account yet.',
  },
};

type Copy = typeof copy.pt;

/** Ícone/rótulo pelo código do gateway devolvido pelo backend; genérico para o resto. */
function methodMeta(method: string): { icon: string; label: string } {
  const upper = method.toUpperCase();
  if (upper.includes('MPESA')) return { icon: 'cellphone-wireless', label: 'M-Pesa' };
  if (upper.includes('EMOLA')) return { icon: 'cellphone', label: 'e-Mola' };
  if (upper.includes('AKI')) return { icon: 'storefront-outline', label: 'Recarga Aki' };
  return { icon: 'wallet-outline', label: method || '—' };
}

export function MyMetersScreen({ language }: MyMetersScreenProps) {
  const t = copy[language];
  const navigation = useNavigation<TabsNav>();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const topOffset = Platform.OS === 'ios' ? spacing.sm : Math.max(insets.top + spacing.md, 18);

  const [mode, setMode] = useState<ViewMode>('list');
  const [meters, setMeters] = useState<MeterItem[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<MeterItem | null>(null);
  const [issueType, setIssueType] = useState('');
  const [issueDetails, setIssueDetails] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    mobileApi.customerMeters()
      .then(async apiMeters => {
        const nextMeters = await Promise.all(apiMeters.map(async meter => {
          const history = await mobileApi.meterHistory(meter.numero_do_contador).catch(() => []);
          return {
            meterNumber: meter.numero_do_contador,
            estado: meter.estado,
            history: history.map((item, index) => ({
              id: String(item.id ?? index),
              date: String(item.data_de_compra ?? ''),
              amount: Number(item.valor_pago ?? 0),
              token: String(item.token ?? ''),
              m3: Number(item.metroscubicos ?? 0),
              method: String(item.metodo ?? ''),
            })) as PurchaseHistoryItem[],
          } satisfies MeterItem;
        }));
        // Confia sempre no resultado real da API — mesmo quando é uma lista
        // vazia (cliente sem contadores associados ainda).
        if (mounted) setMeters(nextMeters);
      })
      .catch(loadError => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sortedHistory = useMemo(
    () => [...(selectedMeter?.history ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [selectedMeter],
  );

  const totalSpent = useMemo(
    () => sortedHistory.reduce((sum, item) => sum + item.amount, 0),
    [sortedHistory],
  );

  const openDetails = (meter: MeterItem) => {
    haptic('light');
    setSelectedMeter(meter);
    setFeedback('');
    setMode('details');
  };

  const openReport = () => {
    haptic('selection');
    setMode('report');
    setFeedback('');
  };

  const goBackToList = () => {
    haptic('selection');
    setMode('list');
  };

  const goBackToDetails = () => {
    haptic('selection');
    setMode('details');
  };

  const submitIssue = async () => {
    if (!issueType.trim() || !issueDetails.trim()) {
      haptic('warning');
      return;
    }
    try {
      setLoading(true);
      await mobileApi.createTicket({
        category: 'meter_error',
        priority: 'normal',
        title: issueType.trim(),
        message: issueDetails.trim(),
        meter_number: selectedMeter?.meterNumber,
        metadata: { source: 'ENH-KOGAS-APP-MOBILE' },
      });
      haptic('success');
      setFeedback(t.issueSent);
      setIssueType('');
      setIssueDetails('');
    } catch (issueError) {
      haptic('error');
      setFeedback(issueError instanceof Error ? issueError.message : String(issueError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
      >
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
          <Text style={[styles.title, { color: colors.label }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>{t.subtitle}</Text>
        </View>

        {mode === 'list' && (
          <AnimatedView triggerKey="list">
            <SectionHeader title={t.metersSection} subtitle={t.metersSectionSub} />
            {error ? <Text style={[styles.subtitle, { color: colors.error }]}>{error}</Text> : null}
            {isLoading ? (
              <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>{t.loadingMeters}</Text>
            ) : meters.length === 0 ? (
              <IOSCard variant="inset" style={styles.cardSpacing}>
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="counter" size={28} color={colors.labelTertiary} />
                  <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>{t.noMeters}</Text>
                </View>
              </IOSCard>
            ) : (
              <View style={styles.listGroup}>
                {meters.map(meter => (
                  <MeterCard
                    key={meter.meterNumber}
                    meter={meter}
                    onOpen={() => openDetails(meter)}
                    onBuy={() => {
                      haptic('medium');
                      navigation.navigate('Recargas', { meterNumber: meter.meterNumber });
                    }}
                    language={language}
                    t={t}
                  />
                ))}
              </View>
            )}
          </AnimatedView>
        )}

        {mode === 'details' && selectedMeter && (
          <AnimatedView triggerKey={`details-${selectedMeter.meterNumber}`}>
            <SectionHeader title={t.detailsSection} />
            <IOSCard variant="elevated" style={styles.cardSpacing}>
              <View style={styles.detailHeader}>
                <View style={[styles.meterIconCircle, { backgroundColor: colors.primarySoftBg }]}>
                  <MaterialCommunityIcons name="counter" size={22} color={colors.primarySoftFg} />
                </View>
                <View style={styles.detailHeaderText}>
                  <Text style={[styles.detailMeterNum, { color: colors.label }]}>
                    {selectedMeter.meterNumber}
                  </Text>
                </View>
              </View>

              <View style={[styles.detailDivider, { backgroundColor: colors.separator }]} />
              <DetailRow icon="information-outline" label={t.status} value={selectedMeter.estado} />
              <View style={[styles.detailDivider, { backgroundColor: colors.separator }]} />

              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: colors.label }]}>{sortedHistory.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.labelTertiary }]}>{t.purchases}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.separator }]} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: colors.label }]}>
                    {totalSpent.toLocaleString(language === 'pt' ? 'pt-PT' : 'en-US')}{' '}
                    <Text style={styles.statUnit}>MZN</Text>
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.labelTertiary }]}>{t.totalSpent}</Text>
                </View>
              </View>
            </IOSCard>

            <SectionHeader title={t.purchasesTitle} subtitle={t.purchasesSub} />
            {sortedHistory.length === 0 ? (
              <IOSCard variant="inset" style={styles.cardSpacing}>
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="package-variant" size={28} color={colors.labelTertiary} />
                  <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>{t.noHistory}</Text>
                </View>
              </IOSCard>
            ) : (
              <View style={styles.historyGroup}>
                {sortedHistory.map((item, idx) => (
                  <HistoryCard key={item.id} item={item} isFirst={idx === 0} language={language} t={t} />
                ))}
              </View>
            )}

            <View style={styles.actionRow}>
              <View style={styles.actionFlex}>
                <IOSButton
                  title={t.back}
                  variant="tinted"
                  onPress={goBackToList}
                  iconLeft="arrow-left"
                  fullWidth
                  hapticType="selection"
                />
              </View>
              <View style={styles.actionGap} />
              <View style={styles.actionFlex}>
                <IOSButton
                  title={t.reportIssue}
                  variant="filled"
                  onPress={openReport}
                  iconLeft="alert-octagon-outline"
                  fullWidth
                />
              </View>
            </View>
          </AnimatedView>
        )}

        {mode === 'report' && selectedMeter && (
          <AnimatedView triggerKey={`report-${selectedMeter.meterNumber}`}>
            <SectionHeader title={t.issueTitle} subtitle={t.issueSub} />
            <IOSCard variant="elevated" style={styles.cardSpacing}>
              <View style={[styles.reportPill, { backgroundColor: colors.primarySoftBg }]}>
                <MaterialCommunityIcons name="counter" size={16} color={colors.primarySoftFg} />
                <Text style={[styles.reportPillText, { color: colors.primarySoftFg }]}>
                  {`${t.meter} · ${selectedMeter.meterNumber}`}
                </Text>
              </View>

              <View style={styles.fieldStack}>
                <Field
                  label={t.issueType}
                  value={issueType}
                  onChangeText={setIssueType}
                  iconLeft="format-list-bulleted-type"
                />
                <Field
                  label={t.issueDetails}
                  value={issueDetails}
                  onChangeText={setIssueDetails}
                  multiline
                  numberOfLines={4}
                  inputStyle={styles.multilineInput}
                  containerStyle={styles.fieldGap}
                />
              </View>

              {!!feedback && (
                <View style={[styles.feedbackPill, { backgroundColor: colors.successSoftBg }]}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                  <Text style={[styles.feedbackText, { color: colors.success }]}>{feedback}</Text>
                </View>
              )}
            </IOSCard>

            <View style={styles.actionRow}>
              <View style={styles.actionFlex}>
                <IOSButton
                  title={t.back}
                  variant="tinted"
                  onPress={goBackToDetails}
                  iconLeft="arrow-left"
                  fullWidth
                  hapticType="selection"
                />
              </View>
              <View style={styles.actionGap} />
              <View style={styles.actionFlex}>
                <IOSButton
                  title={t.submitIssue}
                  variant="filled"
                  onPress={submitIssue}
                  loading={isLoading}
                  iconLeft="send"
                  fullWidth
                />
              </View>
            </View>
          </AnimatedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- Sub-components ---------------------------- */

type MeterCardProps = {
  meter: MeterItem;
  onOpen: () => void;
  onBuy: () => void;
  language: AppLanguage;
  t: Copy;
};

function MeterCard({ meter, onOpen, onBuy, language, t }: MeterCardProps) {
  const { colors } = useAppTheme();
  const lastPurchase = useMemo(
    () => [...meter.history].sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    [meter.history],
  );

  return (
    <PressableScale onPress={onOpen} hapticType="selection" style={styles.meterCardWrap}>
      <IOSCard variant="elevated" style={styles.meterCard}>
        <View style={styles.meterTopRow}>
          <View style={styles.meterTopLeft}>
            <View style={[styles.meterIconCircle, { backgroundColor: colors.primarySoftBg }]}>
              <MaterialCommunityIcons name="counter" size={20} color={colors.primarySoftFg} />
            </View>
            <View style={styles.meterTitles}>
              <Text style={[styles.meterAlias, { color: colors.label }]} numberOfLines={1}>
                {meter.meterNumber}
              </Text>
              <Text style={[styles.meterNumber, { color: colors.labelSecondary }]} numberOfLines={1}>
                {meter.estado}
              </Text>
            </View>
          </View>
          <View style={styles.chevronWrap}>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.labelTertiary} />
          </View>
        </View>

        <View style={[styles.meterDivider, { backgroundColor: colors.separator }]} />

        {lastPurchase ? (
          <View style={[styles.lastPurchase, { backgroundColor: colors.surfaceMuted }]}>
            <View style={styles.lastPurchaseLeft}>
              <Text style={[styles.lastPurchaseLabel, { color: colors.labelTertiary }]}>
                {`${t.amount}`.toUpperCase()}
              </Text>
              <Text style={[styles.lastPurchaseValue, { color: colors.label }]}>
                {`${lastPurchase.amount.toLocaleString(language === 'pt' ? 'pt-PT' : 'en-US')} `}
                <Text style={styles.lastPurchaseUnit}>MZN</Text>
              </Text>
              <Text style={[styles.lastPurchaseDate, { color: colors.labelTertiary }]} numberOfLines={1}>
                {lastPurchase.date}
              </Text>
            </View>
            <MethodChip method={lastPurchase.method} />
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <View style={styles.actionFlex}>
            <IOSButton
              title={t.viewHistory}
              variant="tinted"
              onPress={onOpen}
              iconLeft="history"
              fullWidth
              size="sm"
              hapticType="selection"
            />
          </View>
          <View style={styles.actionGap} />
          <View style={styles.actionFlex}>
            <IOSButton
              title={t.buyGas}
              variant="filled"
              onPress={onBuy}
              iconLeft="lightning-bolt"
              fullWidth
              size="sm"
            />
          </View>
        </View>
      </IOSCard>
    </PressableScale>
  );
}

type DetailRowProps = {
  icon: string;
  label: string;
  value: string;
};

function DetailRow({ icon, label, value }: DetailRowProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: colors.surfaceMuted }]}>
        <MaterialCommunityIcons name={icon} size={16} color={colors.labelSecondary} />
      </View>
      <View style={styles.detailRowText}>
        <Text style={[styles.detailRowLabel, { color: colors.labelTertiary }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.detailRowValue, { color: colors.label }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

type HistoryCardProps = {
  item: PurchaseHistoryItem;
  isFirst: boolean;
  language: AppLanguage;
  t: Copy;
};

function HistoryCard({ item, isFirst, language, t }: HistoryCardProps) {
  const { colors } = useAppTheme();
  return (
    <IOSCard variant={isFirst ? 'elevated' : 'plain'} style={styles.historyCard}>
      <View style={styles.historyTopRow}>
        <View style={styles.historyAmountWrap}>
          <Text style={[styles.historyAmount, { color: colors.label }]}>
            {item.amount.toLocaleString(language === 'pt' ? 'pt-PT' : 'en-US')}
            <Text style={styles.historyAmountUnit}> MZN</Text>
          </Text>
          <Text style={[styles.historyDate, { color: colors.labelTertiary }]}>{item.date}</Text>
        </View>
        <MethodChip method={item.method} />
      </View>

      <View style={[styles.historyDivider, { backgroundColor: colors.separator }]} />

      <View style={styles.historyMetaRow}>
        <View style={styles.historyMetaCol}>
          <Text style={[styles.historyMetaLabel, { color: colors.labelTertiary }]}>{t.m3.toUpperCase()}</Text>
          <Text style={[styles.historyMetaValue, { color: colors.label }]}>{item.m3.toFixed(2)}</Text>
        </View>
        <View style={styles.historyMetaColRight}>
          <Text style={[styles.historyMetaLabel, { color: colors.labelTertiary }]}>{t.token.toUpperCase()}</Text>
          <Text style={[styles.historyToken, { color: colors.label }]} numberOfLines={1}>
            {item.token}
          </Text>
        </View>
      </View>
    </IOSCard>
  );
}

function MethodChip({ method }: { method: string }) {
  const { colors } = useAppTheme();
  const meta = methodMeta(method);
  return (
    <View style={[styles.methodChip, { backgroundColor: colors.surfaceTinted, borderColor: colors.separator }]}>
      <MaterialCommunityIcons name={meta.icon} size={13} color={colors.primarySoftFg} />
      <Text style={[styles.methodChipText, { color: colors.primarySoftFg }]}>{meta.label}</Text>
    </View>
  );
}

/* --------------------------------- Styles -------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  brandLogo: {
    // PNG 2100x1500 (rácio 1.4) em medidas fixas para encostar à esquerda.
    width: 62,
    height: 44,
  },
  hero: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  eyebrow: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 6,
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

  /* List */
  listGroup: {
    gap: spacing.md,
  },
  meterCardWrap: {
    // PressableScale renders an Animated.View; spacing is via gap on parent.
  },
  meterCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  meterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meterTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  meterIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterTitles: { flex: 1 },
  meterAlias: {
    fontSize: typo.headline.fontSize,
    lineHeight: typo.headline.lineHeight,
    fontFamily: typo.headline.fontFamily,
  },
  meterNumber: {
    marginTop: 2,
    fontSize: typo.footnote.fontSize,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 0.5,
  },
  chevronWrap: {
    // Só a seta: alvo de toque circular de 44pt, o mínimo recomendado no iOS.
    paddingLeft: spacing.sm,
  },
  meterDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xxs,
  },
  lastPurchase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lastPurchaseLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  lastPurchaseLabel: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 0.8,
  },
  lastPurchaseValue: {
    marginTop: 2,
    fontSize: typo.title3.fontSize,
    lineHeight: typo.title3.lineHeight,
    fontFamily: typo.title3.fontFamily,
  },
  lastPurchaseUnit: {
    fontSize: typo.footnote.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  lastPurchaseDate: {
    marginTop: 2,
    fontSize: typo.caption1.fontSize,
    fontFamily: typo.caption1.fontFamily,
  },

  /* Method chip */
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  methodChipText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },

  /* Action rows */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
  },
  actionFlex: { flex: 1 },
  actionGap: { width: spacing.sm },

  /* Details */
  cardSpacing: {
    marginBottom: spacing.xs,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailHeaderText: { flex: 1 },
  detailMeterNum: {
    fontSize: typo.title2.fontSize,
    lineHeight: typo.title2.lineHeight,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 1,
  },
  detailAlias: {
    marginTop: 2,
    fontSize: typo.callout.fontSize,
    fontFamily: typo.callout.fontFamily,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.md,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRowText: { flex: 1 },
  detailRowLabel: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 0.8,
  },
  detailRowValue: {
    marginTop: 2,
    fontSize: typo.body.fontSize,
    fontFamily: 'Manrope_700Bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: typo.title2.fontSize,
    lineHeight: typo.title2.lineHeight,
    fontFamily: typo.title2.fontFamily,
  },
  statUnit: {
    fontSize: typo.footnote.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  statLabel: {
    marginTop: 2,
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 0.8,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    marginHorizontal: spacing.md,
  },

  /* History */
  historyGroup: {
    gap: spacing.sm,
  },
  historyCard: {
    padding: spacing.md,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyAmountWrap: { flex: 1 },
  historyAmount: {
    fontSize: typo.title3.fontSize,
    lineHeight: typo.title3.lineHeight,
    fontFamily: typo.title3.fontFamily,
  },
  historyAmountUnit: {
    fontSize: typo.footnote.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  historyDate: {
    marginTop: 2,
    fontSize: typo.caption1.fontSize,
    fontFamily: typo.caption1.fontFamily,
  },
  historyDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyMetaCol: { width: 80 },
  historyMetaColRight: { flex: 1 },
  historyMetaLabel: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 0.8,
  },
  historyMetaValue: {
    marginTop: 2,
    fontSize: typo.callout.fontSize,
    fontFamily: 'Manrope_700Bold',
  },
  historyToken: {
    marginTop: 2,
    fontSize: typo.subheadline.fontSize,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 1,
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typo.callout.fontSize,
    fontFamily: typo.callout.fontFamily,
    textAlign: 'center',
  },

  /* Report */
  reportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  reportPillText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  fieldStack: {
    gap: spacing.md,
  },
  fieldGap: {
    marginTop: spacing.md,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  feedbackText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
});

export default MyMetersScreen;
