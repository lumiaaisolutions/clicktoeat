import { ScrollView, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { fetchPedido, updatePedidoEstado } from '@/features/pedidos/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { EstadoBadge } from '@/design/components/Badge';
import { colors } from '@/design/tokens';
import { formatMoney } from '@/lib/format';
import type { PedidoEstado } from '@/lib/types';

const NEXT_BY_ESTADO: Record<PedidoEstado, PedidoEstado | null> = {
  nuevo:      'confirmado',
  confirmado: 'preparando',
  preparando: 'listo',
  listo:      'en_camino',
  en_camino:  'entregado',
  entregado:  null,
  cancelado:  null,
};

const NEXT_LABEL: Record<PedidoEstado, string> = {
  nuevo:      'Confirmar',
  confirmado: 'Empezar a preparar',
  preparando: 'Marcar listo',
  listo:      'Salió a entregar',
  en_camino:  'Marcar entregado',
  entregado:  '',
  cancelado:  '',
};

export default function PedidoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const pedido = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => fetchPedido(id),
    enabled: !!id,
  });

  const mutate = useMutation({
    mutationFn: (estado: PedidoEstado) => updatePedidoEstado(id, estado),
    onSuccess: (data) => {
      qc.setQueryData(['pedido', id], data);
      qc.invalidateQueries({ queryKey: ['pedidos', 'live'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    onError: () => {
      Alert.alert('No se pudo cambiar el estado', 'Verifica tu conexión y vuelve a intentarlo.');
    },
  });

  if (pedido.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  const p = pedido.data;
  if (!p) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.accent }}>Pedido no encontrado.</Text>
      </SafeAreaView>
    );
  }

  const nextEstado = NEXT_BY_ESTADO[p.estado];
  const canCancel = p.estado !== 'entregado' && p.estado !== 'cancelado';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, color: colors.muted, fontWeight: '700' }}>{p.codigo}</Text>
            <EstadoBadge estado={p.estado} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{p.cliente_nombre}</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>{p.cliente_telefono}</Text>
          {p.direccion ? (
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 6 }}>{p.direccion}</Text>
          ) : null}
          {p.notas ? (
            <Text style={{ fontSize: 14, color: colors.ink, marginTop: 8, fontStyle: 'italic' }}>
              "{p.notas}"
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8, fontWeight: '600' }}>
            Productos
          </Text>
          {(p.detalles ?? []).map((d) => (
            <View key={d.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottomColor: colors.line, borderBottomWidth: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '600', flex: 1 }}>
                  {d.cantidad}× {d.producto_nombre}
                </Text>
                <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '600' }}>
                  {formatMoney(d.subtotal)}
                </Text>
              </View>
              {d.extras_seleccionados?.length ? (
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {d.extras_seleccionados.map((e) => `${e.group}: ${e.item}`).join(' · ')}
                </Text>
              ) : null}
              {d.notas ? (
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, fontStyle: 'italic' }}>
                  {d.notas}
                </Text>
              ) : null}
            </View>
          ))}

          <View style={{ marginTop: 8, gap: 4 }}>
            <Row label="Subtotal" value={formatMoney(p.subtotal)} />
            {p.delivery_fee > 0 ? <Row label="Envío" value={formatMoney(p.delivery_fee)} /> : null}
            {p.descuento > 0 ? <Row label="Descuento" value={`- ${formatMoney(p.descuento)}`} /> : null}
            <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />
            <Row label="Total" value={formatMoney(p.total)} bold />
          </View>
        </Card>

        <View style={{ gap: 8, marginTop: 4 }}>
          {nextEstado ? (
            <Button
              label={NEXT_LABEL[p.estado]}
              loading={mutate.isPending}
              onPress={() => mutate.mutate(nextEstado)}
            />
          ) : null}
          {canCancel ? (
            <Button
              label="Cancelar pedido"
              variant="ghost"
              loading={mutate.isPending}
              onPress={() =>
                Alert.alert(
                  'Cancelar pedido',
                  '¿Seguro? Esta acción no se puede deshacer.',
                  [
                    { text: 'No', style: 'cancel' },
                    { text: 'Sí, cancelar', style: 'destructive', onPress: () => mutate.mutate('cancelado') },
                  ],
                )
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: bold ? 16 : 14, color: bold ? colors.ink : colors.muted, fontWeight: bold ? '800' : '500' }}>
        {label}
      </Text>
      <Text style={{ fontSize: bold ? 18 : 14, color: colors.ink, fontWeight: bold ? '800' : '500' }}>
        {value}
      </Text>
    </View>
  );
}
