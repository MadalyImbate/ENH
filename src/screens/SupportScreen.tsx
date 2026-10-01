import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary, type Asset } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedView from '../components/AnimatedView';
import IOSCard from '../components/IOSCard';
import IOSButton from '../components/IOSButton';
import Field from '../components/Field';
import SectionHeader from '../components/SectionHeader';
import SegmentedControl from '../components/SegmentedControl';
import PressableScale from '../components/PressableScale';
import type { AppLanguage } from '../navigation/types';
import { motion, radii, shadows, spacing, type as typo } from '../theme/tokens';
import { useAppTheme } from '../theme/useAppTheme';
import { haptic } from '../utils/haptics';
import {
  mobileApi,
  type MeterDetail,
  type MeterErrorEntry,
  type SupportTicket,
  type TicketAttachment,
  type TicketCategory,
  type TicketMessage,
  type TicketStatus,
} from '../services/api';

type SupportMode = 'ai' | 'human';
type Sender = 'user' | 'agent';
type SupportSection = 'menu' | 'chat' | 'ticket';

type ChatMessage = {
  id: string;
  sender: Sender;
  text: string;
  time: string;
  imageUrl?: string;
};

type GpsLocation = { lat: number; lon: number };

type SupportScreenProps = {
  language: AppLanguage;
};

const copy = {
  pt: {
    eyebrow: 'Apoio ao cliente',
    title: 'Suporte',
    subtitle: 'Escolha como deseja falar com a equipa de apoio.',
    chatTitle: 'Chat de suporte',
    chatDescription: 'Converse com IA ou com um agente.',
    ticketTitle: 'Os meus tickets',
    ticketDescription: 'Abrir um pedido e acompanhar respostas.',
    ticketBadgeOne: 'aberto',
    ticketBadgeMany: 'abertos',
    emergencyTitle: 'Reportar fuga de gás',
    helpTitle: 'Ajuda',
    errorCodesLink: 'Códigos de erro do contador',
    gasLeakTitle: 'Reportar fuga de gás',
    gasLeakDescription: 'Abra um ticket urgente para fuga de gás ou cheiro intenso.',
    gasLeakBadge: 'URGENTE',
    gasLeakPresetTitle: 'Fuga de gás reportada',
    gasLeakMeter: 'Selecionar contador',
    ticketMeter: 'Contador (opcional)',
    ticketNoMeters: 'Sem contadores associados à sua conta.',
    ticketPhoto: 'Foto (opcional)',
    ticketPhotoHint: 'Uma imagem ajuda a equipa a perceber o problema.',
    attachTitle: 'Anexar imagem',
    cancel: 'Cancelar',
    addPhoto: 'Adicionar foto',
    takePhoto: 'Tirar foto',
    choosePhoto: 'Escolher da galeria',
    removePhoto: 'Remover foto',
    photoError: 'Não foi possível obter a imagem.',
    attachmentTooLarge: 'A imagem é demasiado grande. Tente tirar outra foto.',
    cameraDenied: 'Permissão da câmara negada.',
    gasLeakLocation: 'Localização GPS',
    gasLeakUseLocation: 'Usar a minha localização',
    gasLeakLocationWaiting: 'A obter localização atual…',
    gasLeakLocationMissing: 'Localização não capturada.',
    gasLeakValidation: 'Para fuga de gás, selecione o contador e capture a localização GPS.',
    gasLeakGpsCaptured: 'Localização capturada com sucesso.',
    gasLeakNoMeters: 'Não há contadores associados à sua conta.',
    locationPermissionDenied: 'Permissão de localização negada.',
    ai: 'IA',
    human: 'ENH Kogas',
    send: 'Enviar',
    empty: 'Nenhuma mensagem ainda.',
    aiWelcome: 'Olá, sou o assistente IA. Como posso ajudar?',
    humanWelcome: 'Olá, suporte ENH Kogas aqui. Em que podemos ajudar?',
    aiReply: 'Recebi a sua mensagem. Posso orientar sobre recarga, contador e pagamentos.',
    humanReply: 'Mensagem recebida. Um agente ENH Kogas vai continuar o atendimento.',
    back: 'Voltar ao menu',
    ticketFormTitle: 'Novo ticket',
    ticketFormHint: 'Explique o problema com o máximo de detalhe.',
    openTicketModal: 'Abrir novo ticket',
    ticketSubject: 'Título',
    ticketMessage: 'Mensagem',
    submitTicket: 'Enviar ticket',
    recentTickets: 'Tickets recentes',
    recentTicketsSub: 'Toque para abrir a conversa',
    ticketReceived: 'Ticket criado com sucesso.',
    ticketValidation: 'Preencha o título e a mensagem antes de enviar.',
    ticketId: 'Ticket',
    openConversation: 'Abrir conversa',
    ticketConversationTitle: 'Conversa do ticket',
    replyPlaceholder: 'Escreva a sua resposta…',
    noTicketMessages: 'Sem respostas ainda.',
    replySent: 'Nova mensagem enviada para o ticket.',
    loadingTickets: 'A carregar os seus tickets…',
    loadingThread: 'A carregar a conversa…',
    ticketsError: 'Não foi possível carregar os tickets.',
    faqOneQ: 'Como acompanhar um ticket?',
    faqOneA: 'Depois do envio, o ticket fica listado nesta tela com o estado atual.',
    faqTwoQ: 'Qual é o tempo de resposta?',
    faqTwoA: 'A equipa responde normalmente em até 24 horas úteis.',
    faqThreeQ: 'Quando usar o chat?',
    faqThreeA: 'Use o chat para ajuda imediata e o ticket para casos que precisam de análise.',
    errorTableTitle: 'Códigos de erro do contador',
    errorTableSub: 'O que cada código significa e o que fazer.',
    needsTechnician: 'Precisa de técnico',
    selfService: 'Resolve-se pelo apoio',
    errorEmpty: 'Catálogo indisponível de momento.',
    errorCode: 'Código',
    errorDetail: 'Detalhe',
    close: 'Fechar',
    ticketClosedNotice: 'Este chamado está fechado. Não é possível enviar novas mensagens.',
    confirmTitle: 'O problema ficou resolvido?',
    confirmHint: 'A sua confirmação é o que permite ao atendimento fechar este chamado.',
    confirmCta: 'Confirmar resolução',
    confirmDone: 'Obrigado! Confirmação registada.',
    confirmError: 'Não foi possível registar a confirmação.',
    confirmedNotice: 'Resolução confirmada. O atendimento vai encerrar o chamado.',
    // Rótulos canónicos, iguais aos do backend, à app staff e à consola do IRS —
    // o cliente e o operador do IRS vêem exactamente o mesmo estado ao telefone.
    statusLabels: {
      open: 'Aberto',
      in_progress: 'Em atendimento',
      waiting_customer: 'Aguardar cliente',
      resolved: 'Resolvido',
      closed: 'Fechado',
      cancelled: 'Cancelado',
    } as Record<TicketStatus, string>,
    priorityLabels: {
      low: 'Baixa',
      normal: 'Normal',
      high: 'Alta',
      critical: 'Crítica',
    } as Record<string, string>,
  },
  en: {
    eyebrow: 'Customer support',
    title: 'Support',
    subtitle: 'Choose how you want to contact the support team.',
    chatTitle: 'Support chat',
    chatDescription: 'Talk to AI or to an agent.',
    ticketTitle: 'My tickets',
    ticketBadgeOne: 'open',
    ticketBadgeMany: 'open',
    emergencyTitle: 'Report a gas leak',
    helpTitle: 'Help',
    errorCodesLink: 'Meter error codes',
    ticketDescription: 'Open a request and follow the replies.',
    gasLeakTitle: 'Report gas leak',
    gasLeakDescription: 'Open an urgent ticket for a gas leak or strong smell.',
    gasLeakBadge: 'URGENT',
    gasLeakPresetTitle: 'Gas leak reported',
    gasLeakMeter: 'Select meter',
    ticketMeter: 'Meter (optional)',
    ticketNoMeters: 'No meters linked to your account.',
    ticketPhoto: 'Photo (optional)',
    ticketPhotoHint: 'An image helps the team understand the problem.',
    attachTitle: 'Attach image',
    cancel: 'Cancel',
    addPhoto: 'Add photo',
    takePhoto: 'Take photo',
    choosePhoto: 'Choose from gallery',
    removePhoto: 'Remove photo',
    photoError: 'Could not get the image.',
    attachmentTooLarge: 'The image is too large. Please take another photo.',
    cameraDenied: 'Camera permission denied.',
    gasLeakLocation: 'GPS location',
    gasLeakUseLocation: 'Use my location',
    gasLeakLocationWaiting: 'Fetching current location…',
    gasLeakLocationMissing: 'Location not captured.',
    gasLeakValidation: 'For a gas leak, select the meter and capture the GPS location.',
    gasLeakGpsCaptured: 'Location captured successfully.',
    gasLeakNoMeters: 'There are no meters linked to your account.',
    locationPermissionDenied: 'Location permission denied.',
    ai: 'AI',
    human: 'ENH Kogas',
    send: 'Send',
    empty: 'No messages yet.',
    aiWelcome: 'Hello, I am the AI assistant. How can I help?',
    humanWelcome: 'Hello, ENH Kogas support here. How can we help?',
    aiReply: 'Message received. I can help with top up, meter and payment guidance.',
    humanReply: 'Message received. An ENH Kogas agent will continue the support.',
    back: 'Back to menu',
    ticketFormTitle: 'New ticket',
    ticketFormHint: 'Explain the issue with as much detail as possible.',
    openTicketModal: 'Open new ticket',
    ticketSubject: 'Title',
    ticketMessage: 'Message',
    submitTicket: 'Submit ticket',
    recentTickets: 'Recent tickets',
    recentTicketsSub: 'Tap to open the conversation',
    ticketReceived: 'Ticket created successfully.',
    ticketValidation: 'Fill in the title and message before submitting.',
    ticketId: 'Ticket',
    openConversation: 'Open conversation',
    ticketConversationTitle: 'Ticket conversation',
    replyPlaceholder: 'Write your reply…',
    noTicketMessages: 'No replies yet.',
    replySent: 'New message sent to the ticket.',
    loadingTickets: 'Loading your tickets…',
    loadingThread: 'Loading conversation…',
    ticketsError: 'Could not load tickets.',
    faqOneQ: 'How do I track a ticket?',
    faqOneA: 'After sending it, the ticket is listed on this screen with the current status.',
    faqTwoQ: 'What is the response time?',
    faqTwoA: 'The team usually replies within 24 business hours.',
    faqThreeQ: 'When should I use chat?',
    faqThreeA: 'Use chat for immediate help and tickets for cases that need investigation.',
    errorTableTitle: 'Meter error codes',
    errorTableSub: 'What each code means and what to do.',
    needsTechnician: 'Needs a technician',
    selfService: 'Handled by support',
    errorEmpty: 'Catalogue unavailable right now.',
    errorCode: 'Code',
    errorDetail: 'Detail',
    close: 'Close',
    ticketClosedNotice: 'This ticket is closed. You can no longer send messages.',
    confirmTitle: 'Has your issue been solved?',
    confirmHint: 'Your confirmation is what lets the service desk close this ticket.',
    confirmCta: 'Confirm resolution',
    confirmDone: 'Thank you! Confirmation recorded.',
    confirmError: 'We could not record your confirmation.',
    confirmedNotice: 'Resolution confirmed. The service desk will close the ticket.',
    statusLabels: {
      open: 'Open',
      in_progress: 'In progress',
      waiting_customer: 'Awaiting customer',
      resolved: 'Resolved',
      closed: 'Closed',
      cancelled: 'Cancelled',
    } as Record<TicketStatus, string>,
    priorityLabels: {
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      critical: 'Critical',
    } as Record<string, string>,
  },
};

