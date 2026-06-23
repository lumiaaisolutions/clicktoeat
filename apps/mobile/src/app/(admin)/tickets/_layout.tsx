import { Stack } from 'expo-router';
import { colors } from '@/design/tokens';

export default function TicketsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Tickets de soporte' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo ticket', presentation: 'modal' }} />
    </Stack>
  );
}
