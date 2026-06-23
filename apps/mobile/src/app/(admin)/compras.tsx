import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetchCompras } from '@/features/compras/api';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatMoney, formatRelativeTime } from '@/lib/format';

export default function ComprasScreen() {
  const query = useQuery({ queryKey: ['compras'], queryFn: () => fetchCompras(1) });

  const compras = query.data?.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={compras}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListHeaderComponent={
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>
            Registra compras a proveedor desde el panel web para no perder cálculo del costo promedio ponderado.
          </Text>
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin compras registradas'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={item.estado === 'anulada' ? { opacity: 0.6 } : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '700' }}>{item.codigo}</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {item.fecha ?? formatRelativeTime(item.created_at)}
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 4 }}>
              {item.proveedor ?? 'Sin proveedor'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: colors.muted, textTransform: 'capitalize' }}>{item.estado}</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{formatMoney(item.total)}</Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
