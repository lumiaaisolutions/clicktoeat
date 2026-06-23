import { useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllLocales, reactivarLocal, suspenderLocal } from '@/features/super/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import type { LocalFull } from '@/lib/types';

export default function SuperLocales() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');

  const query = useQuery({
    queryKey: ['super-locales', q],
    queryFn: () => fetchAllLocales(q || undefined),
  });

  const suspender = useMutation({
    mutationFn: (l: LocalFull) => suspenderLocal(l.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-locales'] }),
  });

  const reactivar = useMutation({
    mutationFn: (l: LocalFull) => reactivarLocal(l.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-locales'] }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={{ padding: 12 }}>
        <TextInput
          placeholder="Buscar local…"
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
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin locales'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={item.suspendido ? { opacity: 0.6 } : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1 }} numberOfLines={1}>
                {item.nombre}
              </Text>
              {item.plan_status ? (
                <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase' }}>
                  {item.plan_status}
                </Text>
              ) : null}
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{item.slug}</Text>
            <View style={{ marginTop: 10 }}>
              {item.suspendido ? (
                <Button
                  label="Reactivar"
                  variant="primary"
                  size="sm"
                  onPress={() =>
                    Alert.alert('Reactivar', `¿Reactivar ${item.nombre}?`, [
                      { text: 'No', style: 'cancel' },
                      { text: 'Sí', onPress: () => reactivar.mutate(item) },
                    ])
                  }
                />
              ) : (
                <Button
                  label="Suspender"
                  variant="danger"
                  size="sm"
                  onPress={() =>
                    Alert.alert('Suspender', `¿Suspender ${item.nombre}?`, [
                      { text: 'No', style: 'cancel' },
                      { text: 'Sí, suspender', style: 'destructive', onPress: () => suspender.mutate(item) },
                    ])
                  }
                />
              )}
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
