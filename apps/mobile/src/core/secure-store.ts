import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'clicktoeat:token';

export const tokenStore = {
  async get(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
