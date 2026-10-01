import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import geolocation from '@react-native-community/geolocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedView from '../components/AnimatedView';
import IOSCard from '../components/IOSCard';
import IOSButton from '../components/IOSButton';
import Field from '../components/Field';
import PressableScale from '../components/PressableScale';
import SegmentedControl from '../components/SegmentedControl';
import type { AppLanguage } from '../navigation/types';
import { motion, radii, shadows, spacing, type as typo } from '../theme/tokens';
import { useAppTheme } from '../theme/useAppTheme';
import { haptic } from '../utils/haptics';
import { SUPPORT_PHONE_INTERNATIONAL } from '../config/contact';
import { mobileApi } from '../services/api';
import { saveMobileSession } from '../services/authSession';

type LoginScreenProps = {
  language: AppLanguage;
  onLogin: () => void;
  onGuest: () => void;
};

type LoginStep = 'credentials' | 'otp';
type GuestRequestKind = 'connection' | 'leak';
type ConnectionKind = 'individual' | 'comercial';

const copy = {
  pt: {
    title: 'Bem-vindo de volta',
    subtitle: 'Acesse com numero do contador e telefone para continuar.',
    meterLabel: 'Numero do contador',
    meterPlaceholder: '47XXXXXXXXXX',
    phoneLabel: 'Numero de telefone',
    phonePlaceholder: '84 XXX XXXX',
    error: 'Preencha numero do contador e telefone para continuar.',
    meterLengthError: 'O numero do contador deve ter 11 ou 13 digitos.',
    phoneLengthError: 'O numero de telefone deve ter 9 digitos.',
    login: 'Continuar',
    guest: 'Entrar como visitante',
    supportLink: 'Precisa de ajuda?',
    guestInfo: 'Como visitante voce pode comprar recargas, mas Meus Contadores fica desativado.',
    guestServicesTitle: 'Serviços sem conta',
    gasConnection: 'Requisitar ligação de gás',
    gasConnectionDesc: 'Peça uma nova ligação para casa ou negócio.',
    gasLeak: 'Reportar fuga de gás',
    gasLeakDesc: 'Envie uma ocorrência urgente com GPS.',
    guestRequestTitle: 'Pedido de visitante',
    connectionRequestTitle: 'Nova ligação de gás',
    leakRequestTitle: 'Reportar fuga de gás',
    bairroLabel: 'Bairro',
    bairroPlaceholder: 'Ex: Coop, Matola Gare, Polana...',
    connectionTypeLabel: 'Tipo de ligação',
    individual: 'Individual',
    comercial: 'Comercial',
    nameLabel: 'Nome completo',
    biLabel: 'Número do BI',
    nuitLabel: 'NUIT (opcional)',
    companyLabel: 'Nome da empresa',
    establishmentLabel: 'Tipo de estabelecimento',
    establishmentPlaceholder: 'Loja, restaurante, padaria...',
    connectionValidation: 'Preencha os dados do requerente, bairro, celular e recolha o GPS.',
    requestPhoneLabel: 'Número de celular',
    requestPhonePlaceholder: '84 XXX XXXX',
    locationLabel: 'Localização GPS',
    getLocation: 'Recolher localização',
    gettingLocation: 'A recolher GPS...',
    locationMissing: 'GPS ainda não recolhido.',
    locationCaptured: 'Localização recolhida com sucesso.',
    locationDenied: 'Permissão de localização negada.',
    leakDescriptionLabel: 'Detalhes da fuga',
    leakDescriptionPlaceholder: 'Ex: cheiro forte junto ao contador, rua, referência visual...',
    connectionDescriptionLabel: 'Referência do local',
    connectionDescriptionPlaceholder: 'Ex: perto da escola, portão azul, casa 12...',
    submitGuestRequest: 'Enviar pedido',
    cancel: 'Cancelar',
    requestValidation: 'Preencha bairro, celular e recolha a localização GPS.',
    requestSent: 'Pedido enviado com sucesso. A equipa ENH-KOGAS fará o acompanhamento.',
    otpTitle: 'Codigo de verificacao',
    otpSubtitle: 'Enviamos um codigo por SMS para',
    otpLabel: 'Codigo OTP',
    otpPlaceholder: '000000',
    otpError: 'Informe o codigo OTP de 6 digitos.',
    otpInvalid: 'Codigo OTP invalido. Tente novamente.',
    otpSubmit: 'Validar e entrar',
    otpResend: 'Reenviar codigo',
    otpBack: 'Alterar numero',
    otpSent: 'Codigo enviado para o numero de telefone.',
    otpDemoHint: 'Use o código recebido por SMS.',
    copyright: '© ENH-KOGAS',
    developedBy: 'Desenvolvido por MAPI',
  },
  en: {
    title: 'Welcome back',
    subtitle: 'Sign in with your meter number and phone to continue.',
    meterLabel: 'Meter number',
    meterPlaceholder: '47XXXXXXXXXX',
    phoneLabel: 'Phone number',
    phonePlaceholder: '84 XXX XXXX',
    error: 'Fill in meter number and phone number to continue.',
    meterLengthError: 'The meter number must have 11 or 13 digits.',
    phoneLengthError: 'The phone number must have 9 digits.',
    login: 'Continue',
    guest: 'Continue as guest',
    supportLink: 'Need help?',
    guestInfo: 'As a guest you can buy top ups, but My Meters access is disabled.',
    guestServicesTitle: 'Guest services',
    gasConnection: 'Request gas connection',
    gasConnectionDesc: 'Request a new connection for home or business.',
    gasLeak: 'Report gas leak',
    gasLeakDesc: 'Send an urgent report with GPS.',
    guestRequestTitle: 'Guest request',
    connectionRequestTitle: 'New gas connection',
    leakRequestTitle: 'Report gas leak',
    bairroLabel: 'Neighbourhood',
    bairroPlaceholder: 'Example: Coop, Matola Gare, Polana...',
    connectionTypeLabel: 'Connection type',
    individual: 'Individual',
    comercial: 'Commercial',
    nameLabel: 'Full name',
    biLabel: 'ID number',
    nuitLabel: 'NUIT (optional)',
    companyLabel: 'Company name',
    establishmentLabel: 'Establishment type',
    establishmentPlaceholder: 'Shop, restaurant, bakery...',
    connectionValidation: 'Fill in the applicant details, neighbourhood, mobile number and capture GPS.',
    requestPhoneLabel: 'Mobile number',
    requestPhonePlaceholder: '84 XXX XXXX',
    locationLabel: 'GPS location',
    getLocation: 'Capture location',
    gettingLocation: 'Fetching GPS...',
    locationMissing: 'GPS not captured yet.',
    locationCaptured: 'Location captured successfully.',
    locationDenied: 'Location permission denied.',
    leakDescriptionLabel: 'Leak details',
    leakDescriptionPlaceholder: 'Example: strong smell near meter, street, visual reference...',
    connectionDescriptionLabel: 'Place reference',
    connectionDescriptionPlaceholder: 'Example: near school, blue gate, house 12...',
    submitGuestRequest: 'Submit request',
    cancel: 'Cancel',
    requestValidation: 'Fill neighbourhood, mobile number and capture GPS location.',
    requestSent: 'Request submitted successfully. ENH-KOGAS will follow up.',
    otpTitle: 'Verification code',
    otpSubtitle: 'We sent a code by SMS to',
    otpLabel: 'OTP code',
    otpPlaceholder: '000000',
    otpError: 'Please enter the 6-digit OTP code.',
    otpInvalid: 'Invalid OTP code. Please try again.',
    otpSubmit: 'Verify and sign in',
    otpResend: 'Resend code',
    otpBack: 'Change number',
    otpSent: 'Code sent to the phone number.',
    otpDemoHint: 'Use the code received by SMS.',
    copyright: '© ENH-KOGAS',
    developedBy: 'Developed by MAPI',
  },
};

