import { Alert, FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteReview, fetchReviewsAdmin, toggleReviewAprobado } from '@/features/reviews/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatRelativeTime } from '@/lib/format';
import type { Review } from '@/lib/types';

export default function ReviewsScreen() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['reviews-admin'], queryFn: fetchReviewsAdmin });

  const toggle = useMutation({
    mutationFn: (r: Review) => toggleReviewAprobado(r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews-admin'] }),
  });

  const remove = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews-admin'] }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin reseñas'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{item.cliente_nombre}</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>{formatRelativeTime(item.created_at)}</Text>
            </View>
            <Text style={{ fontSize: 16, color: colors.warn }}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
            {item.comentario ? (
              <Text style={{ fontSize: 14, color: colors.ink, marginTop: 6 }}>"{item.comentario}"</Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Switch value={item.aprobado} onValueChange={() => toggle.mutate(item)} thumbColor={item.aprobado ? colors.ok : colors.muted} />
                <Text style={{ fontSize: 12, color: colors.muted }}>{item.aprobado ? 'Aprobada' : 'Oculta'}</Text>
              </View>
              <Button
                label="Borrar"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() =>
                  Alert.alert('Borrar reseña', '¿Seguro?', [
                    { text: 'No', style: 'cancel' },
                    { text: 'Sí', style: 'destructive', onPress: () => remove.mutate(item.id) },
                  ])
                }
              />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
