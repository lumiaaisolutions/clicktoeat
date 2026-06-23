import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { fetchMyTickets } from '@/features/tickets/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatRelativeTime } from '@/lib/format';

const ESTADO_COLOR: Record<string, string> = {
  abierto: colors.info,
  respondido: colors.warn,
  cerrado: colors.muted,
};

export default function TicketsList() {
  const query = useQuery({ queryKey: ['tickets'], queryFn: fetchMyTickets });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={{ padding: 12 }}>
        <Button label="+ Abrir nuevo ticket" onPress={() => router.push('/(admin)/tickets/nuevo')} />
      </View>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin tickets abiertos'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink, flex: 1 }} numberOfLines={1}>
                {item.asunto}
              </Text>
              <View
                style={{
                  backgroundColor: ESTADO_COLOR[item.estado] ?? colors.muted,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                  {item.estado}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              {item.categoria} · prioridad {item.prioridad}
            </Text>
            {item.created_at ? (
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                {formatRelativeTime(item.created_at)}
              </Text>
            ) : null}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
