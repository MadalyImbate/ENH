import { API_HOST as ENV_API_HOST, API_PATH as ENV_API_PATH } from '@env';

/**
 * Endereço do backend ENH-KOGAS (app de clientes).
 *
 * Definido em ".env" (ver ".env.example" para o modelo) — nunca hardcoded no
 * código-fonte. Para apontar para outro backend (staging, máquina local em
 * desenvolvimento), edite o valor de API_HOST em ".env".
 */
export const API_HOST = ENV_API_HOST;

/** Sufixo da API móvel. Alinhe com as rotas do backend Django. */
export const API_PATH = ENV_API_PATH;
