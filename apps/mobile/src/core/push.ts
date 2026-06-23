import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('pedidos', {
    name: 'Pedidos nuevos',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }
  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    // Sin projectId no podemos pedir Expo push token todavía (build de prod).
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

export async function syncDeviceWithBackend(expoToken: string): Promise<void> {
  try {
    await api.post('/mobile/register-device', {
      expo_push_token: expoToken,
      platform: Platform.OS,
      device_name: Device.deviceName ?? null,
    });
  } catch (err) {
    // El backend devuelve 409 cuando el token ya está asociado a otra cuenta
    // (caso típico: el dispositivo había iniciado sesión con otro usuario y
    // no cerró sesión correctamente). No es un error fatal — la app sigue
    // funcionando, sólo no recibe pushes hasta que el otro user llame
    // /mobile/unregister-device. Logueamos para diagnóstico y continuamos.
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      console.warn('[push] device already registered to another user — push delivery skipped until the previous session signs out');
      return;
    }
    // Para otros errores (red, 401, 500) sí queremos que el caller decida.
    throw err;
  }
}

let currentExpoToken: string | null = null;

/**
 * Registra el dispositivo en backend y guarda el token en memoria para poder
 * desregistrarlo al cerrar sesión. Falla silenciosamente — perder push no
 * debe romper el login.
 */
export async function registerAndSyncDevice(): Promise<string | null> {
  try {
    const token = await registerForPushAsync();
    if (!token) return null;
    await syncDeviceWithBackend(token);
    currentExpoToken = token;
    return token;
  } catch (err) {
    console.warn('[push] registerAndSyncDevice failed:', err);
    return null;
  }
}

/**
 * Llamar antes del logout para que el backend deje de mandar push a este
 * dispositivo. No bloquea logout si falla — el token se renueva con el
 * próximo login de todas formas.
 */
export async function unregisterDeviceFromBackend(): Promise<void> {
  if (!currentExpoToken) return;
  try {
    await api.post('/mobile/unregister-device', {
      expo_push_token: currentExpoToken,
    });
  } catch {
    /* no-op */
  } finally {
    currentExpoToken = null;
  }
}
