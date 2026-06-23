import { FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCupones, toggleCupon } from '@/features/cupones/api';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatMoney } from '@/lib/format';
import type { Cupon } from '@/lib/types';

export default function CuponesScreen() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['cupones'], queryFn: fetchCupones });

  const toggle = useMutation({
    mutationFn: (c: Cupon) => toggleCupon(c.id),
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: ['cupones'] });
      const prev = qc.getQueryData<Cupon[]>(['cupones']);
      qc.setQueryData<Cupon[]>(['cupones'], (old) =>
        old?.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x)) ?? old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['cupones'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['cupones'] }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin cupones'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: 0.5 }}>
                  {item.codigo}
                </Text>
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
                  {item.tipo === 'percent' ? `${item.valor}% de descuento` : `${formatMoney(item.valor)} de descuento`}
                </Text>
                {item.fecha_hasta ? (
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    Vence: {item.fecha_hasta}
                  </Text>
                ) : null}
              </View>
              <Switch value={item.activo} onValueChange={() => toggle.mutate(item)} thumbColor={item.activo ? colors.ok : colors.muted} />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
