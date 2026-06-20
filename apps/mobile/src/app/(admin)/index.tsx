import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { useAuth } from '@/store/auth';
import { formatMoney } from '@/lib/format';
import type { MetricasResponse } from '@/lib/types';

export default function Dashboard() {
  const user = useAuth((s) => s.user);

  const metricas = useQuery({
    queryKey: ['metricas', 'today'],
    queryFn: async (): Promise<MetricasResponse> => {
      const { data } = await api.get<MetricasResponse>('/metricas', {
        params: { dias: 1 },
      });
      return data;
    },
  });

  const r = metricas.data?.resumen;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 14, color: colors.muted }}>Hola,</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>
            {user?.nombre ?? 'Bienvenido'}
          </Text>
        </View>

        <Card>
          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
            Pedidos hoy
          </Text>
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.ink }}>
            {r?.pedidos ?? '—'}
          </Text>
        </Card>

        <Card>
          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
            Ventas hoy
          </Text>
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.ink }}>
            {r ? formatMoney(r.ventas_total) : '—'}
          </Text>
        </Card>

        <Card>
          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
            Ticket promedio
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.ink }}>
            {r ? formatMoney(r.ticket_promedio) : '—'}
          </Text>
        </Card>

        {metricas.isError ? (
          <Text style={{ color: colors.accent, fontSize: 13 }}>
            No pudimos cargar las métricas.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
