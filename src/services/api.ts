import { NativeModules, Platform } from 'react-native';
import { API_HOST, API_PATH } from '../config/api';

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

export function getApiToken() {
  return authToken;
}

/**
 * Chamado quando o servidor rejeita o token (401). A sessão do cliente dura 90
 * dias; quando finalmente expira — ou é revogada — a app tem de voltar ao
 * login em vez de mostrar um erro genérico em cada ecrã.
 */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

function withApiPath(host: string) {
  const base = host.replace(/\/$/, '');
  return base.endsWith(API_PATH) ? base : `${base}${API_PATH}`;
}

function inferBaseUrl() {
  const runtimeOverride = (globalThis as { __KOGAS_API_URL__?: string }).__KOGAS_API_URL__;
  if (runtimeOverride) return withApiPath(runtimeOverride);
  if (API_HOST) return withApiPath(API_HOST);

  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  const match = scriptURL?.match(/https?:\/\/([^/:]+)(?::\d+)?/i);
  const host = match?.[1];
  if (host) return withApiPath(`http://${host}:8000`);
  if (Platform.OS === 'android') return withApiPath('http://10.0.2.2:8000');
  return withApiPath('http://127.0.0.1:8000');
}

export const API_BASE_URL = inferBaseUrl();

function friendlyHttpMessage(status: number) {
  if (status === 400 || status === 401 || status === 403) {
    return 'Sessão inválida ou dados incorretos. Verifique e tente novamente.';
  }
  if (status === 404) return 'Serviço não encontrado (404). Verifique o endereço da API.';
  if (status === 429) return 'Demasiadas tentativas. Aguarde um momento.';
  if (status >= 500) return `Erro no servidor (${status}). Tente novamente.`;
  return `Não foi possível concluir o pedido (HTTP ${status}).`;
}

/**
 * Extrai a mensagem real de erro devolvida pelo backend. Suporta os dois
 * formatos em uso: `{"detail": "..."}` (DRF puro) e o envelope de produção
 * `{"success": false, "error": {"code", "message", "details"}}`.
 */
function backendErrorMessage(data: any): string | null {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.detail === 'string' && data.detail) return data.detail;
  const error = data.error;
  if (error && typeof error === 'object' && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    if (!response.ok) throw new Error(friendlyHttpMessage(response.status));
    throw new Error('Resposta inválida do servidor (esperava-se JSON).');
  }
  if (!response.ok) {
    const message = backendErrorMessage(data) || friendlyHttpMessage(response.status);
    throw new Error(message);
  }
  return data as T;
}

async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    // Só corpos JSON levam este cabeçalho: com FormData é o fetch que tem de
    // definir o Content-Type, para incluir o boundary do multipart.
    ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (authenticated && authToken) headers.Authorization = `Token ${authToken}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && authenticated && authToken) {
    authToken = null;
    onSessionExpired?.();
  }
  return parseResponse<T>(response);
}

/** Envelope de listagem paginada do backend (DRF PageNumberPagination). */
type ApiEnvelope<T> = T[] | { results?: T[]; count?: number; next?: string | null };

function unwrap<T>(response: ApiEnvelope<T>): T[] {
  return Array.isArray(response) ? response : response.results ?? [];
}

function query(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][];
  if (!entries.length) return '';
  return `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

export type MobileOtpResponse = {
  message: string;
  expires_at: string;
  debug_code?: string;
};

export type MobileOtpVerifyResponse = {
  verified: boolean;
  token: string | null;
  requires_backoffice_user: boolean;
  cliente: { idcliente: number; nome: string; Apelido: string; telemovel: string; contato: string };
  contador: { idContador: number; numero_do_contador: string; estado: string };
};

export type MeterDetail = {
  idContador: number;
  numero_do_contador: string;
  estado: string;
  cliente_id?: number;
  cliente_nome?: string;
};

export type RechargeQuote = {
  meter_number: string;
  nome_do_cliente: string;
  valor_pago: string;
  valor_liquido: string;
  valgas: string;
  metical: string;
  iva: string;
  m3: string;
  taxa_fixa: string;
  tsc: string;
};

export type RechargeConfirm = RechargeQuote & {
  token: string;
  transaction_ID: string;
  gateway: string;
  transacao_id: number;
};

