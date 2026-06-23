import { useState } from 'react';
import { Alert, FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCategoria, fetchCategorias, updateCategoria } from '@/features/categorias/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Input } from '@/design/components/Input';
import { colors } from '@/design/tokens';
import type { Categoria } from '@/lib/types';

export default function CategoriasScreen() {
  const qc = useQueryClient();
  const [nuevo, setNuevo] = useState('');

  const query = useQuery({ queryKey: ['categorias'], queryFn: fetchCategorias });

  const create = useMutation({
    mutationFn: () => createCategoria({ nombre: nuevo }),
    onSuccess: () => {
      setNuevo('');
      qc.invalidateQueries({ queryKey: ['categorias'] });
    },
    onError: (e: { response?: { data?: { errors?: Record<string, string[]> } } }) => {
      const msg = e?.response?.data?.errors?.nombre?.[0] ?? 'No se pudo crear';
      Alert.alert('Error', msg);
    },
  });

  const toggle = useMutation({
    mutationFn: (c: Categoria) => updateCategoria(c.id, { activo: !c.activo }),
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: ['categorias'] });
      const prev = qc.getQueryData<Categoria[]>(['categorias']);
      qc.setQueryData<Categoria[]>(['categorias'], (old) =>
        old?.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x)) ?? old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['categorias'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
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
        ListHeaderComponent={
          <Card style={{ marginBottom: 8 }}>
            <Input label="Nueva categoría" value={nuevo} onChangeText={setNuevo} placeholder="Ej. Bebidas" />
            <Button label="Crear" onPress={() => create.mutate()} loading={create.isPending} disabled={!nuevo.trim()} />
          </Card>
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin categorías'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{item.nombre}</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {item.productos_count ?? 0} productos
                </Text>
              </View>
              <Switch
                value={item.activo}
                onValueChange={() => toggle.mutate(item)}
                thumbColor={item.activo ? colors.ok : colors.muted}
              />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
