import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { PressableCard } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { fetchMyLocales, switchLocal } from '@/features/locales/api';
import { useAuth } from '@/store/auth';
import type { LocalMini } from '@/lib/types';

export default function SwitchLocalScreen() {
  const qc = useQueryClient();
  const refreshMe = useAuth((s) => s.refreshMe);
  const [switching, setSwitching] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['me', 'locales'],
    queryFn: fetchMyLocales,
  });

  const handleSwitch = async (local: LocalMini) => {
    if (switching || local.id === query.data?.current_local_id) return;
    setSwitching(local.id);
    try {
      await switchLocal(local.id);
      // Invalidamos TODA la caché de queries — el local cambió, así que
      // pedidos, métricas, productos, etc. son de un contexto distinto.
      await qc.invalidateQueries();
      await refreshMe();
      router.back();
    } catch (e) {
      Alert.alert('No se pudo cambiar de sucursal', 'Verifica que tienes acceso a esa sucursal.');
    } finally {
      setSwitching(null);
    }
  };

  if (query.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    );
  }

  const locales = query.data?.data ?? [];
  const currentId = query.data?.current_local_id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={locales}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>
            Selecciona la sucursal en la que vas a trabajar. Pedidos, métricas y catálogo cambian de contexto.
          </Text>
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>No tienes sucursales asignadas.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCurrent = item.id === currentId;
          const isSwitching = switching === item.id;
          return (
            <PressableCard
              disabled={isCurrent || !!switching}
              onPress={() => handleSwitch(item)}
              style={{
                borderColor: isCurrent ? colors.ink : colors.line,
                borderWidth: isCurrent ? 2 : 1,
                opacity: switching && !isSwitching ? 0.5 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
                    {item.nombre}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                    {item.slug}
                  </Text>
                </View>
                {isSwitching ? (
                  <ActivityIndicator color={colors.ink} />
                ) : isCurrent ? (
                  <Text style={{ fontSize: 13, color: colors.ink, fontWeight: '700' }}>
                    Actual
                  </Text>
                ) : null}
              </View>
            </PressableCard>
          );
        }}
      />
    </SafeAreaView>
  );
}
