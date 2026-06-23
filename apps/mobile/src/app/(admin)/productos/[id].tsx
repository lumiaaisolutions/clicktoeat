import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProducto, updateProducto } from '@/features/productos/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Input } from '@/design/components/Input';
import { colors } from '@/design/tokens';
import { formatMoney } from '@/lib/format';

export default function ProductoEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['producto', id],
    queryFn: () => fetchProducto(Number(id)),
    enabled: !!id,
  });

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioDesc, setPrecioDesc] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [esPromocion, setEsPromocion] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (query.data && !dirty) {
      setNombre(query.data.nombre);
      setPrecio(String(query.data.precio));
      setPrecioDesc(query.data.precio_descuento != null ? String(query.data.precio_descuento) : '');
      setDescripcion(query.data.descripcion ?? '');
      setDisponible(query.data.disponible);
      setEsPromocion(query.data.es_promocion);
    }
  }, [query.data, dirty]);

  const save = useMutation({
    mutationFn: () =>
      updateProducto(Number(id), {
        nombre,
        precio: parseFloat(precio) || 0,
        precio_descuento: precioDesc ? parseFloat(precioDesc) : null,
        descripcion: descripcion || null,
        disponible,
        es_promocion: esPromocion,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producto', id] });
      qc.invalidateQueries({ queryKey: ['productos'] });
      router.back();
    },
    onError: () => Alert.alert('No se pudo guardar', 'Revisa los datos e intenta de nuevo.'),
  });

  if (query.isLoading || !query.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Card>
            <Input label="Nombre" value={nombre} onChangeText={(v) => { setDirty(true); setNombre(v); }} />
            <Input
              label="Precio"
              value={precio}
              onChangeText={(v) => { setDirty(true); setPrecio(v.replace(',', '.')); }}
              keyboardType="decimal-pad"
              hint={precio ? formatMoney(parseFloat(precio) || 0) : undefined}
            />
            <Input
              label="Precio con descuento (opcional)"
              value={precioDesc}
              onChangeText={(v) => { setDirty(true); setPrecioDesc(v.replace(',', '.')); }}
              keyboardType="decimal-pad"
              hint={precioDesc ? formatMoney(parseFloat(precioDesc) || 0) : 'Déjalo vacío si no hay descuento'}
            />
            <Input
              label="Descripción"
              value={descripcion}
              onChangeText={(v) => { setDirty(true); setDescripcion(v); }}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </Card>

          <Card>
            <ToggleRow
              label="Disponible"
              value={disponible}
              onValueChange={(v) => { setDirty(true); setDisponible(v); }}
            />
            <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 10 }} />
            <ToggleRow
              label="En promoción"
              value={esPromocion}
              onValueChange={(v) => { setDirty(true); setEsPromocion(v); }}
            />
          </Card>

          <Button label="Guardar cambios" onPress={() => save.mutate()} loading={save.isPending} disabled={!dirty} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '500' }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} thumbColor={value ? colors.ok : colors.muted} />
    </View>
  );
}