/** Perfil completo do cliente — GET /customer/profile/. */
export type CustomerProfile = {
  idcliente: number;
  nome: string;
  Apelido: string;
  full_name: string;
  nuit: string;
  bi: string;
  morada: string;
  estado: string;
  contato: string;
  email: string;
  telemovel: string;
  telefone: string;
  numero_unico_de_identificacao: string;
};

export type CustomerDashboard = {
  cliente: MobileOtpVerifyResponse['cliente'];
  meters_count: number;
  meters: MeterDetail[];
  transactions_count: number;
  tickets_open: number;
  last_transaction: TransactionEntry | null;
};

/** Parâmetros de compra definidos pelo servidor — a app não guarda regras próprias. */
export type RechargeOptions = {
  currency: string;
  min_amount: string;
  max_amount: string;
  suggested_amounts: number[];
  payment_methods: PaymentMethod[];
};

export type PaymentMethod = {
  code: string;
  label: string;
  requires_transaction_id: boolean;
  active: boolean;
};

/** Uma recarga/transação do cliente — GET /customer/transactions/. */
export type TransactionEntry = {
  id: number;
  data_de_compra: string;
  valor_pago: string | number;
  metroscubicos?: string | number;
  iva?: string | number;
  tsc?: string | number;
  taxa_fixa?: string | number;
  metodo?: string;
  meter_number?: string | null;
  token?: string | null;
};

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed' | 'cancelled';
export type TicketCategory = 'payment' | 'meter_error' | 'gas_leak' | 'installation' | 'general';
export type TicketPriority = 'low' | 'normal' | 'high' | 'critical';

/** Ticket de suporte — GET/POST /support/tickets/, GET /customer/tickets/. */
export type SupportTicket = {
  id: number;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  title: string;
  message: string;
  customer?: number | null;
  customer_name?: string | null;
  meter?: number | null;
  meter_display?: string | null;
  phone?: string;
  latitude?: string;
  longitude?: string;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  attachment_url?: string | null;
  created_at: string;
  updated_at?: string;
  /**
   * Confirmação da resolução. O ticket só é fechado pelo IRS depois de o
   * cliente confirmar — aqui na app, ou por chamada que o IRS regista.
   */
  is_confirmed?: boolean;
  confirmed_at?: string | null;
  confirmation_channel?: 'app' | 'call' | '';
};

/** Mensagem de um ticket — GET/POST /support/tickets/<id>/messages/. */
export type TicketMessage = {
  id: number;
  ticket: number;
  sender: 'customer' | 'agent' | 'technician' | 'system';
  message: string;
  attachment_url?: string | null;
  created_by?: number | null;
  created_at: string;
};

/** Foto escolhida na galeria ou tirada com a câmara. */
export type TicketAttachment = {
  uri: string;
  fileName: string;
  type: string;
};

export type SupportOption = { value: string; label: string };
export type SupportOptions = {
  ticket_categories: SupportOption[];
  ticket_statuses: SupportOption[];
  ticket_priorities: SupportOption[];
  guest_request_kinds: SupportOption[];
  guest_request_statuses: SupportOption[];
};

/** Entrada do catálogo de erros do contador — GET /meters/errors/. */
export type MeterErrorEntry = {
  code: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requires_technician: boolean;
};

