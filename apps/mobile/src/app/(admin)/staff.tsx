import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetchStaff } from '@/features/staff/api';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';

const ROL_LABEL: Record<string, string> = {
  owner: 'Dueño',
  staff: 'Staff',
  super_admin: 'Super admin',
};

export default function StaffScreen() {
  const query = useQuery({ queryKey: ['staff'], queryFn: fetchStaff });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListHeaderComponent={
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>
            Crea o cambia permisos de staff desde el panel web — la app móvil es solo lectura.
          </Text>
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin staff'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{item.nombre}</Text>
              <View
                style={{
                  backgroundColor: item.rol === 'owner' ? colors.ink : colors.line,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    color: item.rol === 'owner' ? '#FFFFFF' : colors.ink,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {ROL_LABEL[item.rol] ?? item.rol}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{item.email}</Text>
            {item.permisos?.length ? (
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
                Permisos: {item.permisos.join(', ')}
              </Text>
            ) : null}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
