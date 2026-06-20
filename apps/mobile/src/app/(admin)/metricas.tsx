import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatMoney } from '@/lib/format';
import type { MetricasResponse } from '@/lib/types';

export default function MetricasScreen() {
  const query = useQuery({
    queryKey: ['metricas', 30],
    queryFn: async () => {
      const { data } = await api.get<MetricasResponse>('/metricas', { params: { dias: 30 } });
      return data;
    },
  });

  if (query.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>Cargando métricas…</Text>
      </SafeAreaView>
    );
  }

  if (query.isError || !query.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.accent }}>No pudimos cargar las métricas.</Text>
      </SafeAreaView>
    );
  }

  const m = query.data;
  const r = m.resumen;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          Últimos {m.rango.dias} días
        </Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Pedidos</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{r.pedidos}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Ventas</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>
              {formatMoney(r.ventas_total)}
            </Text>
          </Card>
        </View>

        <Card>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8, fontWeight: '600' }}>
            Top productos
          </Text>
          {(m.top_productos ?? []).slice(0, 5).map((p, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomColor: colors.line,
                borderBottomWidth: idx === Math.min(4, m.top_productos.length - 1) ? 0 : 1,
              }}
            >
              <Text style={{ fontSize: 15, color: colors.ink, flex: 1 }} numberOfLines={1}>
                {p.producto_nombre}
              </Text>
              <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '600' }}>
                {p.cantidad}
              </Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8, fontWeight: '600' }}>
            Ticket promedio
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>
            {formatMoney(r.ticket_promedio)}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
