import { useEffect, useRef } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { fetchPedidosCocina } from '@/features/salon/api';
import { updatePedidoEstado } from '@/features/pedidos/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { EstadoBadge } from '@/design/components/Badge';
import { colors } from '@/design/tokens';
import { playBell } from '@/core/audio';
import type { Pedido, PedidoEstado } from '@/lib/types';

const POLL_INTERVAL_MS = 10_000;

const SIGUIENTE_ESTADO: Partial<Record<PedidoEstado, PedidoEstado>> = {
  nuevo: 'confirmado',
  confirmado: 'preparando',
  preparando: 'listo',
};
const ACCION_LABEL: Partial<Record<PedidoEstado, string>> = {
  nuevo: 'Confirmar',
  confirmado: 'Empezar a preparar',
  preparando: 'Marcar listo',
};

export default function CocinaScreen() {
  useKeepAwake('cocina-en-vivo');
  const qc = useQueryClient();
  const previousIds = useRef<Set<number>>(new Set());

  const query = useQuery({
    queryKey: ['salon', 'cocina'],
    queryFn: fetchPedidosCocina,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!query.data) return;
    const currentIds = new Set(query.data.map((p) => p.id));
    const hasNew = query.data.some((p) => !previousIds.current.has(p.id));
    if (hasNew && previousIds.current.size > 0) {
      playBell();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    previousIds.current = currentIds;
  }, [query.data]);

  const avanzar = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: PedidoEstado }) => updatePedidoEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salon', 'cocina'] }),
  });

  const pedidos = query.data ?? [];

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
              {query.isLoading ? 'Cargando…' : 'Sin pedidos pendientes'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PedidoCocinaCard
            pedido={item}
            loading={avanzar.isPending && avanzar.variables?.id === item.id}
            onAvanzar={() => {
              const siguiente = SIGUIENTE_ESTADO[item.estado];
              if (siguiente) avanzar.mutate({ id: item.id, estado: siguiente });
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

function PedidoCocinaCard({
  pedido, loading, onAvanzar,
}: { pedido: Pedido; loading: boolean; onAvanzar: () => void }) {
  const siguienteLabel = ACCION_LABEL[pedido.estado];
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
          {pedido.mesa?.etiqueta ?? pedido.codigo}
        </Text>
        <EstadoBadge estado={pedido.estado} />
      </View>
      {(pedido.detalles ?? []).map((d) => (
        <View key={d.id} style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 14, color: colors.ink }}>
            <Text style={{ fontWeight: '700' }}>{d.cantidad}×</Text> {d.producto_nombre}
          </Text>
          {d.notas ? (
            <Text style={{ fontSize: 12, color: colors.muted, fontStyle: 'italic', marginLeft: 12 }}>
              "{d.notas}"
            </Text>
          ) : null}
        </View>
      ))}
      {siguienteLabel ? (
        <View style={{ marginTop: 10 }}>
          <Button label={siguienteLabel} size="sm" loading={loading} onPress={onAvanzar} />
        </View>
      ) : null}
    </Card>
  );
}