export const mobileApi = {
  requestOtp(payload: { meter_number: string; phone: string; purpose?: 'login' | 'payment' }) {
    return apiRequest<MobileOtpResponse>('/auth/request-otp/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
  },
  async verifyOtp(payload: { meter_number: string; phone: string; code: string; purpose?: 'login' | 'payment' }) {
    const result = await apiRequest<MobileOtpVerifyResponse>('/auth/verify-otp/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, false);
    if (result.token) setApiToken(result.token);
    return result;
  },
  createGuestRequest(payload: Record<string, unknown>) {
    return apiRequest('/guest-requests/', { method: 'POST', body: JSON.stringify(payload) }, false);
  },
  supportOptions() {
    return apiRequest<SupportOptions>('/support/options/', {}, false);
  },
  /** Catálogo de erros do contador — público, não exige sessão. */
  meterErrors() {
    return apiRequest<MeterErrorEntry[]>('/meters/errors/', {}, false);
  },
  customerDashboard() {
    return apiRequest<CustomerDashboard>('/customer/dashboard/');
  },
  customerProfile() {
    return apiRequest<CustomerProfile>('/customer/profile/');
  },
  /** Submete alterações de dados para aprovação do backoffice comercial. */
  submitProfileUpdateRequest(changes: Record<string, string>) {
    return apiRequest<{ request_id: number; status: string }>('/customer/profile/update-request/', {
      method: 'POST',
      body: JSON.stringify({ changes }),
    });
  },
  meterDetail(meterNumber: string) {
    return apiRequest<MeterDetail>(`/meters/${encodeURIComponent(meterNumber)}/`);
  },
  customerMeters() {
    return apiRequest<MeterDetail[]>('/customer/meters/');
  },
  async customerTransactions(params: { search?: string; meterNumber?: string; pageSize?: number } = {}) {
    const response = await apiRequest<ApiEnvelope<TransactionEntry>>(
      `/customer/transactions/${query({
        search: params.search,
        meter_number: params.meterNumber,
        page_size: params.pageSize ? String(params.pageSize) : undefined,
      })}`,
    );
    return unwrap(response);
  },
  async customerTickets(params: { search?: string; status?: string; category?: string } = {}) {
    const response = await apiRequest<ApiEnvelope<SupportTicket>>(
      `/customer/tickets/${query({ search: params.search, status: params.status, category: params.category })}`,
    );
    return unwrap(response);
  },
  meterHistory(meterNumber: string) {
    return apiRequest<Array<Record<string, unknown>>>(`/meters/${encodeURIComponent(meterNumber)}/history/`);
  },
  paymentMethods() {
    return apiRequest<PaymentMethod[]>('/recharges/payment-methods/');
  },
  /** Moeda, limites, valores sugeridos e métodos — tudo calculado no servidor. */
  rechargeOptions() {
    return apiRequest<RechargeOptions>('/recharges/options/', {}, false);
  },
  quoteRecharge(payload: { meter_number: string; amount: string }) {
    return apiRequest<RechargeQuote>('/recharges/quote/', { method: 'POST', body: JSON.stringify(payload) });
  },
  confirmRecharge(payload: {
    meter_number: string;
    amount: string;
    payment_method: string;
    /** Opcional: sem referência do gateway o servidor gera a sua própria. */
    transactionID?: string;
    phone?: string;
  }) {
    return apiRequest<RechargeConfirm>('/recharges/confirm/', { method: 'POST', body: JSON.stringify(payload) });
  },
  /**
   * Cria um ticket. Sem foto envia JSON; com foto envia multipart/form-data,
   * porque o ficheiro não cabe num corpo JSON.
   */
  createTicket(payload: Record<string, unknown>, attachment?: TicketAttachment | null) {
    if (!attachment) {
      return apiRequest<SupportTicket>('/support/tickets/', { method: 'POST', body: JSON.stringify(payload) });
    }
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value == null) return;
      form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
    form.append('attachment', {
      uri: attachment.uri,
      name: attachment.fileName,
      type: attachment.type,
    } as unknown as Blob);
    // Sem Content-Type explícito: o fetch define o boundary do multipart.
    return apiRequest<SupportTicket>('/support/tickets/', { method: 'POST', body: form });
  },
  ticketDetail(ticketId: number | string) {
    return apiRequest<SupportTicket>(`/support/tickets/${ticketId}/`);
  },
  async ticketMessages(ticketId: number | string) {
    const response = await apiRequest<ApiEnvelope<TicketMessage>>(`/support/tickets/${ticketId}/messages/`);
    return unwrap(response);
  },
  /** Resposta a um ticket, com imagem opcional (multipart quando há anexo). */
  addTicketMessage(
    ticketId: number | string,
    message: string,
    sender: TicketMessage['sender'] = 'customer',
    attachment?: TicketAttachment | null,
  ) {
    const path = `/support/tickets/${ticketId}/messages/`;
    if (!attachment) {
      return apiRequest<TicketMessage>(path, { method: 'POST', body: JSON.stringify({ message, sender }) });
    }
    const form = new FormData();
    form.append('message', message);
    form.append('sender', sender);
    form.append('attachment', {
      uri: attachment.uri,
      name: attachment.fileName,
      type: attachment.type,
    } as unknown as Blob);
    return apiRequest<TicketMessage>(path, { method: 'POST', body: form });
  },
  /**
   * Confirma que o problema ficou resolvido. É esta confirmação que autoriza o
   * IRS a fechar o ticket — sem ela, o fecho é recusado pelo servidor.
   */
  confirmTicket(ticketId: number | string, note?: string) {
    return apiRequest<SupportTicket>(`/support/tickets/${ticketId}/confirm/`, {
      method: 'POST',
      body: JSON.stringify({ note: note ?? '' }),
    });
  },
};
