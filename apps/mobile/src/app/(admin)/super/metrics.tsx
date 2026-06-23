import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetchSaasMetrics } from '@/features/super/api';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatMoney } from '@/lib/format';

export default function SaasMetricsScreen() {
  const query = useQuery({ queryKey: ['saas-metrics'], queryFn: fetchSaasMetrics });

  if (!query.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'No disponible'}</Text>
      </SafeAreaView>
    );
  }

  const m = query.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>MRR</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>
              {formatMoney(m.mrr_mxn)}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>ARR</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>
              {formatMoney(m.arr_mxn)}
            </Text>
          </Card>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Activos</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{m.active_count}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Trial</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{m.trialing_count}</Text>
          </Card>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Churn 30d</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>
              {m.churn_30d_pct.toFixed(1)}%
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Conv 30d</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>
              {m.conversion_30d_pct.toFixed(1)}%
            </Text>
          </Card>
        </View>

        <Card>
          <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '700', marginBottom: 8 }}>
            Distribución por plan
          </Text>
          {m.distribucion.map((d, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 6,
                borderBottomColor: colors.line,
                borderBottomWidth: idx < m.distribucion.length - 1 ? 1 : 0,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.ink }}>
                {d.plan_nombre} <Text style={{ color: colors.muted, fontSize: 12 }}>· {d.status}</Text>
              </Text>
              <Text style={{ fontSize: 14, color: colors.ink, fontWeight: '700' }}>{d.count}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
