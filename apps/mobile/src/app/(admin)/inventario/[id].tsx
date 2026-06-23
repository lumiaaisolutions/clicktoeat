import { useState } from 'react';
import { Alert, FlatList, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ajustarStock, fetchIngrediente, fetchMovimientos } from '@/features/inventario/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Input } from '@/design/components/Input';
import { colors } from '@/design/tokens';
import { formatMoney, formatRelativeTime } from '@/lib/format';

const TIPOS: Array<{ key: 'entrada' | 'ajuste' | 'merma'; label: string }> = [
  { key: 'entrada', label: 'Entrada' },
  { key: 'ajuste',  label: 'Ajuste' },
  { key: 'merma',   label: 'Merma' },
];

export default function IngredienteDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [tipo, setTipo] = useState<'entrada' | 'ajuste' | 'merma'>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');

  const ing = useQuery({
    queryKey: ['ingrediente', id],
    queryFn: () => fetchIngrediente(Number(id)),
    enabled: !!id,
  });

  const movs = useQuery({
    queryKey: ['movimientos', id],
    queryFn: () => fetchMovimientos(Number(id)),
    enabled: !!id,
  });

  const ajuste = useMutation({
    mutationFn: () =>
      ajustarStock(Number(id), {
        tipo,
        cantidad: parseFloat(cantidad.replace(',', '.')) || 0,
        motivo: motivo || undefined,
      }),
    onSuccess: () => {
      setCantidad('');
      setMotivo('');
      qc.invalidateQueries({ queryKey: ['ingrediente', id] });
      qc.invalidateQueries({ queryKey: ['movimientos', id] });
      qc.invalidateQueries({ queryKey: ['ingredientes'] });
    },
    onError: () => Alert.alert('Error', 'No se pudo ajustar el stock.'),
  });

  if (!ing.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>{ing.isLoading ? 'Cargando…' : 'No encontrado'}</Text>
      </SafeAreaView>
    );
  }

  const i = ing.data;
  const movsList = movs.data?.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={movsList}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Card>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{i.nombre}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                <View>
                  <Text style={{ fontSize: 12, color: colors.muted }}>Stock</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: i.bajo_stock ? colors.accent : colors.ink }}>
                    {i.stock} {i.unidad}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, color: colors.muted }}>Mínimo</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>
                    {i.stock_minimo} {i.unidad}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 12, color: colors.muted }}>Costo</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>
                    {formatMoney(i.costo_unitario)}
                  </Text>
                </View>
              </View>
            </Card>

            <Card>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>
                Ajustar stock
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {TIPOS.map((t) => (
                  <Button
                    key={t.key}
                    label={t.label}
                    variant={tipo === t.key ? 'primary' : 'secondary'}
                    size="sm"
                    fullWidth={false}
                    onPress={() => setTipo(t.key)}
                  />
                ))}
              </View>
              <Input
                label="Cantidad"
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="decimal-pad"
                hint={`Positivo suma, negativo resta. Unidad: ${i.unidad}`}
              />
              <Input label="Motivo (opcional)" value={motivo} onChangeText={setMotivo} />
              <Button label="Aplicar" onPress={() => ajuste.mutate()} loading={ajuste.isPending} disabled={!cantidad} />
            </Card>

            <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '700', marginTop: 4 }}>
              Movimientos recientes
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: colors.muted, paddingTop: 20, textAlign: 'center' }}>
            Sin movimientos todavía.
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, textTransform: 'capitalize' }}>
                {item.tipo}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>{formatRelativeTime(item.created_at)}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              {item.cantidad > 0 ? '+' : ''}{item.cantidad} {i.unidad} · stock: {item.stock_resultante}
            </Text>
            {item.motivo ? (
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4, fontStyle: 'italic' }}>{item.motivo}</Text>
            ) : null}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
