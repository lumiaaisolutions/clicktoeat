import axios, { AxiosError, AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { tokenStore } from './secure-store';

const baseURL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'https://clicktoeat-api.lumiaaisolutions.com/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type Listener = (event: { code: string; status: number; body: unknown }) => void;
const listeners = new Set<Listener>();

export const apiEvents = {
  on(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const body = error.response?.data as { code?: string } | undefined;

    if (status === 401) {
      await tokenStore.clear();
      listeners.forEach((fn) => fn({ code: 'UNAUTHENTICATED', status: 401, body }));
    } else if (status === 402 && body?.code) {
      listeners.forEach((fn) => fn({ code: body.code!, status: 402, body }));
    }
    return Promise.reject(error);
  },
);

export const API_URL = baseURL;
