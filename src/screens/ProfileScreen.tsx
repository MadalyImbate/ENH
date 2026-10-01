import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IOSCard from '../components/IOSCard';
import IOSButton from '../components/IOSButton';
import Field from '../components/Field';
import SectionHeader from '../components/SectionHeader';
import PressableScale from '../components/PressableScale';
import AnimatedView from '../components/AnimatedView';
import type { AppLanguage } from '../navigation/types';
import { motion, radii, spacing, type as typo } from '../theme/tokens';
import { useAppTheme } from '../theme/useAppTheme';
import { haptic } from '../utils/haptics';
import {
  mobileApi,
  type CustomerProfile,
  type MeterDetail,
  type TransactionEntry,
} from '../services/api';

type ProfileScreenProps = {
  language: AppLanguage;
  onSignOut?: () => void;
};

type ProfileForm = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  nuit: string;
  bi: string;
};

type MonthlyPurchase = { month: string; value: number };

const emptyForm: ProfileForm = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  nuit: '',
  bi: '',
};

const copy = {
  pt: {
    eyebrow: 'A minha conta',
    title: 'Perfil',
    subtitle: 'Resumo do cliente, dados cadastrais e definições da conta.',
    editProfile: 'Editar perfil',
    saveChanges: 'Guardar',
    cancel: 'Cancelar',
    profileSaved: 'Pedido enviado. As alterações seguem para aprovação do backoffice.',
    profileSaveError: 'Não foi possível enviar o pedido de alteração.',
    nameLabel: 'Nome',
    phoneLabel: 'Número de telefone',
    emailLabel: 'Email',
    addressLabel: 'Endereço',
    nuitLabel: 'NUIT',
    biLabel: 'BI',
    personalSection: 'Dados cadastrais',
    securitySection: 'Segurança da conta',
    preferencesSection: 'Preferências',
    metersSection: 'Contadores associados',
    supportSection: 'Suporte da conta',
    purchasesChart: 'Compras mensais',
    purchasesChartSub: 'Últimos 6 meses (MZN)',
    taxesChart: 'Distribuição de taxas',
    taxesChartSub: 'IVA, TSC e taxa fixa',
    totalBought: 'Total comprado',
    fixedFee: 'Taxa fixa paga',
    vat: 'IVA pago',
    tsc: 'TSC pago',
    m3: 'm³ comprados',
    totalsCarousel: 'Totais',
    totalsCarouselSub: 'Deslize para ver mais',
    ivaLegend: 'IVA',
    tscLegend: 'TSC',
    fixedLegend: 'Taxa fixa',
    verificationStatus: 'Telefone verificado',
    securityHint: 'Ative OTP para reforçar a segurança do login.',
    otpLabel: 'OTP ativo',
    otpDescription: 'Receber código OTP em cada login.',
    notifications: 'Notificações por SMS',
    notificationsDesc: 'Receber confirmações e alertas via SMS.',
    active: 'Ativo',
    inactive: 'Inativo',
    signOut: 'Terminar sessão',
    noMeters: 'Sem contadores associados a esta conta.',
    noPurchases: 'Ainda não há recargas registadas.',
    loading: 'A carregar perfil…',
    error: 'Não foi possível carregar o perfil.',
    websiteLabel: 'https://enhkogas.co.mz/',
    copyright: 'Copyright ENH-KOGAS',
    developedBy: 'Developed by MAPI INVESTIMENTOS 2026',
    forClient: 'For ENH-KOGAS',
    months: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  },
  en: {
    eyebrow: 'My account',
    title: 'Profile',
    subtitle: 'Customer summary, account details and account settings.',
    editProfile: 'Edit profile',
    saveChanges: 'Save',
    cancel: 'Cancel',
    profileSaved: 'Request sent. Changes are pending backoffice approval.',
    profileSaveError: 'Could not submit the change request.',
    nameLabel: 'Name',
    phoneLabel: 'Phone number',
    emailLabel: 'Email',
    addressLabel: 'Address',
    nuitLabel: 'NUIT',
    biLabel: 'ID number',
    personalSection: 'Account details',
    securitySection: 'Account security',
    preferencesSection: 'Preferences',
    metersSection: 'Linked meters',
    supportSection: 'Account support',
    purchasesChart: 'Monthly purchases',
    purchasesChartSub: 'Last 6 months (MZN)',
    taxesChart: 'Taxes breakdown',
    taxesChartSub: 'VAT, TSC and fixed fee',
    totalBought: 'Total purchased',
    fixedFee: 'Fixed fee paid',
    vat: 'VAT paid',
    tsc: 'TSC paid',
    m3: 'm³ purchased',
    totalsCarousel: 'Totals',
    totalsCarouselSub: 'Swipe for more',
    ivaLegend: 'VAT',
    tscLegend: 'TSC',
    fixedLegend: 'Fixed fee',
    verificationStatus: 'Phone verified',
    securityHint: 'Enable OTP to strengthen login security.',
    otpLabel: 'OTP enabled',
    otpDescription: 'Receive an OTP code on every login.',
    notifications: 'SMS notifications',
    notificationsDesc: 'Receive confirmations and alerts via SMS.',
    active: 'Active',
    inactive: 'Inactive',
    signOut: 'Sign out',
    noMeters: 'No meters linked to this account.',
    noPurchases: 'No recharges recorded yet.',
    loading: 'Loading profile…',
    error: 'Could not load your profile.',
    websiteLabel: 'https://enhkogas.co.mz/',
    copyright: 'Copyright ENH-KOGAS',
    developedBy: 'Developed by MAPI INVESTIMENTOS 2026',
    forClient: 'For ENH-KOGAS',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

function currency(v: number, locale: string) {
  return `${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
}

/** Evita "Nome Apelido Nome Apelido" quando os dois campos se repetem. */
function joinName(nome?: string, apelido?: string) {
  const first = (nome ?? '').trim();
  const last = (apelido ?? '').trim();
  if (!last || first.toLowerCase().includes(last.toLowerCase())) return first || last;
  return `${first} ${last}`.trim();
}

function profileToForm(profile: CustomerProfile | null): ProfileForm {
  if (!profile) return emptyForm;
  return {
    fullName: joinName(profile.nome, profile.Apelido) || profile.full_name || '',
    phone: profile.telemovel || profile.contato || '',
    email: profile.email || '',
    address: profile.morada || '',
    nuit: profile.nuit || '',
    bi: profile.bi || '',
  };
}

/** Últimos 6 meses (mais antigo primeiro), somando valor_pago por mês a partir das transações reais. */
function buildMonthlyPurchases(transactions: TransactionEntry[], monthLabels: string[]): MonthlyPurchase[] {
  const now = new Date();
  const buckets: MonthlyPurchase[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: monthLabels[d.getMonth()], value: 0 });
  }
  transactions.forEach(tx => {
    const date = new Date(tx.data_de_compra);
    if (Number.isNaN(date.getTime())) return;
    const monthsAgo = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (monthsAgo < 0 || monthsAgo > 5) return;
    const bucketIndex = 5 - monthsAgo;
    buckets[bucketIndex].value += Number(tx.valor_pago) || 0;
  });
  return buckets;
}

export function ProfileScreen({ language, onSignOut }: ProfileScreenProps) {
  const t = copy[language];
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const topOffset = Platform.OS === 'ios' ? spacing.sm : Math.max(insets.top + spacing.md, 18);
  const locale = language === 'pt' ? 'pt-PT' : 'en-US';

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [meters, setMeters] = useState<MeterDetail[]>([]);
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      mobileApi.customerProfile(),
      mobileApi.customerMeters().catch(() => []),
      mobileApi.customerTransactions({ pageSize: 500 }).catch(() => []),
    ])
      .then(([profileData, meterRows, txRows]) => {
        if (!mounted) return;
        setProfile(profileData);
        setForm(profileToForm(profileData));
        setMeters(meterRows);
        setTransactions(txRows);
        setLoadError('');
      })
      .catch(error => {
        if (mounted) setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const monthlyData = useMemo(() => buildMonthlyPurchases(transactions, t.months), [transactions, t.months]);
  const maxMonthly = useMemo(() => Math.max(...monthlyData.map(item => item.value), 1), [monthlyData]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        acc.totalComprado += Number(tx.valor_pago) || 0;
        acc.taxaFixa += Number(tx.taxa_fixa) || 0;
        acc.iva += Number(tx.iva) || 0;
        acc.tsc += Number(tx.tsc) || 0;
        acc.m3 += Number(tx.metroscubicos) || 0;
        return acc;
      },
      { totalComprado: 0, taxaFixa: 0, iva: 0, tsc: 0, m3: 0 },
    );
  }, [transactions]);

  const totalCharges = totals.iva + totals.tsc + totals.taxaFixa || 1;

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submitChanges = async () => {
    const baseline = profileToForm(profile);
    const changes: Record<string, string> = {};
    if (form.fullName.trim() !== baseline.fullName) {
      const [nome, ...rest] = form.fullName.trim().split(/\s+/);
      changes.nome = nome || '';
      changes.Apelido = rest.join(' ');
    }
    if (form.phone.trim() !== baseline.phone) changes.telemovel = form.phone.trim();
    if (form.email.trim() !== baseline.email) changes.email = form.email.trim();
    if (form.address.trim() !== baseline.address) changes.morada = form.address.trim();
    if (form.nuit.trim() !== baseline.nuit) changes.nuit = form.nuit.trim();

    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await mobileApi.submitProfileUpdateRequest(changes);
      haptic('success');
      setForm(baseline);
      setIsEditing(false);
      setPendingNotice(true);
      Alert.alert(t.title, t.profileSaved);
    } catch (error) {
      haptic('error');
      Alert.alert(t.title, error instanceof Error ? error.message : t.profileSaveError);
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryAction = () => {
    if (isEditing) {
      submitChanges();
      return;
    }
    haptic('selection');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    haptic('selection');
    setForm(profileToForm(profile));
    setIsEditing(false);
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

        {loading ? (
          <IOSCard variant="inset" style={styles.identityCard}>
            <View style={styles.loadingRow}>
              <MaterialCommunityIcons name="progress-clock" size={22} color={colors.labelTertiary} />
              <Text style={[styles.loadingText, { color: colors.labelSecondary }]}>{t.loading}</Text>
            </View>
          </IOSCard>
        ) : loadError ? (
          <IOSCard variant="inset" style={styles.identityCard}>
            <View style={styles.loadingRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.error} />
              <Text style={[styles.loadingText, { color: colors.error }]}>{loadError}</Text>
            </View>
          </IOSCard>
        ) : (
          <>
            <IOSCard variant="elevated" style={styles.identityCard}>
              <View style={styles.identityRow}>
                <View style={[styles.avatarWrap, { backgroundColor: colors.primarySoftBg }]}>
                  <Text style={[styles.avatarInitials, { color: colors.primarySoftFg }]}>
                    {form.fullName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('')}
                  </Text>
                </View>
                <View style={styles.identityText}>
                  <Text style={[styles.identityName, { color: colors.label }]} numberOfLines={1}>
                    {form.fullName || '—'}
                  </Text>
                  <Text style={[styles.identityPhone, { color: colors.labelSecondary }]} numberOfLines={1}>
                    {form.phone || '—'}
                  </Text>
                  <View style={[styles.verifyPill, { backgroundColor: colors.successSoftBg }]}>
                    <MaterialCommunityIcons name="check-decagram" size={12} color={colors.success} />
                    <Text style={[styles.verifyPillText, { color: colors.success }]}>
                      {t.verificationStatus}
                    </Text>
                  </View>
                </View>
              </View>

              {pendingNotice ? (
                <View style={[styles.pendingNotice, { backgroundColor: colors.warningSoftBg }]}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={14} color={colors.warning} />
                  <Text style={[styles.pendingNoticeText, { color: colors.warning }]}>{t.profileSaved}</Text>
                </View>
              ) : null}

              <AnimatedView triggerKey={isEditing ? 'editing' : 'idle'} style={styles.identityActions}>
                {isEditing ? (
                  <View style={styles.editActions}>
                    <View style={styles.editActionFlex}>
                      <IOSButton
                        title={t.cancel}
                        variant="tinted"
                        fullWidth
                        iconLeft="close"
                        onPress={handleCancelEdit}
                        hapticType="selection"
                      />
                    </View>
                    <View style={styles.editActionGap} />
                    <View style={styles.editActionFlex}>
                      <IOSButton
                        title={t.saveChanges}
                        variant="filled"
                        fullWidth
                        iconLeft="check"
                        loading={saving}
                        onPress={handlePrimaryAction}
                      />
                    </View>
                  </View>
                ) : (
                  <IOSButton
                    title={t.editProfile}
                    variant="tinted"
                    fullWidth
                    iconLeft="pencil-outline"
                    onPress={handlePrimaryAction}
                  />
                )}
              </AnimatedView>
            </IOSCard>

            <SectionHeader title={t.personalSection} />
            <IOSCard variant="elevated" padded={false}>
              <ProfileFieldRow label={t.nameLabel} value={form.fullName} onChangeText={(v) => updateField('fullName', v)} editing={isEditing} icon="account-outline" />
              <ProfileFieldRow label={t.phoneLabel} value={form.phone} onChangeText={(v) => updateField('phone', v)} editing={isEditing} icon="phone-outline" keyboardType="phone-pad" />
              <ProfileFieldRow label={t.emailLabel} value={form.email} onChangeText={(v) => updateField('email', v)} editing={isEditing} icon="email-outline" keyboardType="email-address" />
              <ProfileFieldRow label={t.nuitLabel} value={form.nuit} onChangeText={(v) => updateField('nuit', v)} editing={isEditing} icon="badge-account-horizontal-outline" mono />
              <ProfileFieldRow label={t.biLabel} value={form.bi} onChangeText={() => undefined} editing={false} icon="card-account-details-outline" mono />
              <ProfileFieldRow label={t.addressLabel} value={form.address} onChangeText={(v) => updateField('address', v)} editing={isEditing} icon="map-marker-outline" multiline isLast />
            </IOSCard>

            <SectionHeader title={t.securitySection} subtitle={t.securityHint} />
            <IOSCard variant="elevated" padded={false}>
              <ToggleRow
                icon="shield-key-outline"
                label={t.otpLabel}
                description={t.otpDescription}
                value={otpEnabled}
                onChange={v => {
                  haptic('selection');
                  setOtpEnabled(v);
                }}
              />
            </IOSCard>

            <SectionHeader title={t.preferencesSection} />
            <IOSCard variant="elevated" padded={false}>
              <ToggleRow
                icon="message-text-outline"
                label={t.notifications}
                description={t.notificationsDesc}
                value={notificationsEnabled}
                onChange={v => {
                  haptic('selection');
                  setNotificationsEnabled(v);
                }}
              />
            </IOSCard>

            <SectionHeader title={t.metersSection} />
            <IOSCard variant="elevated" padded={false}>
              {meters.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={[styles.emptySectionText, { color: colors.labelTertiary }]}>{t.noMeters}</Text>
                </View>
              ) : (
                meters.map((item, idx) => (
                  <View key={item.numero_do_contador}>
                    <View style={styles.row}>
                      <View style={[styles.rowIcon, { backgroundColor: colors.primarySoftBg }]}>
                        <MaterialCommunityIcons name="counter" size={18} color={colors.primarySoftFg} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={[styles.rowLabelMono, { color: colors.label }]}>
                          {item.numero_do_contador}
                        </Text>
                        <Text style={[styles.rowDescription, { color: colors.labelTertiary }]}>
                          {item.estado}
                        </Text>
                      </View>
                    </View>
                    {idx < meters.length - 1 ? <View style={styles.rowDivider} /> : null}
                  </View>
                ))
              )}
            </IOSCard>

            {transactions.length > 0 ? (
              <>
                <SectionHeader title={t.purchasesChart} subtitle={t.purchasesChartSub} />
                <IOSCard variant="elevated">
                  <BarsChart data={monthlyData} max={maxMonthly} />
                </IOSCard>

                <SectionHeader title={t.taxesChart} subtitle={t.taxesChartSub} />
                <IOSCard variant="elevated">
                  <StackBar
                    ivaShare={totals.iva / totalCharges}
                    tscShare={totals.tsc / totalCharges}
                    fixedShare={totals.taxaFixa / totalCharges}
                  />
                  <View style={styles.legendWrap}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: colors.chartA }]} />
                      <Text style={[styles.legendText, { color: colors.label }]}>{t.ivaLegend}</Text>
                      <Text style={[styles.legendValue, { color: colors.labelSecondary }]}>
                        {currency(totals.iva, locale)}
                      </Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: colors.chartB }]} />
                      <Text style={[styles.legendText, { color: colors.label }]}>{t.tscLegend}</Text>
                      <Text style={[styles.legendValue, { color: colors.labelSecondary }]}>
                        {currency(totals.tsc, locale)}
                      </Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: colors.chartC }]} />
                      <Text style={[styles.legendText, { color: colors.label }]}>{t.fixedLegend}</Text>
                      <Text style={[styles.legendValue, { color: colors.labelSecondary }]}>
                        {currency(totals.taxaFixa, locale)}
                      </Text>
                    </View>
                  </View>
                </IOSCard>

                <SectionHeader title={t.totalsCarousel} subtitle={t.totalsCarouselSub} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={188}
                  contentContainerStyle={styles.totalsCarousel}
                >
                  <TotalCard label={t.totalBought} value={currency(totals.totalComprado, locale)} icon="cart-arrow-up" />
                  <TotalCard label={t.fixedFee} value={currency(totals.taxaFixa, locale)} icon="cash-multiple" />
                  <TotalCard label={t.vat} value={currency(totals.iva, locale)} icon="percent-outline" />
                  <TotalCard label={t.tsc} value={currency(totals.tsc, locale)} icon="receipt" />
                  <TotalCard label={t.m3} value={`${totals.m3.toFixed(2)} m³`} icon="gas-cylinder" isLast />
                </ScrollView>
              </>
            ) : (
              <>
                <SectionHeader title={t.purchasesChart} />
                <IOSCard variant="inset">
                  <View style={styles.emptySection}>
                    <Text style={[styles.emptySectionText, { color: colors.labelTertiary }]}>
                      {t.noPurchases}
                    </Text>
                  </View>
                </IOSCard>
              </>
            )}
          </>
        )}

        {onSignOut ? (
          <IOSCard variant="elevated">
            <IOSButton
              title={t.signOut}
              variant="filled"
              fullWidth
              iconLeft="logout"
              destructive
              onPress={() => {
                haptic('medium');
                onSignOut();
              }}
            />
          </IOSCard>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.labelTertiary }]}>{t.copyright}</Text>
          <Text style={[styles.footerText, { color: colors.labelTertiary }]}>{t.developedBy}</Text>
          <Text style={[styles.footerText, { color: colors.labelTertiary }]}>{t.forClient}</Text>
          <PressableScale
            onPress={() => {
              haptic('selection');
              Linking.openURL(t.websiteLabel);
            }}
            hapticType="none"
          >
            <Text style={[styles.footerLink, { color: colors.primary }]}>{t.websiteLabel}</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ----------------------------- Sub-components ---------------------------- */

type ProfileFieldRowProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editing: boolean;
  icon: string;
  multiline?: boolean;
  mono?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  isLast?: boolean;
};

function ProfileFieldRow({ label, value, onChangeText, editing, icon, multiline, mono, keyboardType = 'default', isLast }: ProfileFieldRowProps) {
  const { colors } = useAppTheme();

  if (editing) {
    return (
      <View
        style={[
          styles.fieldEditingRow,
          {
            borderBottomColor: colors.separator,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <Field
          label={label}
          value={value}
          onChangeText={onChangeText}
          iconLeft={icon}
          multiline={multiline}
          inputStyle={multiline ? styles.fieldEditingMultiline : undefined}
          monospace={mono}
          keyboardType={keyboardType}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fieldRow,
        {
          borderBottomColor: colors.separator,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primarySoftBg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primarySoftFg} />
      </View>
      <View style={styles.fieldRowText}>
        <Text style={[styles.fieldRowLabel, { color: colors.labelTertiary }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.fieldRowValue, { color: colors.label }, mono ? styles.monoValue : null]}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

type ToggleRowProps = {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ icon, label, description, value, onChange }: ToggleRowProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primarySoftBg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primarySoftFg} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.label }]}>{label}</Text>
        {description ? (
          <Text style={[styles.rowDescription, { color: colors.labelTertiary }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.separatorStrong, true: colors.primary }}
        thumbColor={undefined}
        ios_backgroundColor={colors.separatorStrong}
      />
    </View>
  );
}

type BarsChartProps = { data: MonthlyPurchase[]; max: number };

function BarsChart({ data, max }: BarsChartProps) {
  const { colors } = useAppTheme();
  const animations = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      80,
      animations.map(value =>
        Animated.timing(value, {
          toValue: 1,
          duration: motion.durations.slow,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [animations]);

  const chartHeight = 120;

  return (
    <View style={styles.barsWrap}>
      {data.map((item, idx) => {
        const targetHeight = Math.max(4, (item.value / max) * chartHeight);
        const heightAnim = animations[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [4, targetHeight],
        });
        return (
          <View key={`${item.month}-${idx}`} style={styles.barItem}>
            <Text style={[styles.barValue, { color: colors.labelTertiary }]}>{Math.round(item.value)}</Text>
            <Animated.View style={[styles.bar, { height: heightAnim, backgroundColor: colors.chartA }]} />
            <Text style={[styles.barLabel, { color: colors.labelSecondary }]}>{item.month}</Text>
          </View>
        );
      })}
    </View>
  );
}

type StackBarProps = { ivaShare: number; tscShare: number; fixedShare: number };

function StackBar({ ivaShare, tscShare, fixedShare }: StackBarProps) {
  const { colors } = useAppTheme();
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: 1,
      duration: motion.durations.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [widthAnim]);

  const animatedWidth = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.stackBarTrack, { backgroundColor: colors.surfaceMuted }]}>
      <Animated.View style={[styles.stackBar, { width: animatedWidth }]}>
        <View style={[styles.stackSeg, { flex: ivaShare || 0.001, backgroundColor: colors.chartA }]} />
        <View style={[styles.stackSeg, { flex: tscShare || 0.001, backgroundColor: colors.chartB }]} />
        <View style={[styles.stackSeg, { flex: fixedShare || 0.001, backgroundColor: colors.chartC }]} />
      </Animated.View>
    </View>
  );
}

type TotalCardProps = { label: string; value: string; icon: string; isLast?: boolean };

function TotalCard({ label, value, icon, isLast }: TotalCardProps) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.totalCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.separator,
          marginRight: isLast ? 0 : spacing.sm,
        },
      ]}
    >
      <View style={[styles.totalIcon, { backgroundColor: colors.primarySoftBg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primarySoftFg} />
      </View>
      <Text style={[styles.totalLabel, { color: colors.labelTertiary }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.totalValue, { color: colors.label }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* --------------------------------- Styles -------------------------------- */

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
    width: 62,
    height: 44,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typo.callout.fontSize,
    fontFamily: typo.callout.fontFamily,
    flex: 1,
  },
  identityCard: {
    marginTop: spacing.md,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: typo.title2.fontSize,
    fontFamily: typo.title2.fontFamily,
    letterSpacing: 0.5,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  identityName: {
    fontSize: typo.title3.fontSize,
    lineHeight: typo.title3.lineHeight,
    fontFamily: typo.title3.fontFamily,
  },
  identityPhone: {
    fontSize: typo.callout.fontSize,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 0.5,
  },
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginTop: 4,
  },
  verifyPillText: {
    fontSize: typo.caption2.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pendingNoticeText: {
    flex: 1,
    fontSize: typo.footnote.fontSize,
    fontFamily: 'Manrope_600SemiBold',
  },
  identityActions: {
    marginTop: spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  editActionFlex: { flex: 1 },
  editActionGap: { width: spacing.sm },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  fieldEditingRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fieldEditingMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  fieldRowText: { flex: 1 },
  fieldRowLabel: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 0.6,
  },
  fieldRowValue: {
    marginTop: 2,
    fontSize: typo.body.fontSize,
    lineHeight: typo.body.lineHeight,
    fontFamily: 'Manrope_700Bold',
  },
  monoValue: {
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 0.6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 36 + spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: typo.callout.fontSize,
    lineHeight: typo.callout.lineHeight,
    fontFamily: 'Manrope_700Bold',
  },
  rowLabelMono: {
    fontSize: typo.callout.fontSize,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 0.5,
  },
  rowDescription: {
    marginTop: 2,
    fontSize: typo.footnote.fontSize,
    lineHeight: typo.footnote.lineHeight,
    fontFamily: typo.footnote.fontFamily,
  },
  emptySection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: typo.footnote.fontSize,
    fontFamily: typo.footnote.fontFamily,
    textAlign: 'center',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
  },
  activePillText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },

  barsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    height: 168,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValue: {
    fontSize: typo.caption2.fontSize,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  bar: {
    width: 18,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
  },
  barLabel: {
    marginTop: spacing.sm,
    fontSize: typo.caption2.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
  },
  stackBarTrack: {
    height: 16,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  stackBar: {
    flexDirection: 'row',
    height: '100%',
    overflow: 'hidden',
  },
  stackSeg: {
    height: '100%',
  },
  legendWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
  },
  legendText: {
    flex: 1,
    fontSize: typo.callout.fontSize,
    fontFamily: 'Manrope_700Bold',
  },
  legendValue: {
    fontSize: typo.footnote.fontSize,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 0.4,
  },
  totalsCarousel: {
    paddingVertical: 2,
    paddingRight: spacing.lg,
  },
  totalCard: {
    width: 180,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 6,
  },
  totalIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 0.6,
  },
  totalValue: {
    fontSize: typo.title3.fontSize,
    lineHeight: typo.title3.lineHeight,
    fontFamily: typo.title3.fontFamily,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 4,
  },
  footerText: {
    fontSize: typo.caption2.fontSize,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footerLink: {
    marginTop: spacing.sm,
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
});

export default ProfileScreen;
