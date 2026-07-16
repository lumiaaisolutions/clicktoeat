import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useKeepAwake } from 'expo-keep-awake';
import { fetchPedidosMesero, fetchLlamados, atenderLlamado } from '@/features/salon/api';
import { updatePedidoEstado } from '@/features/pedidos/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import type { Pedido } from '@/lib/types';

const POLL_INTERVAL_MS = 10_000;

export default function MeseroScreen() {
  useKeepAwake('mesero-en-vivo');
  const qc = useQueryClient();

  const pedidosQuery = useQuery({
    queryKey: ['salon', 'mesero', 'pedidos'],
    queryFn: fetchPedidosMesero,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
  const llamadosQuery = useQuery({
    queryKey: ['salon', 'llamados'],
    queryFn: fetchLlamados,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const entregar = useMutation({
    mutationFn: (id: number) => updatePedidoEstado(id, 'entregado'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salon', 'mesero', 'pedidos'] }),
  });
  const atender = useMutation({
    mutationFn: (id: number) => atenderLlamado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salon', 'llamados'] }),
  });

  const loading = pedidosQuery.isLoading || llamadosQuery.isLoading;
  const pedidos = pedidosQuery.data ?? [];
  const llamados = llamadosQuery.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={pedidosQuery.isRefetching || llamadosQuery.isRefetching}
            onRefresh={() => { pedidosQuery.refetch(); llamadosQuery.refetch(); }}
            tintColor={colors.ink}
          />
        }
      >
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>Llamados pendientes</Text>
          {loading ? (
            <Text style={{ color: colors.muted }}>Cargando…</Text>
          ) : llamados.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>Nadie está llamando.</Text>
          ) : (
            llamados.map((l) => (
              <View
                key={l.id}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: '#FFF7E6', borderColor: colors.warn, borderWidth: 1,
                  borderRadius: 12, padding: 10,
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>
                  {l.mesa ?? `Mesa #${l.mesa_id}`}
                </Text>
                <Button
                  label="Atender"
                  size="sm"
                  fullWidth={false}
                  loading={atender.isPending && atender.variables === l.id}
                  onPress={() => atender.mutate(l.id)}
                />
              </View>
            ))
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>Listos para entregar</Text>
          {loading ? (
            <Text style={{ color: colors.muted }}>Cargando…</Text>
          ) : pedidos.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>Nada por entregar.</Text>
          ) : (
            pedidos.map((p) => (
              <PedidoListoCard
                key={p.id}
                pedido={p}
                loading={entregar.isPending && entregar.variables === p.id}
                onEntregar={() => entregar.mutate(p.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PedidoListoCard({
  pedido, loading, onEntregar,
}: { pedido: Pedido; loading: boolean; onEntregar: () => void }) {
  return (
    <Card>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 6 }}>
        {pedido.mesa?.etiqueta ?? pedido.codigo}
      </Text>
      {(pedido.detalles ?? []).map((d) => (
        <Text key={d.id} style={{ fontSize: 14, color: colors.ink, marginBottom: 2 }}>
          <Text style={{ fontWeight: '700' }}>{d.cantidad}×</Text> {d.producto_nombre}
        </Text>
      ))}
      <View style={{ marginTop: 10 }}>
        <Button label="Marcar entregado" size="sm" loading={loading} onPress={onEntregar} />
      </View>
    </Card>
  );
}
