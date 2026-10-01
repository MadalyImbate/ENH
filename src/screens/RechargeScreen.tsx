import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeModules,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Camera, CameraType } from 'react-native-camera-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IOSCard from '../components/IOSCard';
import IOSButton from '../components/IOSButton';
import StepProgress from '../components/StepProgress';
import PressableScale from '../components/PressableScale';
import Field from '../components/Field';
import AnimatedView from '../components/AnimatedView';
import type { AppLanguage } from '../navigation/types';
import { motion, radii, shadows, spacing, type as typo } from '../theme/tokens';
import { useAppTheme } from '../theme/useAppTheme';
import { haptic } from '../utils/haptics';
import { mobileApi, type MeterDetail, type PaymentMethod, type RechargeOptions, type RechargeQuote } from '../services/api';

/**
 * react-native-camera-kit v17 expõe os métodos de autorização como um
 * TurboModule chamado "RNCameraKitModule" na nova arquitetura. O export
 * default `CameraKit` do pacote aponta para `NativeModules.CameraKit`, que
 * é `undefined` com a nova arquitetura ativa (RCTNewArchEnabled=true) — por
 * isso a chamada lançava e o scanner nunca abria. Resolvemos o módulo aqui
 * de forma robusta para ambas as arquiteturas.
 */
type CameraAuthApi = {
  checkDeviceCameraAuthorizationStatus: () => Promise<boolean>;
  requestDeviceCameraAuthorization: () => Promise<boolean>;
};

const CameraAuthModule: CameraAuthApi | undefined =
  (TurboModuleRegistry.get('RNCameraKitModule') as CameraAuthApi | null) ??
  (NativeModules.CameraKit as CameraAuthApi | undefined);

type RechargeScreenProps = {
  language: AppLanguage;
  prefillMeterNumber?: string;
  /** Quando presente (fluxo de visitante), mostra um botão "voltar" no cabeçalho. */
  onBack?: () => void;
  backLabel?: string;
};

/** Logos disponíveis localmente; outros métodos caem num ícone genérico. */
const paymentLogos: Record<string, ImageSourcePropType> = {
  MPESA: require('../assets/payment/mpesa.png') as ImageSourcePropType,
  EMOLA: require('../assets/payment/emola.png') as ImageSourcePropType,
};

/**
 * Métodos sem logo próprio usam um ícone vetorial — fica nítido em qualquer
 * densidade, ao contrário de espremer a marca Visa num tile pequeno.
 */
const methodIcons: Record<string, string> = {
  CARD: 'credit-card-outline',
};

/** Métodos que pedem o número de telefone da carteira móvel. */
const WALLET_PHONE_METHODS = new Set(['MPESA', 'EMOLA']);

/** Prefixos moçambicanos válidos por carteira (Vodacom / Movitel). */
const WALLET_PREFIXES: Record<string, string[]> = {
  MPESA: ['84', '85'],
  EMOLA: ['86', '87'],
};

/**
 * Métodos oferecidos na app do cliente. Recarga Aki é um canal de agente e
 * nunca aparece aqui — mesmo que um servidor antigo ainda o devolva.
 */
const HIDDEN_METHODS = new Set(['RECARGA_AKI']);

const FALLBACK_METHODS: PaymentMethod[] = [
  { code: 'MPESA', label: 'M-Pesa', requires_transaction_id: true, active: true },
  { code: 'EMOLA', label: 'e-Mola', requires_transaction_id: true, active: true },
  { code: 'CARD', label: 'Visa / Mastercard', requires_transaction_id: true, active: true },
];

/** Garante a oferta correta seja qual for a versão do servidor. */
function sanitizeMethods(list: PaymentMethod[]): PaymentMethod[] {
  const visible = list.filter(m => m.active && !HIDDEN_METHODS.has(m.code));
  if (!visible.some(m => m.code === 'CARD')) {
    visible.push(FALLBACK_METHODS[2]);
  }
  return visible.map(m => (m.code === 'CARD' ? { ...m, label: 'Visa / Mastercard' } : m));
}

