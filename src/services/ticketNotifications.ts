import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance } from '@notifee/react-native';

import { mobileApi, type SupportTicket, type TicketStatus } from './api';

/**
 * Vigia os tickets do cliente e notifica quando um passa a "Resolvido".
 *
 * É a ponta do cliente no fluxo do IRS: quem executou dá o caso por resolvido,
 * e o cliente é chamado a confirmar na app — sem isto ele só descobria se
 * abrisse o ecrã de suporte por acaso.
 *
 * Funciona por sondagem enquanto a app está aberta (primeiro plano, ou ao
 * regressar do fundo). Com a app fechada não há como sondar: isso exige push
 * remoto (FCM/APNs), que depende do projecto Firebase ainda por criar. Este
 * módulo é o degrau até lá — quando o push chegar, troca-se a origem do
 * evento e a notificação local mantém-se.
 */

const POLL_MS = 60_000;
const SNAPSHOT_KEY = 'tickets.statusSnapshot';
const CHANNEL_ID = 'tickets';

type Snapshot = Record<string, TicketStatus>;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady) {
    return;
  }
  // iOS: pede autorização; Android 13+: idem. Recusa → seguimos sem notificar.
  await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Tickets de apoio',
    importance: AndroidImportance.HIGH,
  });
  channelReady = true;
}

async function readSnapshot(): Promise<Snapshot> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Sem persistência repetimos a notificação no próximo arranque — é o
    // lado seguro: antes repetir do que perder.
  }
}

async function notifyResolved(ticket: SupportTicket): Promise<void> {
  await ensureChannel();
  await notifee.displayNotification({
    id: `ticket-resolved-${ticket.id}`,
    title: 'O seu pedido foi resolvido',
    body: `Ticket #${ticket.id} · ${ticket.title}. Abra a app e confirme se o problema ficou resolvido.`,
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
    },
  });
}

async function checkOnce(): Promise<void> {
  let tickets: SupportTicket[];
  try {
    tickets = await mobileApi.customerTickets();
  } catch {
    return; // offline ou sessão expirada — tenta no próximo ciclo
  }

  const previous = await readSnapshot();
  const next: Snapshot = {};

  for (const ticket of tickets) {
    next[String(ticket.id)] = ticket.status;
    const before = previous[String(ticket.id)];
    const becameResolved =
      ticket.status === 'resolved' && before !== undefined && before !== 'resolved';
    // Sem registo anterior só notifica se ainda estiver por confirmar — cobre
    // o caso de a resolução ter acontecido com a app fechada.
    const resolvedWhileAway =
      ticket.status === 'resolved' && before === undefined && !ticket.is_confirmed;
    if (becameResolved || resolvedWhileAway) {
      await notifyResolved(ticket);
    }
  }

  await writeSnapshot(next);
}

/** Liga o vigilante. Idempotente; devolve a função que o desliga. */
export function startTicketNotifications(): () => void {
  if (pollTimer) {
    return stopTicketNotifications;
  }

  checkOnce().catch(() => undefined);
  pollTimer = setInterval(() => {
    checkOnce().catch(() => undefined);
  }, POLL_MS);

  // Regressar do fundo conta como "agora": verifica logo, sem esperar o ciclo.
  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      checkOnce().catch(() => undefined);
    }
  });

  return stopTicketNotifications;
}

export function stopTicketNotifications(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
}
