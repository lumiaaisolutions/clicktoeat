import { useState } from 'react';
import { FlatList, RefreshControl, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { fetchProductos, toggleDisponibilidad } from '@/features/productos/api';
import { PressableCard } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatMoney } from '@/lib/format';
import type { Producto } from '@/lib/types';

export default function ProductosList() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');

  const query = useQuery({
    queryKey: ['productos', q],
    queryFn: () => fetchProductos({ q: q || undefined, per_page: 50 }),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleDisponibilidad,
    onMutate: async (producto) => {
      await qc.cancelQueries({ queryKey: ['productos', q] });
      const prev = qc.getQueryData(['productos', q]);
      qc.setQueryData(['productos', q], (old: typeof query.data) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((p) => (p.id === producto.id ? { ...p, disponible: !p.disponible } : p)),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['productos', q], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={{ padding: 12 }}>
        <TextInput
          placeholder="Buscar producto…"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.line,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 15,
            color: colors.ink,
          }}
        />
      </View>
      <FlatList
        data={query.data?.data ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>
              {query.isLoading ? 'Cargando…' : 'Sin productos'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductoRow
            producto={item}
            onToggle={() => toggleMutation.mutate(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function ProductoRow({ producto, onToggle }: { producto: Producto; onToggle: () => void }) {
  return (
    <Link href={{ pathname: '/(admin)/productos/[id]', params: { id: producto.id } }} asChild>
      <PressableCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
              {producto.nombre}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              {producto.categoria?.nombre ?? '—'}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 6 }}>
              {formatMoney(producto.precio)}
            </Text>
          </View>
          <Switch
            value={producto.disponible}
            onValueChange={onToggle}
            thumbColor={producto.disponible ? colors.ok : colors.muted}
          />
        </View>
      </PressableCard>
    </Link>
  );
}