const copy = {
  pt: {
    title: 'Comprar Recarga',
    intro: 'Recarregue seu contador em 4 passos.',
    step1: 'Contador',
    step2: 'Valor',
    step3: 'Pagar',
    step4: 'Pronto',
    meterLabel: 'Numero do contador',
    meterPlaceholder: '47XXXXXXXXXX',
    scanHint: 'Toque no icone para abrir a camera e ler o codigo de barras.',
    continue: 'Continuar',
    invalidMeter: 'O numero do contador deve ter 11 ou 13 digitos.',
    invalidScannedMeter: 'O codigo lido nao contem um contador valido de 11 ou 13 digitos.',
    customerFallback: 'Cliente',
    name: 'Nome',
    phone: 'Telefone',
    meter: 'Contador',
    m3Added: 'Recarga estimada',
    amountLabel: 'Quanto deseja pagar?',
    amountSubtitle: 'Em meticais (MZN). O valor em m3 e os impostos sao calculados pelo sistema.',
    limitsHint: 'Valor permitido:',
    calculating: 'A calcular no servidor...',
    breakdownCaption: 'Discriminacao do valor pago (impostos incluidos)',
    gasValue: 'Gas',
    willReceive: 'Vai receber',
    amountPlaceholder: '500',
    amountInvalid: 'Informe um valor valido acima de 0.',
    taxSummary: 'Resumo da compra',
    grossAmount: 'Valor pago',
    m3Price: 'Preco do m3',
    iva: 'IVA (16%)',
    tsc: 'TSC (0.4%)',
    fixedFee: 'Taxa fixa',
    netAmount: 'Valor da recarga',
    chooseMethod: 'Selecione o metodo de pagamento',
    walletPhone: 'Numero de telefone da carteira',
    walletPhoneTitle: 'Confirme o numero',
    walletPhoneSubtitle: 'Vai receber o pedido de confirmacao do pagamento neste numero.',
    walletPhoneHintPrefix: 'Numeros',
    walletPhoneHintSuffix: 'digitos',
    walletPhoneBadPrefix: 'Este numero nao pertence a rede do metodo escolhido.',
    walletPhoneShort: 'Faltam digitos: o numero tem 9 digitos.',
    walletPhoneReady: 'Numero valido',
    operationSummary: 'Resumo da operacao',
    customerNumber: 'Numero do cliente',
    paidValue: 'Valor pago',
    rechargeToken: 'Token de recarga',
    validatePayment: 'Validar pagamento',
    back: 'Voltar',
    successTitle: 'Recarga concluida!',
    successMessage: 'A recarga foi processada com sucesso. Apresente o token abaixo no contador.',
    newRecharge: 'Nova recarga',
    selectMethodError: 'Selecione um metodo de pagamento.',
    walletPhoneError: 'Informe o numero de telefone para Mpesa/eMola.',
    paymentMethod: 'Metodo',
    scannerTitle: 'Ler codigo de barras',
    scannerSubtitle: 'Aponte a camera para o codigo do contador.',
    closeScanner: 'Fechar scanner',
    cameraPermissionTitle: 'Permissao da camera',
    cameraPermissionMessage: 'Precisamos da camera para ler o codigo de barras do contador.',
    cameraPermissionDenied: 'Nao foi possivel aceder a camera. Autorize a permissao para continuar.',
    openSettings: 'Abrir definicoes',
  },
  en: {
    title: 'Top Up',
    intro: 'Recharge your meter in 4 steps.',
    step1: 'Meter',
    step2: 'Amount',
    step3: 'Pay',
    step4: 'Done',
    meterLabel: 'Meter number',
    meterPlaceholder: '47XXXXXXXXXX',
    scanHint: 'Tap the icon to open the camera and scan the barcode.',
    continue: 'Continue',
    invalidMeter: 'The meter number must have 11 or 13 digits.',
    invalidScannedMeter: 'The scanned barcode does not contain a valid 11 or 13 digit meter number.',
    customerFallback: 'Customer',
    name: 'Name',
    phone: 'Phone',
    meter: 'Meter',
    m3Added: 'Estimated top up',
    amountLabel: 'How much would you like to pay?',
    amountSubtitle: 'In meticals (MZN). The m3 and taxes are calculated by the system.',
    limitsHint: 'Allowed amount:',
    calculating: 'Calculating on the server...',
    breakdownCaption: 'Breakdown of the amount paid (taxes included)',
    gasValue: 'Gas',
    willReceive: "You'll receive",
    amountPlaceholder: '500',
    amountInvalid: 'Please enter a valid amount greater than 0.',
    taxSummary: 'Purchase summary',
    grossAmount: 'Paid value',
    m3Price: 'm3 price',
    iva: 'VAT (16%)',
    tsc: 'TSC (0.4%)',
    fixedFee: 'Fixed fee',
    netAmount: 'Recharge value',
    chooseMethod: 'Select payment method',
    walletPhone: 'Wallet phone number',
    walletPhoneTitle: 'Confirm the number',
    walletPhoneSubtitle: "You'll receive the payment confirmation request on this number.",
    walletPhoneHintPrefix: 'Numbers',
    walletPhoneHintSuffix: 'digits',
    walletPhoneBadPrefix: 'This number does not belong to the selected wallet network.',
    walletPhoneShort: 'Missing digits: the number has 9 digits.',
    walletPhoneReady: 'Valid number',
    operationSummary: 'Operation summary',
    customerNumber: 'Customer number',
    paidValue: 'Paid value',
    rechargeToken: 'Recharge token',
    validatePayment: 'Validate payment',
    back: 'Back',
    successTitle: 'Top up complete!',
    successMessage: 'The top up was processed successfully. Use the token below on the meter.',
    newRecharge: 'New top up',
    selectMethodError: 'Please select a payment method.',
    walletPhoneError: 'Please enter a phone number for Mpesa/eMola.',
    paymentMethod: 'Method',
    scannerTitle: 'Scan barcode',
    scannerSubtitle: 'Point the camera at the meter barcode.',
    closeScanner: 'Close scanner',
    cameraPermissionTitle: 'Camera permission',
    cameraPermissionMessage: 'We need camera access to read the meter barcode.',
    cameraPermissionDenied: 'Camera access is unavailable. Please allow the permission to continue.',
    openSettings: 'Open settings',
  },
};

function fmt(v: number) {
  return `${v.toFixed(2)} MZN`;
}

function fmtM3(v: number) {
  return `${v.toFixed(2)} m3`;
}