type Copy = (typeof copy)['pt'];

const statusTone: Record<TicketStatus, 'warning' | 'success' | 'muted'> = {
  open: 'warning',
  in_progress: 'warning',
  waiting_customer: 'warning',
  resolved: 'success',
  closed: 'muted',
  cancelled: 'muted',
};

/** Estados terminais: já não aceitam novas mensagens do cliente. */
const TERMINAL_STATUSES: TicketStatus[] = ['closed', 'cancelled'];

/** Estados em que faz sentido pedir ao cliente que confirme a resolução. */
const CONFIRMABLE_STATUSES: TicketStatus[] = ['in_progress', 'waiting_customer', 'resolved'];

/**
 * Opções de captura/seleção de foto: o image-picker redimensiona e recomprime
 * localmente ANTES de devolver o ficheiro, por isso o upload já vai pequeno
 * (evita o 413 "Payload Too Large" do servidor). 1280px no lado maior e
 * qualidade 0.6 mantêm o erro/contador legível com ~200–400 KB.
 */
const PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo',
  quality: 0.6,
  maxWidth: 1280,
  maxHeight: 1280,
} as const;

/** Rede de segurança: recusa localmente ficheiros ainda muito grandes. */
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3 MB

type ToneColors = ReturnType<typeof useAppTheme>['colors'];