const MAPI_URL = 'https://mapi.co.mz/';

function maskPhoneNumber(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.length < 4) return trimmed;
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

export function LoginScreen({ language, onLogin, onGuest }: LoginScreenProps) {
  const { isDark, colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = copy[language];

  const [meterNumber, setMeterNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [guestRequestKind, setGuestRequestKind] = useState<GuestRequestKind>('connection');
  const [requestBairro, setRequestBairro] = useState('');
  const [requestPhone, setRequestPhone] = useState('');
  const [connectionType, setConnectionType] = useState<ConnectionKind>('individual');
  const [reqName, setReqName] = useState('');
  const [reqBi, setReqBi] = useState('');
  const [reqNuit, setReqNuit] = useState('');
  const [reqCompany, setReqCompany] = useState('');
  const [reqEstablishment, setReqEstablishment] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [gpsLocationLabel, setGpsLocationLabel] = useState('');
  const [isFetchingGps, setIsFetchingGps] = useState(false);

  const topPadding = Platform.OS === 'ios' ? Math.max(insets.top + 12, 28) : Math.max(36, Math.round(height * 0.08));
  const isOtpStep = loginStep === 'otp';

  // Logo float animation — gentle, subliminal
  const logoFloat = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(logoFloat, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [logoFloat]);

  const sendOtp = async () => {
    haptic('light');
    const meter = meterNumber.trim();
    const phone = phoneNumber.trim();
    if (!meter || !phone) {
      haptic('error');
      setError(t.error);
      return;
    }
    if (meter.length !== 11 && meter.length !== 13) {
      haptic('error');
      setError(t.meterLengthError);
      return;
    }
    if (phone.length !== 9) {
      haptic('error');
      setError(t.phoneLengthError);
      return;
    }
    try {
      setSubmitting(true);
      const result = await mobileApi.requestOtp({ meter_number: meter, phone });
      setFeedback(result.debug_code ? `${t.otpSent} Código teste: ${result.debug_code}` : t.otpSent);
      setError('');
      setOtpCode('');
      setLoginStep('otp');
    } catch (otpError) {
      haptic('error');
      setError(otpError instanceof Error ? otpError.message : String(otpError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = () => {
    const meter = meterNumber.trim();
    const phone = phoneNumber.trim();
    if (!meter || !phone) {
      haptic('error');
      setError(t.error);
      return;
    }
    sendOtp();
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.trim();
    if (code.length !== 6) {
      haptic('error');
      setError(t.otpError);
      return;
    }
    try {
      setSubmitting(true);
      const result = await mobileApi.verifyOtp({
        meter_number: meterNumber.trim(),
        phone: phoneNumber.trim(),
        code,
      });
      if (result.token) {
        await saveMobileSession(result.token);
      }
    } catch (otpError) {
      haptic('error');
      setError(otpError instanceof Error ? otpError.message : t.otpInvalid);
      return;
    } finally {
      setSubmitting(false);
    }
    haptic('success');
    setError('');
    setFeedback('');
    onLogin();
  };

  const handleBackToCredentials = () => {
    setLoginStep('credentials');
    setOtpCode('');
    setError('');
    setFeedback('');
  };

  const handleSupport = async () => {
    const phone = SUPPORT_PHONE_INTERNATIONAL;
    if (!phone) return;
    const appUrl = `whatsapp://send?phone=${phone}`;
    const webUrl = `https://wa.me/${phone}`;
    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpenApp ? appUrl : webUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  const openGuestRequest = (kind: GuestRequestKind) => {
    haptic('selection');
    setGuestRequestKind(kind);
    setRequestBairro('');
    setRequestPhone(phoneNumber.trim());
    setConnectionType('individual');
    setReqName('');
    setReqBi('');
    setReqNuit('');
    setReqCompany('');
    setReqEstablishment('');
    setRequestDescription('');
    setGpsLocationLabel('');
    setGuestModalVisible(true);
  };

  const closeGuestRequest = () => {
    setGuestModalVisible(false);
    setIsFetchingGps(false);
  };

  const requestLocationPermission = async () => {
    try {
      geolocation.requestAuthorization(
        () => undefined,
        () => Alert.alert(t.guestRequestTitle, t.locationDenied),
      );
      return true;
    } catch (permissionError) {
      Alert.alert(t.guestRequestTitle, String(permissionError));
      return false;
    }
  };

  const captureGpsLocation = async () => {
    try {
      const allowed = await requestLocationPermission();
      if (!allowed) return;
      setIsFetchingGps(true);
      geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setGpsLocationLabel(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setIsFetchingGps(false);
          haptic('success');
          Alert.alert(t.guestRequestTitle, t.locationCaptured);
        },
        locationError => {
          setIsFetchingGps(false);
          haptic('error');
          Alert.alert(t.guestRequestTitle, locationError.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (locationError) {
      setIsFetchingGps(false);
      Alert.alert(t.guestRequestTitle, String(locationError));
    }
  };

  const submitGuestRequest = async () => {
    if (!requestBairro.trim() || requestPhone.trim().length !== 9 || !gpsLocationLabel) {
      haptic('warning');
      Alert.alert(t.guestRequestTitle, t.requestValidation);
      return;
    }

    // Dados do requerente exigidos apenas no pedido de ligação (não na fuga).
    const isConnection = guestRequestKind === 'connection';
    if (isConnection) {
      const missing =
        connectionType === 'individual'
          ? !reqName.trim() || !reqBi.trim()
          : !reqCompany.trim() || !reqEstablishment.trim();
      if (missing) {
        haptic('warning');
        Alert.alert(t.guestRequestTitle, t.connectionValidation);
        return;
      }
    }

    const requesterName = isConnection
      ? connectionType === 'individual'
        ? reqName.trim()
        : reqCompany.trim()
      : '';

    const connectionMeta = isConnection
      ? {
          tipo_ligacao: connectionType,
          nuit: reqNuit.trim() || undefined,
          ...(connectionType === 'individual'
            ? { bi: reqBi.trim() }
            : { tipo_estabelecimento: reqEstablishment.trim() }),
        }
      : {};

    const [latitude, longitude] = gpsLocationLabel.split(',').map(value => value.trim());

    try {
      setSubmitting(true);
      await mobileApi.createGuestRequest({
        kind: guestRequestKind === 'leak' ? 'gas_leak' : 'connection',
        requester_name: requesterName,
        phone: requestPhone.trim(),
        bairro: requestBairro.trim(),
        description: requestDescription.trim(),
        latitude,
        longitude,
        metadata: {
          source: 'ENH-KOGAS-APP-MOBILE',
          ...connectionMeta,
        },
      });
      haptic('success');
      setGuestModalVisible(false);
      Alert.alert(t.guestRequestTitle, t.requestSent);
    } catch (requestError) {
      haptic('error');
      Alert.alert(t.guestRequestTitle, requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const logoTranslateY = logoFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: topPadding, minHeight: height - insets.top },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.frame}>
            {/* Brand mark — floats softly */}
            <Animated.View style={{ transform: [{ translateY: logoTranslateY }], alignItems: 'center' }}>
              <Image
                source={require('../assets/icons/enh-kogas.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <AnimatedView triggerKey={loginStep} translateY={20} duration={motion.durations.slow}>
              <IOSCard variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.title, { color: colors.label }]} numberOfLines={1} adjustsFontSizeToFit>
                    {isOtpStep ? t.otpTitle : t.title}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>
                    {isOtpStep ? `${t.otpSubtitle} ${maskPhoneNumber(phoneNumber)}` : t.subtitle}
                  </Text>
                </View>

                {!isOtpStep ? (
                  <View style={styles.formStack}>
                    <Field
                      label={t.meterLabel}
                      value={meterNumber}
                      onChangeText={setMeterNumber}
                      keyboardType="number-pad"
                      maxLength={13}
                      placeholder={t.meterPlaceholder}
                    />
                    <Field
                      label={t.phoneLabel}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      maxLength={9}
                      placeholder={t.phonePlaceholder}
                    />
                  </View>
                ) : (
                  <View style={styles.formStack}>
                    <View style={[styles.otpNoticeBox, { backgroundColor: colors.successSoftBg, borderColor: colors.success }]}>
                      <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                      <View style={styles.otpNoticeText}>
                        <Text style={[styles.otpNoticeTitle, { color: colors.success }]}>{feedback || t.otpSent}</Text>
                        <Text style={[styles.otpNoticeHint, { color: colors.labelSecondary }]}>{t.otpDemoHint}</Text>
                      </View>
                    </View>

                    <Field
                      label={t.otpLabel}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      monospace
                      inputStyle={styles.otpInput}
                    />
                  </View>
                )}

                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.errorSoftBg, borderColor: colors.error }]}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.actionStack}>
                  <IOSButton
                    title={isOtpStep ? t.otpSubmit : t.login}
                    onPress={isOtpStep ? handleVerifyOtp : handleLogin}
                    loading={isSubmitting}
                    variant="filled"
                    size="lg"
                    fullWidth
                    iconRight={isOtpStep ? 'check' : 'arrow-right'}
                  />

                  {isOtpStep ? (
                    <>
                      <IOSButton
                        title={t.otpResend}
                        onPress={sendOtp}
                        loading={isSubmitting}
                        variant="tinted"
                        size="md"
                        fullWidth
                        iconLeft="refresh"
                      />
                      <PressableScale
                        onPress={handleBackToCredentials}
                        style={styles.textActionWrap}
                        hapticType="selection"
                      >
                        <Text style={[styles.textAction, { color: colors.primary }]}>{t.otpBack}</Text>
                      </PressableScale>
                    </>
                  ) : (
                    <>
                      <IOSButton
                        title={t.guest}
                        onPress={onGuest}
                        variant="outline"
                        size="md"
                        fullWidth
                        iconLeft="account-off-outline"
                      />
                      <Text style={[styles.guestInfoText, { color: colors.labelTertiary }]}>{t.guestInfo}</Text>

                      <View style={styles.guestServicesBlock}>
                        <Text style={[styles.guestServicesTitle, { color: colors.labelSecondary }]}>
                          {t.guestServicesTitle.toUpperCase()}
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.guestServiceRow}
                        >
                          <GuestServiceButton
                            title={t.gasConnection}
                            description={t.gasConnectionDesc}
                            icon="home-plus-outline"
                            onPress={() => openGuestRequest('connection')}
                          />
                          <GuestServiceButton
                            title={t.gasLeak}
                            description={t.gasLeakDesc}
                            icon="alert"
                            destructive
                            onPress={() => openGuestRequest('leak')}
                          />
                        </ScrollView>
                      </View>
                    </>
                  )}
                </View>
              </IOSCard>
            </AnimatedView>

            <View style={styles.bottomControls}>
              <PressableScale
                onPress={handleSupport}
                style={[
                  styles.supportPill,
                  { backgroundColor: colors.surface, borderColor: colors.separator, ...shadows.card },
                ]}
                hapticType="selection"
              >
                <MaterialCommunityIcons name="whatsapp" size={16} color={colors.success} />
                <Text style={[styles.supportText, { color: colors.label }]}>{t.supportLink}</Text>
              </PressableScale>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.labelTertiary }]}>{t.copyright}</Text>
                <PressableScale onPress={() => Linking.openURL(MAPI_URL)} hapticType="selection">
                  <Text style={[styles.footerLink, { color: colors.primary }]}>{t.developedBy}</Text>
                </PressableScale>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={guestModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeGuestRequest}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.surface, borderColor: colors.separator },
                shadows.cardStrong as object,
              ]}
            >
              <View style={styles.modalHandleWrap}>
                <View style={[styles.modalHandle, { backgroundColor: colors.separatorStrong }]} />
              </View>

              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: guestRequestKind === 'leak' ? colors.errorSoftBg : colors.primarySoftBg }]}>
                  <MaterialCommunityIcons
                    name={guestRequestKind === 'leak' ? 'alert' : 'home-plus-outline'}
                    size={22}
                    color={guestRequestKind === 'leak' ? colors.error : colors.primarySoftFg}
                  />
                </View>
                <View style={styles.modalTitleWrap}>
                  <Text style={[styles.modalEyebrow, { color: colors.labelTertiary }]}>
                    {t.guestRequestTitle.toUpperCase()}
                  </Text>
                  <Text style={[styles.modalTitle, { color: colors.label }]}>
                    {guestRequestKind === 'leak' ? t.leakRequestTitle : t.connectionRequestTitle}
                  </Text>
                </View>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
              >
                <Field
                  label={t.bairroLabel}
                  value={requestBairro}
                  onChangeText={setRequestBairro}
                  placeholder={t.bairroPlaceholder}
                />
                <Field
                  label={t.requestPhoneLabel}
                  value={requestPhone}
                  onChangeText={setRequestPhone}
                  keyboardType="phone-pad"
                  maxLength={9}
                  placeholder={t.phonePlaceholder}
                />

                {guestRequestKind === 'connection' ? (
                  <>
                    <View style={styles.modalFieldGroup}>
                      <Text style={[styles.modalFieldLabel, { color: colors.labelSecondary }]}>
                        {t.connectionTypeLabel.toUpperCase()}
                      </Text>
                      <SegmentedControl
                        value={connectionType}
                        onChange={value => setConnectionType(value as ConnectionKind)}
                        items={[
                          { value: 'individual', label: t.individual, icon: 'account-outline' },
                          { value: 'comercial', label: t.comercial, icon: 'storefront-outline' },
                        ]}
                      />
                    </View>

                    {connectionType === 'individual' ? (
                      <>
                        <Field label={t.nameLabel} value={reqName} onChangeText={setReqName} />
                        <Field label={t.biLabel} value={reqBi} onChangeText={setReqBi} />
                        <Field
                          label={t.nuitLabel}
                          value={reqNuit}
                          onChangeText={setReqNuit}
                          keyboardType="number-pad"
                        />
                      </>
                    ) : (
                      <>
                        <Field label={t.companyLabel} value={reqCompany} onChangeText={setReqCompany} />
                        <Field
                          label={t.establishmentLabel}
                          value={reqEstablishment}
                          onChangeText={setReqEstablishment}
                          placeholder={t.establishmentPlaceholder}
                        />
                        <Field
                          label={t.nuitLabel}
                          value={reqNuit}
                          onChangeText={setReqNuit}
                          keyboardType="number-pad"
                        />
                      </>
                    )}
                  </>
                ) : null}

                <Field
                  label={guestRequestKind === 'leak' ? t.leakDescriptionLabel : t.connectionDescriptionLabel}
                  value={requestDescription}
                  onChangeText={setRequestDescription}
                  multiline
                  placeholder={
                    guestRequestKind === 'leak'
                      ? t.leakDescriptionPlaceholder
                      : t.connectionDescriptionPlaceholder
                  }
                  inputStyle={styles.descriptionInput}
                />

                <View style={styles.modalFieldGroup}>
                  <Text style={[styles.modalFieldLabel, { color: colors.labelSecondary }]}>
                    {t.locationLabel.toUpperCase()}
                  </Text>
                  <IOSButton
                    title={isFetchingGps ? t.gettingLocation : t.getLocation}
                    variant="tinted"
                    iconLeft="crosshairs-gps"
                    fullWidth
                    loading={isFetchingGps}
                    onPress={captureGpsLocation}
                  />
                  <View
                    style={[
                      styles.locationStatus,
                      { backgroundColor: gpsLocationLabel ? colors.successSoftBg : colors.surfaceMuted },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={gpsLocationLabel ? 'check-circle' : 'map-marker-question-outline'}
                      size={14}
                      color={gpsLocationLabel ? colors.success : colors.labelTertiary}
                    />
                    <Text
                      style={[
                        styles.locationStatusText,
                        { color: gpsLocationLabel ? colors.success : colors.labelSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {gpsLocationLabel || t.locationMissing}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <View style={styles.modalActionSecondary}>
                  <IOSButton
                    title={t.cancel}
                    variant="tinted"
                    fullWidth
                    iconLeft="close"
                    onPress={closeGuestRequest}
                  />
                </View>
                <View style={styles.modalActionPrimary}>
                  <IOSButton
                    title={t.submitGuestRequest}
                    variant="filled"
                    fullWidth
                    iconRight="send-check-outline"
                    onPress={submitGuestRequest}
                    loading={isSubmitting}
                    destructive={guestRequestKind === 'leak'}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function GuestServiceButton({
  title,
  description,
  icon,
  destructive = false,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <PressableScale
      onPress={onPress}
      hapticType="selection"
      style={[
        styles.guestServiceCard,
        {
          backgroundColor: destructive ? colors.errorSoftBg : colors.surfaceMuted,
          borderColor: destructive ? colors.error : colors.separator,
        },
      ]}
    >
      <View
        style={[
          styles.guestServiceIcon,
          { backgroundColor: destructive ? colors.errorSoftBg : colors.primarySoftBg },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={26} color={destructive ? colors.error : colors.primarySoftFg} />
      </View>
      <Text style={[styles.guestServiceTitle, { color: destructive ? colors.error : colors.label }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.guestServiceDesc, { color: colors.labelSecondary }]} numberOfLines={2}>
        {description}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  keyboardContainer: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  frame: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  logo: {
    width: '92%',
    height: 116,
    marginBottom: spacing.md,
  },
  card: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderRadius: radii.xxl,
  },
  cardHeader: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typo.title1,
    textAlign: 'center',
  },
  subtitle: {
    ...typo.body,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  formStack: {
    gap: spacing.md,
  },
  otpNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  otpNoticeText: { flex: 1 },
  otpNoticeTitle: {
    ...typo.subheadline,
    fontFamily: 'Manrope_700Bold',
  },
  otpNoticeHint: {
    ...typo.footnote,
    marginTop: 2,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 14,
    fontSize: 22,
    paddingVertical: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    ...typo.footnote,
    flex: 1,
    fontFamily: 'Manrope_700Bold',
  },
  actionStack: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  textActionWrap: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  textAction: {
    ...typo.subheadline,
    fontFamily: 'Manrope_700Bold',
  },
  guestInfoText: {
    ...typo.footnote,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  guestServicesBlock: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  guestServicesTitle: {
    ...typo.caption2,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  guestServiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 2,
    paddingRight: spacing.lg,
  },
  guestServiceCard: {
    width: 190,
    minHeight: 132,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 6,
    alignItems: 'center',
  },
  guestServiceIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  guestServiceTitle: {
    ...typo.subheadline,
    fontFamily: 'Manrope_800ExtraBold',
    textAlign: 'center',
  },
  guestServiceDesc: {
    ...typo.caption1,
    lineHeight: 17,
    textAlign: 'center',
  },
  bottomControls: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  supportPill: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  supportText: {
    ...typo.subheadline,
    fontFamily: 'Manrope_700Bold',
  },
  footer: {
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.sm,
  },
  footerText: {
    ...typo.caption2,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.3,
  },
  footerLink: {
    ...typo.caption1,
    fontFamily: 'Manrope_700Bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: radii.pill,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleWrap: { flex: 1 },
  modalEyebrow: {
    ...typo.caption2,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.8,
  },
  modalTitle: {
    ...typo.title3,
    marginTop: 2,
  },
  modalContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  modalFieldGroup: {
    gap: spacing.sm,
  },
  modalFieldLabel: {
    ...typo.caption2,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.7,
  },
  descriptionInput: {
    minHeight: 92,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationStatusText: {
    ...typo.footnote,
    flex: 1,
    fontFamily: 'Manrope_700Bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  modalActionSecondary: { flex: 1 },
  modalActionPrimary: { flex: 1.45 },
});

export default LoginScreen;