function toNumber(value?: string) {
  return Number(String(value ?? '0').replace(',', '.')) || 0;
}

/** Apresenta 841234567 como "84 123 4567". */
function formatWalletPhone(digits: string) {
  const d = digits.replace(/\D/g, '').slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 9)].filter(Boolean);
  return parts.join(' ');
}

function formatTokenGroups(v: string) {
  return v.replace(/(.{4})/g, '$1 ').trim();
}

function normalizeMeterCode(rawValue: string) {
  const digits = rawValue.replace(/\D/g, '');
  if (digits.length >= 13) return digits.slice(0, 13);
  if (digits.length === 11) return digits;
  return '';
}

export function RechargeScreen({ language, prefillMeterNumber, onBack, backLabel }: RechargeScreenProps) {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = copy[language];

  const [step, setStep] = useState(1);
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(FALLBACK_METHODS);
  const [options, setOptions] = useState<RechargeOptions | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [method, setMethod] = useState<string>('');
  const [walletPhone, setWalletPhone] = useState('');
  const [token20, setToken20] = useState('');
  const [error, setError] = useState('');
  const [meterDetail, setMeterDetail] = useState<MeterDetail | null>(null);
  const [quote, setQuote] = useState<RechargeQuote | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);

  const hasScannedRef = useRef(false);
  const tokenScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Uma só chamada traz limites, valores sugeridos e métodos de pagamento.
    mobileApi
      .rechargeOptions()
      .then(opts => {
        setOptions(opts);
        if (opts.payment_methods?.length) setPaymentMethods(sanitizeMethods(opts.payment_methods));
      })
      .catch(() => {
        // Fallback: endpoint antigo e, em último caso, a lista local.
        mobileApi
          .paymentMethods()
          .then((list) => setPaymentMethods(sanitizeMethods(list)))
          .catch(() => setPaymentMethods(FALLBACK_METHODS));
      });
  }, []);

  // Todos os valores vêm do servidor (GET /recharges/quote/). A app não faz
  // qualquer cálculo de tarifas, impostos ou m³.
  const gross = Number(amount.replace(',', '.')) || 0;
  const iva = toNumber(quote?.iva);
  const tsc = toNumber(quote?.tsc);
  const fixed = toNumber(quote?.taxa_fixa);
  const gasValue = toNumber(quote?.valgas);
  const paid = toNumber(quote?.valor_pago);
  const rechargeM3 = toNumber(quote?.m3);
  const customerName = quote?.nome_do_cliente ?? meterDetail?.cliente_nome ?? t.customerFallback;

  const stepLabels = [{ label: t.step1 }, { label: t.step2 }, { label: t.step3 }, { label: t.step4 }];

  useEffect(() => {
    if (prefillMeterNumber && prefillMeterNumber.trim().length > 0) {
      setMeterNumber(prefillMeterNumber.trim());
      setStep(1);
      setError('');
    }
  }, [prefillMeterNumber]);

  // Animate token reveal on step 4
  useEffect(() => {
    if (step === 4 && token20) {
      tokenScale.setValue(0.85);
      Animated.spring(tokenScale, { toValue: 1, ...motion.spring.bouncy }).start();
      haptic('success');
    }
  }, [step, token20, tokenScale]);

  const toStep2 = async () => {
    const meterLength = meterNumber.trim().length;
    if (meterLength !== 11 && meterLength !== 13) {
      haptic('error');
      setError(t.invalidMeter);
      return;
    }
    try {
      setSubmitting(true);
      const detail = await mobileApi.meterDetail(meterNumber.trim());
      setMeterDetail(detail);
      haptic('selection');
      setError('');
      setStep(2);
    } catch (meterError) {
      haptic('error');
      setError(meterError instanceof Error ? meterError.message : String(meterError));
    } finally {
      setSubmitting(false);
    }
  };

  // Cotação real (servidor) enquanto o cliente escreve o valor — substitui a
  // antiga estimativa local, que usava tarifas fixas e não batia certo com o
  // valor final apresentado no passo seguinte.
  useEffect(() => {
    if (step !== 2) return undefined;
    const value = Number(amount.replace(',', '.')) || 0;
    if (value <= 0) {
      setQuote(null);
      return undefined;
    }
    let active = true;
    setQuoting(true);
    const handle = setTimeout(() => {
      mobileApi
        .quoteRecharge({ meter_number: meterNumber.trim(), amount: String(value) })
        .then(nextQuote => {
          if (!active) return;
          setQuote(nextQuote);
          setError('');
        })
        .catch(quoteError => {
          if (!active) return;
          setQuote(null);
          setError(quoteError instanceof Error ? quoteError.message : String(quoteError));
        })
        .finally(() => {
          if (active) setQuoting(false);
        });
    }, 500);
    return () => {
      active = false;
      clearTimeout(handle);
      setQuoting(false);
      clearTimeout(handle);
    };
  }, [amount, step, meterNumber]);

  const toStep3 = async () => {
    if (!gross || gross <= 0) {
      haptic('error');
      setError(t.amountInvalid);
      return;
    }
    try {
      setSubmitting(true);
      // Recotação final no servidor — garante que avançamos com os valores
      // exatos que vão ser cobrados.
      const nextQuote = await mobileApi.quoteRecharge({ meter_number: meterNumber.trim(), amount: String(gross) });
      setQuote(nextQuote);
      haptic('selection');
      setError('');
      setStep(3);
    } catch (quoteError) {
      haptic('error');
      setError(quoteError instanceof Error ? quoteError.message : String(quoteError));
    } finally {
      setSubmitting(false);
    }
  };

  const validatePayment = async () => {
    if (!method) {
      haptic('error');
      return setError(t.selectMethodError);
    }
    if (WALLET_PHONE_METHODS.has(method) && !walletValid) {
      haptic('error');
      return setError(t.walletPhoneError);
    }
    try {
      setSubmitting(true);
      const result = await mobileApi.confirmRecharge({
        meter_number: meterNumber.trim(),
        amount: String(gross),
        payment_method: method,
        // A referência da transação é gerada pelo servidor.
        phone: walletPhone.trim(),
      });
      setQuote(result);
      setToken20(result.token);
      setError('');
      setStep(4);
    } catch (paymentError) {
      haptic('error');
      setError(paymentError instanceof Error ? paymentError.message : String(paymentError));
    } finally {
      setSubmitting(false);
    }
  };

  const ensureCameraPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: t.cameraPermissionTitle,
          message: t.cameraPermissionMessage,
          buttonPositive: 'OK',
          buttonNegative: t.back,
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      // Se o módulo nativo não estiver acessível, deixamos o iOS mostrar o
      // prompt do sistema ao montar a <Camera> (Info.plist já tem
      // NSCameraUsageDescription). Bloquear aqui deixaria a câmara "sem abrir".
      if (!CameraAuthModule) return true;
      const authorized = await CameraAuthModule.checkDeviceCameraAuthorizationStatus();
      if (authorized) return true;
      return await CameraAuthModule.requestDeviceCameraAuthorization();
    } catch {
      return false;
    }
  };

  const openScanner = async () => {
    setError('');
    setCameraDenied(false);
    hasScannedRef.current = false;
    const granted = await ensureCameraPermission();
    if (!granted) {
      setCameraDenied(true);
      setError(t.cameraPermissionDenied);
      return;
    }
    haptic('light');
    setScannerVisible(true);
  };

  const closeScanner = () => {
    setScannerVisible(false);
    hasScannedRef.current = false;
  };

  const handleCodeRead = (event: { nativeEvent: { codeStringValue?: string } }) => {
    if (hasScannedRef.current) return;
    const scannedValue = event.nativeEvent.codeStringValue ?? '';
    const normalizedMeter = normalizeMeterCode(scannedValue);
    if (!normalizedMeter) {
      haptic('error');
      setError(t.invalidScannedMeter);
      return;
    }
    hasScannedRef.current = true;
    haptic('success');
    setMeterNumber(normalizedMeter);
    setError('');
    closeScanner();
  };

  const resetAll = () => {
    haptic('light');
    setStep(1);
    setMeterNumber('');
    setAmount('');
    setMethod('');
    setWalletPhone('');
    setToken20('');
    setMeterDetail(null);
    setQuote(null);
    setError('');
    setScannerVisible(false);
    setCameraDenied(false);
  };

  const methodLabel = (code: string) => paymentMethods.find((m) => m.code === code)?.label ?? code;

  // Validação da carteira móvel: 9 dígitos e prefixo da rede correta.
  const walletPrefixes = (method && WALLET_PREFIXES[method]) || ['84'];
  const walletPrefixOk = walletPrefixes.some((prefix) => walletPhone.startsWith(prefix));
  const walletValid = walletPhone.length === 9 && walletPrefixOk;
  const walletError =
    walletPhone.length >= 2 && !walletPrefixOk
      ? t.walletPhoneBadPrefix
      : walletPhone.length > 0 && walletPhone.length < 9
        ? t.walletPhoneShort
        : '';

  // No fluxo de visitante a barra de topo nativa está escondida, por isso
  // encostamos o conteúdo ao safe-area (botão de voltar fica bem no topo).
  const topPad = onBack
    ? insets.top + spacing.sm
    : Platform.OS === 'ios'
    ? Math.max(insets.top + 8, 24)
    : Math.max(28, Math.round(height * 0.06));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: 90 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {onBack ? (
            <PressableScale
              onPress={onBack}
              hapticType="selection"
              style={[styles.backCircle, { backgroundColor: colors.primarySoftBg }]}
              accessibilityLabel={backLabel ?? t.back}
            >
              <MaterialCommunityIcons name="arrow-left" size={26} color={colors.primarySoftFg} />
            </PressableScale>
          ) : null}

          <View style={styles.heroHeader}>
            <View style={styles.brandRow}>
              <Image
                source={require('../assets/icons/enh-kogas.png')}
                style={styles.brandLogo}
                resizeMode="contain"
                accessibilityLabel="ENH Kogas"
              />
              <Text style={[styles.eyebrow, { color: colors.primary }]}>
                {String(step).padStart(2, '0')}/04
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.label }]}>{t.title}</Text>
            <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>{t.intro}</Text>
          </View>

          <IOSCard variant="elevated" padded style={styles.stepCard}>
            <StepProgress steps={stepLabels} current={step} />
          </IOSCard>

          {/* Customer card (visible from step 2) */}
          {step >= 2 ? (
            <AnimatedView triggerKey="customer" duration={motion.durations.slow}>
              <IOSCard variant="inset" padded style={styles.customerCard}>
                <View style={styles.customerHeader}>
                  <View style={[styles.avatar, { backgroundColor: colors.primarySoftBg }]}>
                    <MaterialCommunityIcons name="account" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.customerNameWrap}>
                    <Text style={[styles.customerName, { color: colors.label }]}>{customerName}</Text>
                    <Text style={[styles.customerSubline, { color: colors.labelSecondary }]}>
                      {meterNumber || '--'}
                    </Text>
                  </View>
                </View>
              </IOSCard>
            </AnimatedView>
          ) : null}

          <AnimatedView triggerKey={`step-${step}`} duration={motion.durations.base}>
            {step === 1 ? (
              <IOSCard variant="elevated" padded style={styles.contentCard}>
                <Text style={[styles.cardTitle, { color: colors.label }]}>{t.meterLabel}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.labelSecondary }]}>{t.scanHint}</Text>
                <View style={styles.formStack}>
                  <Field
                    label={t.meterLabel}
                    value={meterNumber}
                    onChangeText={setMeterNumber}
                    keyboardType="number-pad"
                    maxLength={13}
                    placeholder={t.meterPlaceholder}
                    monospace
                    rightAdornment={
                      <PressableScale
                        onPress={openScanner}
                        style={[styles.scanIconBtn, { backgroundColor: colors.primary }]}
                        hapticType="medium"
                      >
                        <MaterialCommunityIcons name="barcode-scan" size={18} color={colors.labelOnPrimary} />
                      </PressableScale>
                    }
                  />
                </View>
                {error ? <ErrorPill text={error} /> : null}
                <IOSButton
                  title={t.continue}
                  onPress={toStep2}
                  loading={isSubmitting}
                  size="lg"
                  fullWidth
                  iconRight="arrow-right"
                  style={styles.primaryAction}
                />
              </IOSCard>
            ) : null}

            {step === 2 ? (
              <IOSCard variant="elevated" padded style={styles.contentCard}>
                <Text style={[styles.cardTitle, { color: colors.label }]}>{t.amountLabel}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.labelSecondary }]}>{t.amountSubtitle}</Text>

                <View style={styles.amountInputWrap}>
                  <Text style={[styles.amountSymbol, { color: colors.labelTertiary }]}>MZN</Text>
                  <Field
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    inputStyle={styles.amountInput}
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                <QuickAmounts
                  amounts={options?.suggested_amounts ?? []}
                  selected={gross}
                  onPick={v => setAmount(String(v))}
                />

                {options ? (
                  <Text style={[styles.limitsHint, { color: colors.labelTertiary }]}>
                    {`${t.limitsHint} ${fmt(Number(options.min_amount))} – ${fmt(Number(options.max_amount))}`}
                  </Text>
                ) : null}

                {gross > 0 ? (
                  <View style={[styles.estimateBox, { backgroundColor: colors.primarySoftBg, borderColor: colors.primary }]}>
                    {quoting ? (
                      <Text style={[styles.estimateLabel, { color: colors.labelSecondary }]}>{t.calculating}</Text>
                    ) : quote ? (
                      <>
                        <View style={styles.estimateRow}>
                          <Text style={[styles.estimateLabel, { color: colors.labelSecondary }]}>{t.m3Added}</Text>
                          <Text style={[styles.estimateValue, { color: colors.primary }]}>{fmtM3(rechargeM3)}</Text>
                        </View>
                        <View style={styles.estimateRow}>
                          <Text style={[styles.estimateLabel, { color: colors.labelSecondary }]}>{t.paidValue}</Text>
                          <Text style={[styles.estimateValue, { color: colors.primary }]}>{fmt(paid)}</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                ) : null}

                {error ? <ErrorPill text={error} /> : null}

                <View style={styles.rowBtns}>
                  <IOSButton title={t.back} variant="tinted" size="lg" onPress={() => setStep(1)} iconLeft="arrow-left" style={styles.backBtn} />
                  <IOSButton title={t.continue} variant="filled" size="lg" onPress={toStep3} iconRight="arrow-right" style={styles.nextBtn} />
                </View>
              </IOSCard>
            ) : null}

            {step === 3 ? (
              <IOSCard variant="elevated" padded style={styles.contentCard}>
                <Text style={[styles.cardTitle, { color: colors.label }]}>{t.chooseMethod}</Text>

                <View style={styles.methodsGrid}>
                  {paymentMethods.map(m => {
                    const active = method === m.code;
                    const logo = paymentLogos[m.code];
                    return (
                      <PressableScale
                        key={m.code}
                        onPress={() => setMethod(m.code)}
                        style={[
                          styles.methodTile,
                          {
                            backgroundColor: active ? colors.primarySoftBg : colors.surfaceMuted,
                            borderColor: active ? colors.primary : colors.separator,
                          },
                        ]}
                        hapticType="selection"
                      >
                        <View
                          style={[
                            styles.methodLogoWrap,
                            {
                              backgroundColor: active ? colors.surface : colors.surfaceMuted,
                              borderColor: active ? colors.primary : colors.separator,
                            },
                          ]}
                        >
                          {logo ? (
                            <Image source={logo} style={styles.methodLogo} resizeMode="contain" />
                          ) : (
                            <MaterialCommunityIcons
                              name={methodIcons[m.code] ?? 'storefront-outline'}
                              size={34}
                              color={active ? colors.primary : colors.labelSecondary}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.methodTileText,
                            {
                              color: active ? colors.primary : colors.label,
                              fontFamily: active ? 'Manrope_800ExtraBold' : 'Manrope_700Bold',
                            },
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {m.label}
                        </Text>
                        {active ? (
                          <View style={[styles.methodBadge, { backgroundColor: colors.primary }]}>
                            <MaterialCommunityIcons name="check" size={11} color={colors.labelOnPrimary} />
                          </View>
                        ) : null}
                      </PressableScale>
                    );
                  })}
                </View>

                <View style={[styles.summaryBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.separator }]}>
                  <Text style={[styles.summaryTitle, { color: colors.label }]}>{t.taxSummary}</Text>

                  <View style={styles.totalHighlight}>
                    <Text style={[styles.totalHighlightLabel, { color: colors.labelSecondary }]}>{t.paidValue}</Text>
                    <Text style={[styles.totalHighlightValue, { color: colors.label }]}>{fmt(paid)}</Text>
                  </View>

                  <Text style={[styles.breakdownCaption, { color: colors.labelTertiary }]}>{t.breakdownCaption}</Text>
                  <SummaryRow label={t.gasValue} value={fmt(gasValue)} muted />
                  <SummaryRow label={t.iva} value={fmt(iva)} muted />
                  <SummaryRow label={t.tsc} value={fmt(tsc)} muted />
                  {fixed > 0 ? <SummaryRow label={t.fixedFee} value={fmt(fixed)} muted /> : null}

                  <View style={[styles.summaryDivider, { backgroundColor: colors.separator }]} />

                  <View style={styles.totalHighlight}>
                    <Text style={[styles.totalHighlightLabel, { color: colors.labelSecondary }]}>{t.willReceive}</Text>
                    <Text style={[styles.totalHighlightValue, { color: colors.primary }]}>{fmtM3(rechargeM3)}</Text>
                  </View>
                </View>

                {method && WALLET_PHONE_METHODS.has(method) ? (
                  <AnimatedView
                    triggerKey={method}
                    style={[
                      styles.walletBlock,
                      { backgroundColor: colors.surfaceMuted, borderColor: walletValid ? colors.primary : colors.separator },
                    ]}
                  >
                    <View style={styles.walletHeader}>
                      {paymentLogos[method] ? (
                        <View style={[styles.walletLogoWrap, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
                          <Image source={paymentLogos[method]} style={styles.walletLogo} resizeMode="contain" />
                        </View>
                      ) : null}
                      <View style={styles.walletHeaderText}>
                        <Text style={[styles.walletTitle, { color: colors.label }]}>
                          {`${t.walletPhoneTitle} ${methodLabel(method)}`}
                        </Text>
                        <Text style={[styles.walletSubtitle, { color: colors.labelTertiary }]}>
                          {t.walletPhoneSubtitle}
                        </Text>
                      </View>
                    </View>

                    <Field
                      value={formatWalletPhone(walletPhone)}
                      onChangeText={text => setWalletPhone(text.replace(/\D/g, '').slice(0, 9))}
                      keyboardType="phone-pad"
                      placeholder={`${walletPrefixes[0]} XXX XXXX`}
                      inputStyle={styles.walletInput}
                      leftAdornment={
                        <View style={[styles.dialCode, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
                          <Text style={[styles.dialCodeText, { color: colors.labelSecondary }]}>+258</Text>
                        </View>
                      }
                      rightAdornment={
                        walletValid ? (
                          <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
                        ) : null
                      }
                      errorText={walletError}
                      hint={
                        walletValid
                          ? t.walletPhoneReady
                          : `${t.walletPhoneHintPrefix} ${methodLabel(method)}: ${walletPrefixes.join(' / ')} · 9 ${t.walletPhoneHintSuffix}`
                      }
                      containerStyle={styles.walletField}
                    />
                  </AnimatedView>
                ) : null}

                {error ? <ErrorPill text={error} /> : null}

                <View style={styles.rowBtns}>
                  <IOSButton title={t.back} variant="tinted" size="lg" onPress={() => setStep(2)} iconLeft="arrow-left" style={styles.backBtn} />
                  <IOSButton
                    title={t.validatePayment}
                    variant="filled"
                    size="lg"
                    onPress={validatePayment}
                    loading={isSubmitting}
                    iconRight="lock-check"
                    style={styles.nextBtn}
                  />
                </View>
              </IOSCard>
            ) : null}

            {step === 4 ? (
              <View>
                <IOSCard variant="elevated" padded style={[styles.contentCard, styles.successCard]}>
                  <View style={[styles.successIconWrap, { backgroundColor: colors.successSoftBg }]}>
                    <MaterialCommunityIcons name="check-decagram" size={48} color={colors.success} />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.label }]}>{t.successTitle}</Text>
                  <Text style={[styles.successText, { color: colors.labelSecondary }]}>{t.successMessage}</Text>
                </IOSCard>

                {!!token20 && (
                  <Animated.View style={{ transform: [{ scale: tokenScale }] }}>
                    <IOSCard
                      variant="elevated"
                      padded
                      style={[styles.tokenCard, { borderColor: colors.primary, backgroundColor: colors.primarySoftBg }]}
                    >
                      <Text style={[styles.tokenLabel, { color: colors.primary }]}>{t.rechargeToken}</Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        style={[styles.tokenValue, { color: colors.primary }]}
                      >
                        {formatTokenGroups(token20)}
                      </Text>
                    </IOSCard>
                  </Animated.View>
                )}

                <IOSCard variant="elevated" padded style={styles.contentCard}>
                  <Text style={[styles.summaryTitle, { color: colors.label }]}>{t.operationSummary}</Text>
                  <SummaryRow label={t.name} value={customerName} />
                  {walletPhone ? <SummaryRow label={t.customerNumber} value={walletPhone} /> : null}
                  <SummaryRow label={t.meter} value={meterNumber} mono />
                  <SummaryRow label={t.paymentMethod} value={method ? methodLabel(method) : '--'} />
                  <SummaryRow label={t.paidValue} value={fmt(paid)} bold />
                  <SummaryRow label={t.willReceive} value={fmtM3(rechargeM3)} bold />
                  <View style={[styles.summaryDivider, { backgroundColor: colors.separator }]} />
                  <SummaryRow label={t.gasValue} value={fmt(gasValue)} muted />
                  <SummaryRow label={t.iva} value={fmt(iva)} muted />
                  <SummaryRow label={t.tsc} value={fmt(tsc)} muted />
                  {fixed > 0 ? <SummaryRow label={t.fixedFee} value={fmt(fixed)} muted /> : null}
                </IOSCard>

                <IOSButton
                  title={t.newRecharge}
                  onPress={resetAll}
                  variant="filled"
                  size="lg"
                  fullWidth
                  iconLeft="plus-circle-outline"
                  style={styles.primaryAction}
                />
              </View>
            ) : null}
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={scannerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeScanner}
      >
        <SafeAreaView style={styles.scannerRoot}>
          <View style={[styles.scannerHeader, { paddingTop: insets.top + 8 }]}>
            <View style={styles.scannerTextWrap}>
              <Text style={styles.scannerTitle}>{t.scannerTitle}</Text>
              <Text style={styles.scannerSubtitle}>{t.scannerSubtitle}</Text>
            </View>
            <PressableScale onPress={closeScanner} style={styles.scannerCloseBtn} hapticType="light">
              <MaterialCommunityIcons name="close" size={22} color="#ffffff" />
            </PressableScale>
          </View>

          <View style={styles.scannerViewport}>
            <Camera
              style={StyleSheet.absoluteFill}
              cameraType={CameraType.Back}
              scanBarcode
              showFrame
              laserColor="#ff5c63"
              frameColor="#ffffff"
              scanThrottleDelay={1200}
              resizeMode="cover"
              allowedBarcodeTypes={['ean-13', 'ean-8', 'code-128', 'code-39', 'upc-a', 'upc-e', 'itf', 'codabar']}
              onReadCode={handleCodeRead}
            />
            <ScannerCornerOverlay />
          </View>

          <View style={[styles.scannerFooter, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.scannerHint}>EAN-13 · CODE-128 · UPC</Text>
            <IOSButton
              title={t.closeScanner}
              variant="filled"
              size="lg"
              fullWidth
              onPress={closeScanner}
              iconLeft="close"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {cameraDenied && (
        <PressableScale
          onPress={() => Linking.openSettings()}
          style={[
            styles.settingsBtn,
            { backgroundColor: colors.surface, borderColor: colors.separator, ...shadows.cardStrong },
          ]}
          hapticType="medium"
        >
          <MaterialCommunityIcons name="cog-outline" size={16} color={colors.label} />
          <Text style={[styles.settingsBtnText, { color: colors.label }]}>{t.openSettings}</Text>
        </PressableScale>
      )}
    </SafeAreaView>
  );
}

/* ----- Internal helpers ----- */

function ErrorPill({ text }: { text: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.errorPill, { backgroundColor: colors.errorSoftBg, borderColor: colors.error }]}>
      <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
      <Text style={[styles.errorPillText, { color: colors.error }]}>{text}</Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
  muted = false,
  mono = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  mono?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryRowLabel, { color: muted ? colors.labelTertiary : colors.labelSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryRowValue,
          {
            color: bold ? colors.label : muted ? colors.labelSecondary : colors.label,
            fontFamily: bold ? 'Manrope_800ExtraBold' : mono ? 'JetBrainsMono-Bold' : 'Manrope_600SemiBold',
          },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/** Valores sugeridos definidos pelo servidor (GET /recharges/options/). */
function QuickAmounts({
  amounts,
  selected,
  onPick,
}: {
  amounts: number[];
  selected: number;
  onPick: (value: number) => void;
}) {
  const { colors } = useAppTheme();
  if (!amounts.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAmountsRow}>
      {amounts.map(v => {
        const active = selected === v;
        return (
          <PressableScale
            key={v}
            onPress={() => onPick(v)}
            style={[
              styles.quickAmount,
              {
                backgroundColor: active ? colors.primary : colors.surfaceMuted,
                borderColor: active ? colors.primary : colors.separator,
              },
            ]}
            hapticType="selection"
          >
            <Text style={[styles.quickAmountText, { color: active ? colors.labelOnPrimary : colors.label }]}>
              {v.toLocaleString('pt-PT')}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function ScannerCornerOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.scannerCornerWrap}>
        <View style={[styles.scannerCorner, styles.scannerCornerTL]} />
        <View style={[styles.scannerCorner, styles.scannerCornerTR]} />
        <View style={[styles.scannerCorner, styles.scannerCornerBL]} />
        <View style={[styles.scannerCorner, styles.scannerCornerBR]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
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
  heroHeader: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    ...typo.caption2,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    ...typo.largeTitle,
  },
  subtitle: {
    ...typo.body,
    marginTop: 2,
  },
  stepCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  customerCard: {
    paddingVertical: spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  customerNameWrap: { flex: 1 },
  customerName: {
    ...typo.headline,
  },
  customerSubline: {
    ...typo.footnote,
    marginTop: 2,
  },
  contentCard: {
    paddingVertical: spacing.lg,
  },
  cardTitle: {
    ...typo.title3,
  },
  cardSubtitle: {
    ...typo.footnote,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  formStack: {
    gap: spacing.md,
  },
  scanIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    marginTop: spacing.lg,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  amountSymbol: {
    ...typo.title3,
    fontFamily: 'Manrope_700Bold',
    paddingBottom: 14,
  },
  amountInput: {
    fontSize: 28,
    fontFamily: 'Manrope_800ExtraBold',
    paddingVertical: 12,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingRight: spacing.lg,
  },
  limitsHint: {
    ...typo.caption1,
    marginTop: spacing.sm,
  },
  totalHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalHighlightLabel: {
    ...typo.subheadline,
    fontFamily: 'Manrope_600SemiBold',
  },
  totalHighlightValue: {
    ...typo.title3,
    fontFamily: 'Manrope_800ExtraBold',
  },
  breakdownCaption: {
    ...typo.caption1,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  quickAmount: {
    minWidth: 74,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  quickAmountText: {
    ...typo.subheadline,
    fontFamily: 'Manrope_700Bold',
  },
  estimateBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  estimateLabel: {
    ...typo.subheadline,
  },
  estimateValue: {
    ...typo.headline,
    fontFamily: 'Manrope_800ExtraBold',
  },
  rowBtns: {
    flexDirection: 'row',
    // Voltar encostado à esquerda, avançar à direita — nunca colados.
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  backBtn: {
    flexGrow: 0,
    flexShrink: 0,
  },
  nextBtn: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 168,
  },
  walletBlock: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  walletLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLogo: {
    width: 32,
    height: 20,
  },
  walletHeaderText: { flex: 1 },
  walletTitle: {
    ...typo.subheadline,
    fontFamily: 'Manrope_800ExtraBold',
  },
  walletSubtitle: {
    ...typo.caption1,
    marginTop: 2,
  },
  walletField: {
    marginTop: 0,
  },
  walletInput: {
    fontFamily: 'Manrope_700Bold',
    fontSize: typo.title3.fontSize,
    letterSpacing: 1,
  },
  dialCode: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  dialCodeText: {
    ...typo.subheadline,
    fontFamily: 'Manrope_700Bold',
  },
  methodsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  methodTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  methodLogoWrap: {
    width: 76,
    height: 58,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  methodLogo: {
    width: 58,
    height: 48,
  },
  methodTileText: {
    ...typo.subheadline,
    marginTop: spacing.md,
    textAlign: 'center',
    width: '100%',
  },
  methodBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryTitle: {
    ...typo.headline,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.md,
  },
  summaryRowLabel: {
    ...typo.footnote,
  },
  summaryRowValue: {
    ...typo.subheadline,
    flexShrink: 1,
    textAlign: 'right',
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorPillText: {
    ...typo.footnote,
    flex: 1,
    fontFamily: 'Manrope_700Bold',
  },
  successCard: {
    alignItems: 'center',
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typo.title2,
    textAlign: 'center',
  },
  successText: {
    ...typo.body,
    textAlign: 'center',
    marginTop: 4,
  },
  tokenCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 1,
  },
  tokenLabel: {
    ...typo.caption1,
    fontFamily: 'Manrope_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  tokenValue: {
    fontSize: 22,
    fontFamily: 'JetBrainsMono-Bold',
    textAlign: 'center',
    width: '100%',
    letterSpacing: 1.5,
  },
  scannerRoot: {
    flex: 1,
    backgroundColor: '#06101F',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  scannerTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.3,
  },
  scannerSubtitle: {
    color: '#C9D5E8',
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    marginTop: 4,
  },
  scannerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerViewport: {
    flex: 1,
    marginHorizontal: spacing.md,
    borderRadius: radii.xxl,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  scannerFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  scannerHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  scannerCornerWrap: {
    position: 'absolute',
    top: '20%',
    left: '12%',
    right: '12%',
    bottom: '20%',
  },
  scannerCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
  },
  scannerCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  scannerCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  scannerCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  scannerCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  settingsBtn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  settingsBtnText: {
    ...typo.subheadline,
    fontFamily: 'Manrope_700Bold',
  },
});

export default RechargeScreen;
