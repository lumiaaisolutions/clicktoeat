import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotificaciones, marcarNotifLeida, marcarTodasLeidas } from '@/features/notificaciones/api';
import { PressableCard } from '@/design/components/Card';
import { Button } from '@/design/components/Button';
import { colors } from '@/design/tokens';
import { formatRelativeTime } from '@/lib/format';
import type { Notificacion } from '@/lib/types';

export default function NotificacionesScreen() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => fetchNotificaciones(false),
    refetchInterval: 30_000,
  });

  const leerOne = useMutation({
    mutationFn: marcarNotifLeida,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  const leerAll = useMutation({
    mutationFn: marcarTodasLeidas,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  const items = query.data?.data ?? [];
  const noLeidas = query.data?.no_leidas ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      {noLeidas > 0 ? (
        <View style={{ padding: 12 }}>
          <Button
            label={`Marcar ${noLeidas} como leídas`}
            variant="secondary"
            onPress={() => leerAll.mutate()}
            loading={leerAll.isPending}
          />
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ padding: 16, paddingTop: noLeidas > 0 ? 4 : 16, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>
              {query.isLoading ? 'Cargando…' : 'Sin notificaciones'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <NotifRow item={item} onPress={() => !item.leida && leerOne.mutate(item.id)} />}
      />
    </SafeAreaView>
  );
}

function NotifRow({ item, onPress }: { item: Notificacion; onPress: () => void }) {
  return (
    <PressableCard
      onPress={onPress}
      style={{
        backgroundColor: item.leida ? colors.surface : '#FFF5F5',
        borderColor: item.leida ? colors.line : colors.accent,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink, flex: 1 }} numberOfLines={1}>
          {item.titulo}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 8 }}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>
      <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{item.mensaje}</Text>
    </PressableCard>
  );
}
