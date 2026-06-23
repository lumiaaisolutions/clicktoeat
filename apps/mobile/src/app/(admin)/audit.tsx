import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { fetchAuditLogs } from '@/features/audit/api';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatRelativeTime } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

const ACTION_LABEL: Record<string, string> = {
  created: 'creó',
  updated: 'editó',
  deleted: 'borró',
  restored: 'restauró',
};

const ACTION_COLOR: Record<string, string> = {
  created: colors.ok,
  updated: colors.info,
  deleted: colors.accent,
  restored: colors.warn,
};

export default function AuditLogScreen() {
  const query = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => fetchAuditLogs(1),
    retry: false,
  });

  const err = query.error as AxiosError<{ code?: string }> | null;
  const isFeatureLocked = err?.response?.status === 402;

  if (isFeatureLocked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 8, textAlign: 'center' }}>
          Audit log
        </Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>
          Esta función requiere el plan Premium. Actualiza tu plan desde el panel web.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <FlatList
        data={query.data?.data ?? []}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ padding: 16, gap: 6 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.ink} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>{query.isLoading ? 'Cargando…' : 'Sin actividad reciente'}</Text>
          </View>
        }
        renderItem={({ item }) => <AuditRow log={item} />}
      />
    </SafeAreaView>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const actor = log.actor?.nombre ?? 'Sistema';
  const verbo = ACTION_LABEL[log.action] ?? log.action;
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 14, color: colors.ink }}>
          <Text style={{ fontWeight: '700' }}>{actor}</Text>
          {' '}
          <Text style={{ color: ACTION_COLOR[log.action] ?? colors.muted, fontWeight: '600' }}>{verbo}</Text>
          {' '}
          <Text style={{ color: colors.muted }}>{log.resource_type} #{log.resource_id}</Text>
        </Text>
        <Text style={{ fontSize: 11, color: colors.muted }}>{formatRelativeTime(log.created_at)}</Text>
      </View>
    </Card>
  );
}