/** Cor por severidade — antes todas as prioridades saíam verdes. */
function priorityTone(priority: MeterErrorEntry['priority'], colors: ToneColors) {
  switch (priority) {
    case 'critical':
      return { bg: colors.errorSoftBg, fg: colors.error };
    case 'high':
      return { bg: colors.warningSoftBg, fg: colors.warning };
    case 'low':
      return { bg: colors.surfaceMuted, fg: colors.labelSecondary };
    default:
      return { bg: colors.primarySoftBg, fg: colors.primarySoftFg };
  }
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function messageSenderLabel(sender: TicketMessage['sender']): Sender {
  return sender === 'customer' ? 'user' : 'agent';
}

export function SupportScreen({ language }: SupportScreenProps) {
  const t = copy[language];
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  // No iOS o `contentInsetAdjustmentBehavior="automatic"` do ScrollView já
  // desconta a safe area; no Android não há esse ajuste automático.
  const topOffset = Platform.OS === 'ios' ? spacing.sm : insets.top + spacing.sm;

  const [section, setSection] = useState<SupportSection>('menu');
  const [mode, setMode] = useState<SupportMode>('ai');
  const [input, setInput] = useState('');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketDetailVisible, setTicketDetailVisible] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('general');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketReply, setTicketReply] = useState('');
  const [selectedMeterNumber, setSelectedMeterNumber] = useState('');
  const [gpsLocation, setGpsLocation] = useState<GpsLocation | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [confirmingResolution, setConfirmingResolution] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [thread, setThread] = useState<TicketMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [attachment, setAttachment] = useState<TicketAttachment | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<TicketAttachment | null>(null);
  const [customerMeters, setCustomerMeters] = useState<MeterDetail[]>([]);
  const [meterErrors, setMeterErrors] = useState<MeterErrorEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', sender: 'agent', text: t.aiWelcome, time: nowTime() },
  ]);
  const chatScrollRef = useRef<ScrollView>(null);

  const quickFaq = useMemo(
    () => [
      { q: t.faqOneQ, a: t.faqOneA },
      { q: t.faqTwoQ, a: t.faqTwoA },
      { q: t.faqThreeQ, a: t.faqThreeA },
    ],
    [t],
  );
  const activeTicket = tickets.find(item => item.id === activeTicketId) ?? null;

  const loadTickets = useCallback(async () => {
    const rows = await mobileApi.customerTickets();
    setTickets(rows);
    setTicketsError('');
  }, []);

  useEffect(() => {
    let mounted = true;
    loadTickets()
      .catch(loadError => {
        if (mounted) setTicketsError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (mounted) setLoadingTickets(false);
      });
    mobileApi
      .customerMeters()
      .then(rows => mounted && setCustomerMeters(rows))
      .catch(() => undefined);
    mobileApi
      .meterErrors()
      .then(rows => mounted && setMeterErrors(rows))
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [loadTickets]);

  const switchMode = (nextMode: SupportMode) => {
    if (mode === nextMode) return;
    setMode(nextMode);
    setMessages([
      {
        id: `welcome-${nextMode}-${Date.now()}`,
        sender: 'agent',
        text: nextMode === 'ai' ? t.aiWelcome : t.humanWelcome,
        time: nowTime(),
      },
    ]);
    setInput('');
  };

  const send = () => {
    const text = input.trim();
    if (!text) {
      haptic('warning');
      return;
    }
    haptic('light');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, sender: 'user', text, time: nowTime() }]);
    setInput('');

    // Simulação local: não há endpoint de chat IA/agente no backend ainda.
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: mode === 'ai' ? t.aiReply : t.humanReply,
          time: nowTime(),
        },
      ]);
      haptic('selection');
      requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
    }, 480);
    requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
  };

  const requestLocationPermission = async () => {
    try {
      Geolocation.requestAuthorization(
        () => undefined,
        () => Alert.alert(t.title, t.locationPermissionDenied),
      );
      return true;
    } catch (error) {
      Alert.alert(t.title, String(error));
      return false;
    }
  };

  const captureGpsLocation = async () => {
    try {
      const allowed = await requestLocationPermission();
      if (!allowed) return;
      setIsFetchingGps(true);
      Geolocation.getCurrentPosition(
        position => {
          setGpsLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
          setIsFetchingGps(false);
          haptic('success');
          Alert.alert(t.title, t.gasLeakGpsCaptured);
        },
        error => {
          setIsFetchingGps(false);
          haptic('error');
          Alert.alert(t.title, error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (error) {
      setIsFetchingGps(false);
      Alert.alert(t.title, String(error));
    }
  };

  type AttachmentTarget = (value: TicketAttachment | null) => void;

  /** Converte o resultado do picker no formato que a API espera. */
  const applyAsset = (asset: Asset | undefined, target: AttachmentTarget) => {
    if (!asset?.uri) {
      Alert.alert(t.title, t.photoError);
      return;
    }
    // Já vem redimensionada/recomprimida; se ainda assim for grande, recusa
    // localmente com uma mensagem clara em vez de deixar o servidor devolver 413.
    if (asset.fileSize && asset.fileSize > MAX_ATTACHMENT_BYTES) {
      haptic('error');
      Alert.alert(t.title, t.attachmentTooLarge);
      return;
    }
    target({
      uri: asset.uri,
      fileName: asset.fileName || `ticket-${Date.now()}.jpg`,
      type: asset.type || 'image/jpeg',
    });
    haptic('success');
  };

  const takeTicketPhoto = async (target: AttachmentTarget = setAttachment) => {
    const result = await launchCamera(PHOTO_PICKER_OPTIONS);
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(t.title, result.errorMessage || t.photoError);
      return;
    }
    applyAsset(result.assets?.[0], target);
  };

  const pickTicketPhoto = async (target: AttachmentTarget = setAttachment) => {
    const result = await launchImageLibrary(PHOTO_PICKER_OPTIONS);
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(t.title, result.errorMessage || t.photoError);
      return;
    }
    applyAsset(result.assets?.[0], target);
  };

  /** Um só botão "+": pergunta a origem em vez de mostrar dois ícones. */
  const chooseAttachmentSource = (target: AttachmentTarget) => {
    haptic('selection');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t.takePhoto, t.choosePhoto, t.cancel],
          cancelButtonIndex: 2,
          title: t.attachTitle,
        },
        index => {
          if (index === 0) takeTicketPhoto(target).catch(() => undefined);
          if (index === 1) pickTicketPhoto(target).catch(() => undefined);
        },
      );
      return;
    }
    Alert.alert(t.attachTitle, undefined, [
      { text: t.takePhoto, onPress: () => takeTicketPhoto(target).catch(() => undefined) },
      { text: t.choosePhoto, onPress: () => pickTicketPhoto(target).catch(() => undefined) },
      { text: t.cancel, style: 'cancel' },
    ]);
  };

  const submitTicket = async () => {
    const cleanTitle = ticketTitle.trim();
    const cleanMessage = ticketMessage.trim();
    if (!cleanTitle || !cleanMessage) {
      haptic('warning');
      Alert.alert(t.title, t.ticketValidation);
      return;
    }
    if (ticketCategory === 'gas_leak' && (!selectedMeterNumber || !gpsLocation)) {
      haptic('warning');
      Alert.alert(t.title, t.gasLeakValidation);
      return;
    }
    try {
      setSubmittingTicket(true);
      await mobileApi.createTicket(
        {
          category: ticketCategory,
          priority: ticketCategory === 'gas_leak' ? 'critical' : 'normal',
          title: cleanTitle,
          message: cleanMessage,
          meter_number: selectedMeterNumber || undefined,
          latitude: gpsLocation ? String(gpsLocation.lat) : undefined,
          longitude: gpsLocation ? String(gpsLocation.lon) : undefined,
          metadata: { source: 'ENH-KOGAS-APP-MOBILE' },
        },
        attachment,
      );
      haptic('success');
      await loadTickets();
      setTicketTitle('');
      setTicketMessage('');
      setTicketCategory('general');
      setSelectedMeterNumber('');
      setGpsLocation(null);
      setAttachment(null);
      setTicketModalVisible(false);
      Alert.alert(t.title, t.ticketReceived);
    } catch (createError) {
      haptic('error');
      Alert.alert(t.title, createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSubmittingTicket(false);
    }
  };

  const openTicketConversation = (ticketId: number) => {
    haptic('light');
    setActiveTicketId(ticketId);
    setTicketReply('');
    setThread([]);
    setTicketDetailVisible(true);
    setLoadingThread(true);
    mobileApi
      .ticketMessages(ticketId)
      .then(rows => setThread(rows))
      .catch(() => undefined)
      .finally(() => setLoadingThread(false));
  };

  /**
   * Confirma a resolução. É esta confirmação que autoriza o IRS a fechar o
   * chamado — sem ela o servidor recusa o fecho.
   */
  const confirmResolution = async () => {
    if (!activeTicketId || confirmingResolution) {
      return;
    }
    try {
      setConfirmingResolution(true);
      const updated = await mobileApi.confirmTicket(activeTicketId);
      setTickets(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      haptic('success');
      Alert.alert(t.title, t.confirmDone);
    } catch (confirmError) {
      haptic('error');
      Alert.alert(t.title, confirmError instanceof Error ? confirmError.message : t.confirmError);
    } finally {
      setConfirmingResolution(false);
    }
  };

  const sendTicketReply = async () => {
    const text = ticketReply.trim();
    // Chamado terminado (fechado ou cancelado) não aceita novas mensagens.
    if (activeTicket && TERMINAL_STATUSES.includes(activeTicket.status)) {
      haptic('warning');
      return;
    }
    // Uma resposta só com foto é válida; vazia não.
    if (!activeTicketId || sendingReply || (!text && !replyAttachment)) {
      haptic('warning');
      return;
    }
    try {
      setSendingReply(true);
      const saved = await mobileApi.addTicketMessage(activeTicketId, text, 'customer', replyAttachment);
      setThread(prev => [...prev, saved]);
      setTicketReply('');
      setReplyAttachment(null);
      haptic('light');
    } catch (replyError) {
      haptic('error');
      Alert.alert(t.title, replyError instanceof Error ? replyError.message : String(replyError));
    } finally {
      setSendingReply(false);
    }
  };

  const openGasLeakTicket = () => {
    haptic('medium');
    setTicketCategory('gas_leak');
    setTicketTitle(t.gasLeakPresetTitle);
    setTicketMessage('');
    setSelectedMeterNumber('');
    setGpsLocation(null);
    setTicketModalVisible(true);
    requestLocationPermission();
  };

  const goToSection = (next: SupportSection) => {
    haptic('selection');
    setSection(next);
    if (next === 'ticket') loadTickets().catch(() => undefined);
  };

  const openTicketCount = tickets.filter(
    ticket =>
      ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'waiting_customer',
  ).length;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={chatScrollRef}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: section === 'chat' ? 152 + insets.bottom : 96 + insets.bottom },
        ]}
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
          <View style={styles.titleRow}>
            {section !== 'menu' ? (
              <PressableScale
                onPress={() => goToSection('menu')}
                hapticType="selection"
                accessibilityLabel={t.back}
              >
                <View style={[styles.backButton, { backgroundColor: colors.primarySoftBg }]}>
                  <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primarySoftFg} />
                </View>
              </PressableScale>
            ) : null}
            <Text style={[styles.title, { color: colors.label }]}>{t.title}</Text>
          </View>
          {section === 'menu' ? (
            <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>{t.subtitle}</Text>
          ) : null}
        </View>

        {section === 'menu' ? (
          <AnimatedView triggerKey="menu">
            <PressableScale onPress={openGasLeakTicket} hapticType="selection" style={styles.emergencyWrap}>
              <View
                style={[
                  styles.emergencyBanner,
                  { backgroundColor: colors.errorSoftBg, borderColor: colors.error, shadowColor: colors.error },
                ]}
              >
                <View style={[styles.emergencyIcon, { backgroundColor: colors.error }]}>
                  <MaterialCommunityIcons name="alert-octagon" size={22} color={colors.labelOnPrimary} />
                </View>
                <Text style={[styles.emergencyTitle, { color: colors.error }]}>{t.emergencyTitle}</Text>
                <View style={[styles.chevronPill, { backgroundColor: colors.error }]}>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={colors.labelOnPrimary} />
                </View>
              </View>
            </PressableScale>

            <View style={styles.menuGrid}>
              <MenuActionCard
                icon="chat-processing-outline"
                title={t.chatTitle}
                description={t.chatDescription}
                onPress={() => goToSection('chat')}
              />
              <MenuActionCard
                icon="ticket-confirmation-outline"
                title={t.ticketTitle}
                description={t.ticketDescription}
                onPress={() => goToSection('ticket')}
                badgeText={
                  openTicketCount > 0
                    ? `${openTicketCount} ${openTicketCount === 1 ? t.ticketBadgeOne : t.ticketBadgeMany}`
                    : undefined
                }
              />
            </View>

            <SectionHeader title={t.helpTitle} />
            <IOSCard variant="elevated" padded={false}>
              {quickFaq.map((item, idx) => {
                const open = expandedFaq === idx;
                return (
                  <PressableScale
                    key={item.q}
                    hapticType="selection"
                    scaleTo={0.995}
                    onPress={() => setExpandedFaq(open ? null : idx)}
                  >
                    <View
                      style={[
                        styles.faqItem,
                        {
                          borderTopColor: colors.separator,
                          borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={styles.faqText}>
                        <Text style={[styles.faqQuestion, { color: colors.label }]}>{item.q}</Text>
                        {open ? (
                          <Text style={[styles.faqAnswer, { color: colors.labelSecondary }]}>{item.a}</Text>
                        ) : null}
                      </View>
                      <MaterialCommunityIcons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.labelTertiary}
                      />
                    </View>
                  </PressableScale>
                );
              })}

              <PressableScale
                hapticType="selection"
                scaleTo={0.995}
                onPress={() => {
                  haptic('selection');
                  setErrorModalVisible(true);
                }}
              >
                <View
                  style={[
                    styles.faqItem,
                    { borderTopColor: colors.separator, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={styles.faqText}>
                    <Text style={[styles.faqQuestion, { color: colors.label }]}>{t.errorCodesLink}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.labelTertiary} />
                </View>
              </PressableScale>
            </IOSCard>
          </AnimatedView>
        ) : null}

        {section === 'chat' ? (
          <AnimatedView triggerKey="chat">
            <SectionHeader title={t.chatTitle} subtitle={t.chatDescription} />
            <IOSCard variant="elevated" style={styles.chatHeaderCard}>
              <SegmentedControl
                items={[
                  { value: 'ai', label: t.ai, icon: 'robot-outline' },
                  { value: 'human', label: t.human, icon: 'face-agent' },
                ]}
                value={mode}
                onChange={v => switchMode(v as SupportMode)}
              />
            </IOSCard>

            {messages.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.labelTertiary }]}>{t.empty}</Text>
            ) : (
              <View style={styles.messagesGroup}>
                {messages.map(msg => (
                  <ChatBubble key={msg.id} msg={msg} />
                ))}
              </View>
            )}
          </AnimatedView>
        ) : null}

        {section === 'ticket' ? (
          <AnimatedView triggerKey="ticket">
            <SectionHeader title={t.recentTickets} subtitle={t.recentTicketsSub} />
            <View style={styles.openTicketBtnWrap}>
              <IOSButton
                title={t.openTicketModal}
                variant="filled"
                iconLeft="plus"
                fullWidth
                size="lg"
                onPress={() => {
                  haptic('medium');
                  setTicketCategory('general');
                  setTicketTitle('');
                  setTicketMessage('');
                  setSelectedMeterNumber('');
                  setGpsLocation(null);
                  setTicketModalVisible(true);
                }}
              />
            </View>

            {loadingTickets ? (
              <IOSCard variant="inset">
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="progress-clock" size={26} color={colors.labelTertiary} />
                  <Text style={[styles.emptyStateText, { color: colors.labelSecondary }]}>
                    {t.loadingTickets}
                  </Text>
                </View>
              </IOSCard>
            ) : ticketsError ? (
              <IOSCard variant="inset">
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.error} />
                  <Text style={[styles.emptyStateText, { color: colors.error }]}>{t.ticketsError}</Text>
                </View>
              </IOSCard>
            ) : tickets.length === 0 ? (
              <IOSCard variant="inset">
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="inbox-outline" size={28} color={colors.labelTertiary} />
                  <Text style={[styles.emptyStateText, { color: colors.labelSecondary }]}>{t.empty}</Text>
                </View>
              </IOSCard>
            ) : (
              <View style={styles.ticketGroup}>
                {tickets.map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    t={t}
                    onOpen={() => openTicketConversation(ticket.id)}
                  />
                ))}
              </View>
            )}
          </AnimatedView>
        ) : null}
      </ScrollView>

      {/* Catálogo de códigos de erro do contador */}
      <Modal
        visible={errorModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.separator },
              shadows.cardStrong,
            ]}
          >
            <View style={styles.modalHandleWrap}>
              <View style={[styles.modalHandle, { backgroundColor: colors.separatorStrong }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.label }]}>{t.errorTableTitle}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.labelSecondary }]}>{t.errorTableSub}</Text>

            <ScrollView style={styles.modalScroll}>
              {meterErrors.length === 0 ? (
                <Text style={[styles.emptyAttachmentText, { color: colors.labelTertiary }]}>
                  {t.errorEmpty}
                </Text>
              ) : null}
              {meterErrors.map((item, idx) => {
                const tone = priorityTone(item.priority, colors);
                return (
                  <View
                    key={`modal-${item.code}`}
                    style={[
                      styles.errorRow,
                      {
                        borderTopColor: colors.separator,
                        borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={[styles.errorSeverityBar, { backgroundColor: tone.fg }]} />
                    <View style={styles.errorBody}>
                      <View style={styles.errorTopRow}>
                        <View
                          style={[
                            styles.errorCodePill,
                            { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
                          ]}
                        >
                          <Text style={[styles.errorCode, { color: colors.label }]}>{item.code}</Text>
                        </View>
                        <View style={[styles.priorityPill, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.priorityPillText, { color: tone.fg }]}>
                            {t.priorityLabels[item.priority] ?? item.priority}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.errorDetail, { color: colors.label }]}>{item.title}</Text>
                      <View style={styles.errorActionRow}>
                        <MaterialCommunityIcons
                          name={item.requires_technician ? 'account-hard-hat' : 'headset'}
                          size={14}
                          color={colors.labelTertiary}
                        />
                        <Text style={[styles.errorActionText, { color: colors.labelTertiary }]}>
                          {item.requires_technician ? t.needsTechnician : t.selfService}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <IOSButton
                title={t.close}
                variant="filled"
                fullWidth
                onPress={() => {
                  haptic('selection');
                  setErrorModalVisible(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Novo ticket */}
      <Modal
        visible={ticketModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.separator },
              shadows.cardStrong,
            ]}
          >
            <View style={styles.modalHandleWrap}>
              <View style={[styles.modalHandle, { backgroundColor: colors.separatorStrong }]} />
            </View>

            <View style={styles.modalTitleRow}>
              <View style={styles.modalTitleText}>
                <Text style={[styles.modalTitle, { color: colors.label }]}>{t.ticketFormTitle}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.labelSecondary }]}>
                  {t.ticketFormHint}
                </Text>
              </View>
              {ticketCategory === 'gas_leak' ? (
                <View style={[styles.urgentBadge, { backgroundColor: colors.errorSoftBg }]}>
                  <MaterialCommunityIcons name="alert" size={12} color={colors.error} />
                  <Text style={[styles.urgentBadgeText, { color: colors.error }]}>{t.gasLeakBadge}</Text>
                </View>
              ) : null}
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.labelSecondary }]}>
                  {(ticketCategory === 'gas_leak' ? t.gasLeakMeter : t.ticketMeter).toUpperCase()}
                </Text>
                {customerMeters.length === 0 ? (
                  <Text style={[styles.emptyAttachmentText, { color: colors.labelTertiary }]}>
                    {t.ticketNoMeters}
                  </Text>
                ) : (
                  <View style={styles.meterChipsWrap}>
                    {customerMeters.map(meter => {
                      const selected = selectedMeterNumber === meter.numero_do_contador;
                      return (
                        <PressableScale
                          key={meter.numero_do_contador}
                          onPress={() => {
                            haptic('selection');
                            setSelectedMeterNumber(meter.numero_do_contador);
                          }}
                          hapticType="none"
                        >
                          <View
                            style={[
                              styles.meterChip,
                              {
                                backgroundColor: selected ? colors.primarySoftBg : colors.surfaceMuted,
                                borderColor: selected ? colors.primary : colors.separator,
                              },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="counter"
                              size={14}
                              color={selected ? colors.primarySoftFg : colors.labelSecondary}
                            />
                            <Text
                              style={[
                                styles.meterChipText,
                                { color: selected ? colors.primarySoftFg : colors.label },
                              ]}
                            >
                              {meter.numero_do_contador}
                            </Text>
                          </View>
                        </PressableScale>
                      );
                    })}
                  </View>
                )}
              </View>

              <Field
                label={t.ticketSubject}
                value={ticketTitle}
                onChangeText={setTicketTitle}
                containerStyle={styles.formGroup}
              />

              <Field
                label={t.ticketMessage}
                value={ticketMessage}
                onChangeText={setTicketMessage}
                multiline
                inputStyle={styles.messageInput}
                containerStyle={styles.formGroup}
              />

              <View style={styles.formGroup}>
                <Text style={[styles.fieldLabel, { color: colors.labelSecondary }]}>
                  {t.ticketPhoto.toUpperCase()}
                </Text>
                {attachment ? (
                  <View
                    style={[
                      styles.attachmentPreview,
                      { borderColor: colors.separator, backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <Image source={{ uri: attachment.uri }} style={styles.attachmentThumb} resizeMode="cover" />
                    <View style={styles.attachmentInfo}>
                      <Text style={[styles.attachmentName, { color: colors.label }]} numberOfLines={1}>
                        {attachment.fileName}
                      </Text>
                      <PressableScale
                        hapticType="selection"
                        onPress={() => {
                          haptic('light');
                          setAttachment(null);
                        }}
                      >
                        <Text style={[styles.attachmentRemove, { color: colors.error }]}>{t.removePhoto}</Text>
                      </PressableScale>
                    </View>
                  </View>
                ) : (
                  <>
                    <IOSButton
                      title={t.addPhoto}
                      variant="tinted"
                      iconLeft="plus"
                      fullWidth
                      onPress={() => chooseAttachmentSource(setAttachment)}
                    />
                    <Text style={[styles.attachmentHint, { color: colors.labelTertiary }]}>
                      {t.ticketPhotoHint}
                    </Text>
                  </>
                )}
              </View>

              {ticketCategory === 'gas_leak' ? (
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.labelSecondary }]}>
                    {t.gasLeakLocation.toUpperCase()}
                  </Text>
                  <IOSButton
                    title={isFetchingGps ? t.gasLeakLocationWaiting : t.gasLeakUseLocation}
                    variant="tinted"
                    iconLeft="crosshairs-gps"
                    fullWidth
                    loading={isFetchingGps}
                    onPress={captureGpsLocation}
                  />
                  <View
                    style={[
                      styles.locationStatus,
                      { backgroundColor: gpsLocation ? colors.successSoftBg : colors.surfaceMuted },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={gpsLocation ? 'check-circle' : 'map-marker-question-outline'}
                      size={14}
                      color={gpsLocation ? colors.success : colors.labelTertiary}
                    />
                    <Text
                      style={[
                        styles.locationStatusText,
                        { color: gpsLocation ? colors.success : colors.labelSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {gpsLocation
                        ? `${gpsLocation.lat.toFixed(6)}, ${gpsLocation.lon.toFixed(6)}`
                        : t.gasLeakLocationMissing}
                    </Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <View style={styles.modalActionFlex}>
                <IOSButton
                  title={t.close}
                  variant="tinted"
                  fullWidth
                  hapticType="selection"
                  onPress={() => setTicketModalVisible(false)}
                />
              </View>
              <View style={styles.modalActionGap} />
              <View style={styles.modalActionFlex}>
                <IOSButton
                  title={t.submitTicket}
                  variant="filled"
                  fullWidth
                  iconLeft="send"
                  loading={submittingTicket}
                  onPress={submitTicket}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Conversa do ticket */}
      <Modal
        visible={ticketDetailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTicketDetailVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={[
              styles.modalCard,
              styles.ticketDetailCard,
              { backgroundColor: colors.surface, borderColor: colors.separator },
              shadows.cardStrong,
            ]}
          >
            <View style={styles.modalHandleWrap}>
              <View style={[styles.modalHandle, { backgroundColor: colors.separatorStrong }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.label }]}>{t.ticketConversationTitle}</Text>

            {activeTicket ? (
              <>
                <Text style={[styles.modalSubtitle, { color: colors.labelSecondary }]}>
                  {t.ticketId} #{activeTicket.id} · {activeTicket.title}
                </Text>
                <View style={styles.ticketDetailMetaRow}>
                  {activeTicket.meter_display ? (
                    <View style={[styles.metaPill, { backgroundColor: colors.primarySoftBg }]}>
                      <MaterialCommunityIcons name="counter" size={12} color={colors.primarySoftFg} />
                      <Text style={[styles.metaPillText, { color: colors.primarySoftFg }]}>
                        {activeTicket.meter_display}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.metaPill, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[styles.metaPillText, { color: colors.label }]}>
                      {t.statusLabels[activeTicket.status]}
                    </Text>
                  </View>
                </View>

                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.ticketThreadContent}>
                  {loadingThread ? (
                    <Text style={[styles.emptyAttachmentText, { color: colors.labelTertiary }]}>
                      {t.loadingThread}
                    </Text>
                  ) : (
                    <>
                      <ChatBubble
                        msg={{ id: 'origin', sender: 'user', text: activeTicket.message, time: '' }}
                      />
                      {thread.length === 0 ? (
                        <Text style={[styles.emptyAttachmentText, { color: colors.labelTertiary }]}>
                          {t.noTicketMessages}
                        </Text>
                      ) : (
                        thread.map(msg => (
                          <ChatBubble
                            key={msg.id}
                            msg={{
                              id: String(msg.id),
                              sender: messageSenderLabel(msg.sender),
                              text: msg.message,
                              imageUrl: msg.attachment_url ?? undefined,
                              time: new Date(msg.created_at).toLocaleTimeString(
                                language === 'pt' ? 'pt-PT' : 'en-US',
                                { hour: '2-digit', minute: '2-digit' },
                              ),
                            }}
                          />
                        ))
                      )}
                    </>
                  )}
                </ScrollView>

                {activeTicket.is_confirmed ? (
                  <View
                    style={[
                      styles.ticketClosedNote,
                      { backgroundColor: colors.successSoftBg, borderColor: colors.separator },
                    ]}
                  >
                    <MaterialCommunityIcons name="check-decagram" size={16} color={colors.labelSecondary} />
                    <Text style={[styles.ticketClosedNoteText, { color: colors.labelSecondary }]}>
                      {t.confirmedNotice}
                    </Text>
                  </View>
                ) : CONFIRMABLE_STATUSES.includes(activeTicket.status) ? (
                  <View
                    style={[
                      styles.confirmBand,
                      { backgroundColor: colors.primarySoftBg, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.confirmBandTitle, { color: colors.label }]}>{t.confirmTitle}</Text>
                    <Text style={[styles.confirmBandHint, { color: colors.labelSecondary }]}>
                      {t.confirmHint}
                    </Text>
                    <IOSButton
                      title={t.confirmCta}
                      variant="filled"
                      iconLeft="check-circle-outline"
                      fullWidth
                      loading={confirmingResolution}
                      onPress={confirmResolution}
                    />
                  </View>
                ) : null}

                {TERMINAL_STATUSES.includes(activeTicket.status) ? (
                  <View
                    style={[
                      styles.ticketClosedNote,
                      { backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
                    ]}
                  >
                    <MaterialCommunityIcons name="lock-outline" size={16} color={colors.labelSecondary} />
                    <Text style={[styles.ticketClosedNoteText, { color: colors.labelSecondary }]}>
                      {t.ticketClosedNotice}
                    </Text>
                  </View>
                ) : (
                  <>
                    {replyAttachment ? (
                      <View
                        style={[
                          styles.replyAttachment,
                          { borderColor: colors.separator, backgroundColor: colors.surfaceMuted },
                        ]}
                      >
                        <Image
                          source={{ uri: replyAttachment.uri }}
                          style={styles.replyThumb}
                          resizeMode="cover"
                        />
                        <Text style={[styles.attachmentName, { color: colors.label }]} numberOfLines={1}>
                          {replyAttachment.fileName}
                        </Text>
                        <PressableScale hapticType="selection" onPress={() => setReplyAttachment(null)}>
                          <MaterialCommunityIcons name="close-circle" size={22} color={colors.labelTertiary} />
                        </PressableScale>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.replyComposer,
                        { backgroundColor: colors.surface, borderColor: colors.primary },
                      ]}
                    >
                      <PressableScale
                        hapticType="selection"
                        onPress={() => chooseAttachmentSource(setReplyAttachment)}
                        accessibilityLabel={t.attachTitle}
                      >
                        <View style={[styles.replyIconBtn, { backgroundColor: colors.primarySoftBg }]}>
                          <MaterialCommunityIcons name="plus" size={22} color={colors.primarySoftFg} />
                        </View>
                      </PressableScale>
                      <TextInput
                        value={ticketReply}
                        onChangeText={setTicketReply}
                        placeholder={t.replyPlaceholder}
                        placeholderTextColor={colors.labelTertiary}
                        multiline
                        style={[styles.ticketReplyInput, { color: colors.label }]}
                      />
                    </View>
                  </>
                )}

                <View style={styles.modalActions}>
                  <View style={styles.modalActionFlex}>
                    <IOSButton
                      title={t.close}
                      variant="tinted"
                      fullWidth
                      hapticType="selection"
                      onPress={() => setTicketDetailVisible(false)}
                    />
                  </View>
                  {TERMINAL_STATUSES.includes(activeTicket.status) ? null : (
                    <>
                      <View style={styles.modalActionGap} />
                      <View style={styles.modalActionFlex}>
                        <IOSButton
                          title={t.send}
                          variant="filled"
                          iconLeft="send"
                          fullWidth
                          loading={sendingReply}
                          onPress={sendTicketReply}
                        />
                      </View>
                    </>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {section === 'chat' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.composerWrap, { bottom: 68 + insets.bottom }]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.composer,
              { backgroundColor: colors.surface, borderColor: colors.separator },
              shadows.cardStrong,
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholderTextColor={colors.labelTertiary}
              style={[
                styles.composerInput,
                { color: colors.label, backgroundColor: colors.surfaceMuted, borderColor: colors.separator },
              ]}
              multiline
            />
            <PressableScale onPress={send} hapticType="medium" style={styles.composerSendWrap}>
              <View style={[styles.composerSend, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="send" size={18} color={colors.labelOnPrimary} />
              </View>
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </SafeAreaView>
  );
}

/* ----------------------------- Sub-components ---------------------------- */

type MenuActionCardProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  emphasis?: boolean;
  badgeText?: string;
};

function MenuActionCard({ icon, title, description, onPress, emphasis, badgeText }: MenuActionCardProps) {
  const { colors } = useAppTheme();
  return (
    <PressableScale onPress={onPress} hapticType="selection" style={styles.menuCardWrap}>
      <IOSCard variant="elevated">
        <View style={styles.menuCardRow}>
          <View
            style={[
              styles.menuCardIcon,
              { backgroundColor: emphasis ? colors.errorSoftBg : colors.primarySoftBg },
            ]}
          >
            <MaterialCommunityIcons
              name={icon}
              size={24}
              color={emphasis ? colors.error : colors.primarySoftFg}
            />
          </View>
          <View style={styles.menuCardText}>
            <View style={styles.menuTitleRow}>
              <Text style={[styles.menuCardTitle, { color: colors.label }]}>{title}</Text>
              {badgeText ? (
                <View style={[styles.menuBadge, { backgroundColor: colors.errorSoftBg }]}>
                  <Text style={[styles.menuBadgeText, { color: colors.error }]}>{badgeText}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.menuCardDescription, { color: colors.labelSecondary }]}>{description}</Text>
          </View>
          <View
            style={[
              styles.chevronPill,
              { backgroundColor: emphasis ? colors.errorSoftBg : colors.primarySoftBg },
            ]}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={emphasis ? colors.error : colors.primarySoftFg}
            />
          </View>
        </View>
      </IOSCard>
    </PressableScale>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const { colors } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.durations.base, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 160, friction: 18, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  const isUser = msg.sender === 'user';
  return (
    <Animated.View
      style={[
        styles.bubble,
        isUser
          ? [styles.userBubble, { backgroundColor: colors.primary }]
          : [
              styles.agentBubble,
              { backgroundColor: colors.surface, borderLeftColor: colors.primary, shadowColor: colors.primary },
            ],
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {!isUser ? <Text style={[styles.agentTag, { color: colors.primary }]}>ENH KOGAS</Text> : null}
      {msg.imageUrl ? (
        <Image source={{ uri: msg.imageUrl }} style={styles.bubbleImage} resizeMode="cover" />
      ) : null}
      {msg.text ? (
        <Text style={[styles.bubbleText, { color: isUser ? colors.labelOnPrimary : colors.label }]}>
          {msg.text}
        </Text>
      ) : null}
      {msg.time ? (
        <Text style={[styles.timeText, isUser ? styles.timeTextOnPrimary : { color: colors.labelTertiary }]}>
          {msg.time}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function TicketCard({ ticket, t, onOpen }: { ticket: SupportTicket; t: Copy; onOpen: () => void }) {
  const { colors } = useAppTheme();
  const isUrgent = ticket.category === 'gas_leak';
  const tone = statusTone[ticket.status];
  const toneColor =
    tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.labelTertiary;
  const toneBg =
    tone === 'success' ? colors.successSoftBg : tone === 'warning' ? colors.warningSoftBg : colors.surfaceMuted;

  return (
    <PressableScale onPress={onOpen} hapticType="selection">
      <IOSCard variant="elevated">
        <View style={styles.ticketHeader}>
          <View style={styles.ticketHeaderLeft}>
            <View
              style={[
                styles.ticketIcon,
                { backgroundColor: isUrgent ? colors.errorSoftBg : colors.primarySoftBg },
              ]}
            >
              <MaterialCommunityIcons
                name={isUrgent ? 'alert' : 'ticket-confirmation-outline'}
                size={16}
                color={isUrgent ? colors.error : colors.primarySoftFg}
              />
            </View>
            <View>
              <Text style={[styles.ticketIdText, { color: colors.labelTertiary }]}>
                {t.ticketId} #{ticket.id}
              </Text>
              <Text style={[styles.ticketTime, { color: colors.labelTertiary }]}>
                {new Date(ticket.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={[styles.ticketStatusPill, { backgroundColor: toneBg }]}>
            <View style={[styles.ticketStatusDot, { backgroundColor: toneColor }]} />
            <Text style={[styles.ticketStatusText, { color: toneColor }]}>
              {t.statusLabels[ticket.status]}
            </Text>
          </View>
        </View>

        <Text style={[styles.ticketTitleText, { color: colors.label }]} numberOfLines={1}>
          {ticket.title}
        </Text>
        <Text style={[styles.ticketMessageText, { color: colors.labelSecondary }]} numberOfLines={2}>
          {ticket.message}
        </Text>

        <View style={styles.ticketFooter}>
          {ticket.meter_display ? (
            <View style={styles.ticketMetaRow}>
              <MaterialCommunityIcons name="counter" size={13} color={colors.labelTertiary} />
              <Text style={[styles.ticketMetaText, { color: colors.labelTertiary }]}>
                {ticket.meter_display}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.ticketOpenLinkRow}>
            <Text style={[styles.ticketOpenLink, { color: colors.primary }]}>{t.openConversation}</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color={colors.primary} />
          </View>
        </View>
      </IOSCard>
    </PressableScale>
  );
}

/* --------------------------------- Styles -------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
  },
  hero: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    // Só a seta: alvo de toque circular de 44pt, o mínimo recomendado no iOS.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  menuGrid: {
    gap: spacing.md,
  },
  menuCardWrap: {},
  menuCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuCardIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCardText: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  menuCardTitle: {
    fontSize: typo.headline.fontSize,
    lineHeight: typo.headline.lineHeight,
    fontFamily: typo.headline.fontFamily,
  },
  menuCardDescription: {
    marginTop: 4,
    fontSize: typo.footnote.fontSize,
    lineHeight: typo.footnote.lineHeight,
    fontFamily: typo.footnote.fontFamily,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  menuBadgeText: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.6,
  },
  attachmentHint: {
    marginTop: spacing.sm,
    ...typo.caption1,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  attachmentThumb: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
  },
  attachmentInfo: {
    flex: 1,
    gap: 4,
  },
  attachmentName: {
    ...typo.footnote,
    fontFamily: 'Manrope_700Bold',
  },
  attachmentRemove: {
    ...typo.footnote,
    fontFamily: 'Manrope_700Bold',
  },
  emergencyWrap: {
    marginBottom: spacing.md,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    // Elevação com a própria cor de alerta — destaca-se do resto dos cartões.
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emergencyIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronPill: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    flex: 1,
    ...typo.headline,
    fontFamily: 'Manrope_800ExtraBold',
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  faqText: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: typo.callout.fontSize,
    lineHeight: typo.callout.lineHeight,
    fontFamily: 'Manrope_700Bold',
  },
  faqAnswer: {
    marginTop: 4,
    fontSize: typo.footnote.fontSize,
    lineHeight: typo.footnote.lineHeight,
    fontFamily: typo.footnote.fontFamily,
  },
  errorRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  errorSeverityBar: {
    width: 3,
    borderRadius: radii.pill,
    alignSelf: 'stretch',
  },
  errorBody: {
    flex: 1,
    gap: 6,
  },
  errorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  errorCodePill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  // Sem largura fixa: códigos longos (PAYMENT_DUPLICATE) partiam em 3 linhas.
  errorCode: {
    fontSize: typo.footnote.fontSize,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 0.4,
  },
  errorDetail: {
    ...typo.callout,
    fontFamily: 'Manrope_700Bold',
  },
  errorActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  errorActionText: {
    ...typo.caption1,
  },
  priorityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  priorityPillText: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  chatHeaderCard: {
    marginBottom: spacing.md,
  },
  messagesGroup: {
    gap: spacing.sm,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxWidth: '86%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  // A bolha da ENH Kogas era um cartão branco com risco de meio pixel,
  // indistinguível do fundo. Ganha elevação e um filete de marca à esquerda.
  agentBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    borderLeftWidth: 3,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  agentTag: {
    ...typo.caption2,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  bubbleText: {
    fontSize: typo.callout.fontSize,
    lineHeight: typo.callout.lineHeight,
    fontFamily: typo.callout.fontFamily,
  },
  timeText: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'right',
    letterSpacing: 0.2,
  },
  timeTextOnPrimary: { color: 'rgba(255,255,255,0.75)' },
  emptyText: {
    fontSize: typo.footnote.fontSize,
    fontFamily: typo.footnote.fontFamily,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  ticketGroup: {
    gap: spacing.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketIdText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 0.4,
  },
  ticketTime: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
  },
  ticketStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  ticketStatusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
  },
  ticketStatusText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  ticketTitleText: {
    fontSize: typo.headline.fontSize,
    fontFamily: typo.headline.fontFamily,
  },
  ticketMessageText: {
    marginTop: 4,
    fontSize: typo.footnote.fontSize,
    lineHeight: typo.footnote.lineHeight,
    fontFamily: typo.footnote.fontFamily,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_600SemiBold',
  },
  ticketOpenLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketOpenLink: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.2,
  },
  openTicketBtnWrap: {
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyStateText: {
    fontSize: typo.callout.fontSize,
    fontFamily: typo.callout.fontFamily,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  modalCard: {
    borderRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  ticketDetailCard: {
    maxHeight: '90%',
  },
  modalHandleWrap: {
    alignItems: 'center',
    marginTop: -8,
    marginBottom: spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: radii.pill,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  modalTitleText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: typo.title2.fontSize,
    lineHeight: typo.title2.lineHeight,
    fontFamily: typo.title2.fontFamily,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: typo.footnote.fontSize,
    lineHeight: typo.footnote.lineHeight,
    fontFamily: typo.footnote.fontFamily,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.6,
  },
  modalScroll: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  ticketThreadContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.sm,
  },
  modalActionFlex: {
    flex: 1,
  },
  modalActionGap: {
    width: spacing.sm,
  },
  formGroup: {
    marginTop: spacing.md,
  },
  fieldLabel: {
    fontSize: typo.caption2.fontSize,
    fontFamily: typo.caption2.fontFamily,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  messageInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  replyComposer: {
    flexDirection: 'row',
    // Centrado: o TextInput multiline alinha o texto ao topo, por isso com
    // 'flex-end' o botão ficava em baixo e o texto em cima, desencontrados.
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  replyIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketReplyInput: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 8,
    fontSize: typo.callout.fontSize,
    lineHeight: typo.callout.lineHeight,
    fontFamily: typo.callout.fontFamily,
    maxHeight: 120,
  },
  replyAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  replyThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
  },
  ticketClosedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  ticketClosedNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  // Faixa de confirmação: destaca o passo que desbloqueia o fecho do chamado.
  confirmBand: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  confirmBandTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBandHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  // Medidas fixas: a largura da bolha vem do conteúdo, por isso uma
  // percentagem aqui resolve contra uma largura indefinida e degenera.
  bubbleImage: {
    width: 220,
    height: 165,
    borderRadius: radii.sm,
    marginBottom: 6,
  },
  meterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  meterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  meterChipText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 0.5,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  locationStatusText: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.2,
  },
  emptyAttachmentText: {
    marginTop: spacing.sm,
    fontSize: typo.footnote.fontSize,
    fontFamily: typo.footnote.fontFamily,
  },
  ticketDetailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  metaPillText: {
    fontSize: typo.caption2.fontSize,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  composerWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typo.callout.fontSize,
    fontFamily: typo.callout.fontFamily,
    maxHeight: 120,
    minHeight: 40,
  },
  composerSendWrap: {},
  composerSend: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SupportScreen;
