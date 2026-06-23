import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { initAudio } from '@/core/audio';
import { useAuthEvents } from '@/features/auth/useAuthEvents';
import { usePushDeepLink } from '@/features/auth/usePushDeepLink';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const bootstrapping = useAuth((s) => s.bootstrapping);
  const user = useAuth((s) => s.user);

  useAuthEvents();
  usePushDeepLink();

  useEffect(() => {
    bootstrap();
    initAudio().catch(() => {});
  }, [bootstrap]);

  if (bootstrapping) {
    return null;
  }

  const isAuthed = !!user;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={isAuthed}>
              <Stack.Screen name="(admin)" />
            </Stack.Protected>
            <Stack.Protected guard={!isAuthed}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
