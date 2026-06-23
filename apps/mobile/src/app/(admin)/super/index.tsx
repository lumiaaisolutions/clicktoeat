import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PressableCard } from '@/design/components/Card';
import { colors } from '@/design/tokens';

const SECCIONES = [
  { route: '/(admin)/super/locales',  title: 'Locales',      desc: 'Listar, suspender, reactivar' },
  { route: '/(admin)/super/metrics',  title: 'SaaS metrics', desc: 'MRR, ARR, churn, distribución' },
  { route: '/(admin)/super/anuncios', title: 'Anuncios',     desc: 'Banner global para todos los locales' },
] as const;

export default function SuperHome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>
          Herramientas exclusivas de super admin. El resto (cupones globales, newsletter,
          tickets globales, email templates, audit log global) está en el panel web.
        </Text>
        {SECCIONES.map((s) => (
          <PressableCard key={s.route} onPress={() => router.push(s.route)}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{s.title}</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{s.desc}</Text>
          </PressableCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
