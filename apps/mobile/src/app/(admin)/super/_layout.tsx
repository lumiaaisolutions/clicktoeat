import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/store/auth';
import { colors } from '@/design/tokens';

export default function SuperLayout() {
  const user = useAuth((s) => s.user);

  if (user && user.rol !== 'super_admin') {
    return <Redirect href="/(admin)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Super admin' }} />
      <Stack.Screen name="locales" options={{ title: 'Locales' }} />
      <Stack.Screen name="metrics" options={{ title: 'SaaS metrics' }} />
      <Stack.Screen name="anuncios" options={{ title: 'Anuncios globales' }} />
    </Stack>
  );
}
