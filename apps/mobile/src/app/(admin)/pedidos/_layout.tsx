import { Stack } from 'expo-router';
import { colors } from '@/design/tokens';

export default function PedidosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Pedidos en vivo' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del pedido' }} />
    </Stack>
  );
}
