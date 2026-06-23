import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { fetchIngredientes } from '@/features/inventario/api';
import { PressableCard } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatMoney } from '@/lib/format';
import type { Ingrediente } from '@/lib/types';

export default function InventarioList() {
  const [soloBajo, setSoloBajo] = useState(false);

  const query = useQuery({
    queryKey: ['ingredientes', soloBajo],
    queryFn: () => fetchIngredientes(soloBajo),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <Chip label="Todos" active={!soloBajo} onPress={() => setSoloBajo(false)} />
        <Chip label="Bajo stock" active={soloBajo} onPress={() => setSoloBajo(true)} />
      </View>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin ingredientes'}</Text>
          </View>
        }
        renderItem={({ item }) => <IngredienteRow ing={item} />}
      />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.ink : colors.surface,
        borderColor: active ? colors.ink : colors.line,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: active ? '#FFFFFF' : colors.ink, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function IngredienteRow({ ing }: { ing: Ingrediente }) {
  return (
    <Link href={{ pathname: '/(admin)/inventario/[id]', params: { id: ing.id } }} asChild>
      <PressableCard
        style={ing.bajo_stock ? { borderColor: colors.accent, borderWidth: 2 } : undefined}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{ing.nombre}</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              Costo: {formatMoney(ing.costo_unitario)}/{ing.unidad}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: ing.bajo_stock ? colors.accent : colors.ink,
              }}
            >
              {ing.stock} {ing.unidad}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              mín: {ing.stock_minimo}
            </Text>
          </View>
        </View>
      </PressableCard>
    </Link>
  );
}
