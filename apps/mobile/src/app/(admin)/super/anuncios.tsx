import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetchAnunciosGlobales } from '@/features/super/api';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';

const SEV_COLOR: Record<string, string> = {
  info:    colors.info,
  warning: colors.warn,
  success: colors.ok,
  danger:  colors.accent,
};

export default function AnunciosScreen() {
  const query = useQuery({ queryKey: ['anuncios-globales'], queryFn: fetchAnunciosGlobales });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListHeaderComponent={
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>
            Crear / editar anuncios desde el panel web.
          </Text>
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin anuncios'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card
            style={{
              borderLeftColor: SEV_COLOR[item.severity] ?? colors.muted,
              borderLeftWidth: 4,
              opacity: item.active ? 1 : 0.5,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{item.titulo}</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{item.body}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8, textTransform: 'uppercase' }}>
              {item.active ? 'Activo' : 'Inactivo'} · {item.severity}
            </Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
