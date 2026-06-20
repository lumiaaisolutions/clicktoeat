import { useEffect, useRef } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Link, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { fetchPedidos } from '@/features/pedidos/api';
import { PressableCard } from '@/design/components/Card';
import { EstadoBadge } from '@/design/components/Badge';
import { colors } from '@/design/tokens';
import { formatMoney, formatRelativeTime } from '@/lib/format';
import { playBell } from '@/core/audio';
import type { Pedido } from '@/lib/types';

const POLL_INTERVAL_MS = 10_000;

export default function PedidosList() {
  useKeepAwake('pedidos-en-vivo');

  const previousNuevoIds = useRef<Set<number>>(new Set());

  const query = useQuery({
    queryKey: ['pedidos', 'live'],
    queryFn: () => fetchPedidos({ estado: ['nuevo', 'confirmado', 'preparando', 'listo'] }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!query.data) return;
    const nuevos = query.data.data.filter((p) => p.estado === 'nuevo');
    const currentIds = new Set(nuevos.map((p) => p.id));
    const hasNew = nuevos.some((p) => !previousNuevoIds.current.has(p.id));
    if (hasNew && previousNuevoIds.current.size > 0) {
      playBell();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    previousNuevoIds.current = currentIds;
  }, [query.data]);

  const pedidos = query.data?.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={pedidos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.ink}
          />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: colors.muted }}>
              {query.isLoading ? 'Cargando…' : 'Sin pedidos activos'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <PedidoRow pedido={item} />}
      />
    </SafeAreaView>
  );
}

function PedidoRow({ pedido }: { pedido: Pedido }) {
  return (
    <Link href={{ pathname: '/(admin)/pedidos/[id]', params: { id: pedido.id } }} asChild>
      <PressableCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}>
            {pedido.codigo}
          </Text>
          <EstadoBadge estado={pedido.estado} />
        </View>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 2 }}>
          {pedido.cliente_nombre}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>
          {pedido.metodo_entrega === 'delivery' ? 'A domicilio' : pedido.metodo_entrega === 'pickup' ? 'Pasa a recoger' : 'En sucursal'}
          {'  ·  '}
          {formatRelativeTime(pedido.created_at)}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            {pedido.detalles?.length ?? 0} {pedido.detalles?.length === 1 ? 'producto' : 'productos'}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>
            {formatMoney(pedido.total)}
          </Text>
        </View>
      </PressableCard>
    </Link>
  );
}
