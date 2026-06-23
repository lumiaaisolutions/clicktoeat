import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/design/components/Button';
import { PressableCard, Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { useAuth } from '@/store/auth';

type MenuItem = { route: string; title: string; subtitle?: string };

const OPERACION: MenuItem[] = [
  { route: '/(admin)/notificaciones', title: 'Notificaciones', subtitle: 'Alertas e historial' },
  { route: '/(admin)/metricas',       title: 'Métricas',       subtitle: 'Ventas, top productos' },
  { route: '/(admin)/horarios',       title: 'Horarios',       subtitle: 'Abierto / cerrado por día' },
];

const CATALOGO: MenuItem[] = [
  { route: '/(admin)/productos',  title: 'Productos',  subtitle: 'Lista, precio, disponibilidad' },
  { route: '/(admin)/categorias', title: 'Categorías', subtitle: 'Agrupar productos' },
  { route: '/(admin)/cupones',    title: 'Cupones',    subtitle: 'Descuentos activos' },
];

const INVENTARIO: MenuItem[] = [
  { route: '/(admin)/inventario', title: 'Inventario', subtitle: 'Ingredientes y stock' },
  { route: '/(admin)/compras',    title: 'Compras',    subtitle: 'Compras a proveedor' },
];

const NEGOCIO: MenuItem[] = [
  { route: '/(admin)/reviews',  title: 'Reseñas',     subtitle: 'Moderar opiniones' },
  { route: '/(admin)/staff',    title: 'Staff',       subtitle: 'Equipo del local' },
  { route: '/(admin)/branding', title: 'Local y marca', subtitle: 'Nombre, colores, lealtad' },
];

const SOPORTE: MenuItem[] = [
  { route: '/(admin)/tickets', title: 'Tickets de soporte', subtitle: 'Hablar con el equipo Lumia' },
  { route: '/(admin)/audit',   title: 'Auditoría',          subtitle: 'Historial de cambios (Premium)' },
];

export default function SettingsScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const isSuper = user?.rol === 'super_admin';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card>
          <Text style={{ fontSize: 12, color: colors.muted }}>Sesión</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 2 }}>{user?.nombre}</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{user?.email}</Text>
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6, textTransform: 'uppercase', fontWeight: '700' }}>
            {user?.rol}
          </Text>
        </Card>

        <Section title="Operación" items={OPERACION} />
        <Section title="Catálogo" items={CATALOGO} />
        <Section title="Inventario" items={INVENTARIO} />
        <Section title="Negocio" items={NEGOCIO} />
        <Section title="Soporte" items={SOPORTE} />

        {isSuper ? (
          <Section
            title="Super admin"
            items={[{ route: '/(admin)/super', title: 'Panel super admin', subtitle: 'Locales, MRR, anuncios' }]}
          />
        ) : null}

        <View style={{ gap: 10, marginTop: 4 }}>
          <Button
            label="Cambiar de sucursal"
            variant="secondary"
            onPress={() => router.push('/(admin)/switch-local')}
          />
          <Button
            label="Cerrar sesión"
            variant="danger"
            onPress={() =>
              Alert.alert('Cerrar sesión', '¿Seguro?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sí', style: 'destructive', onPress: () => logout() },
              ])
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700', textTransform: 'uppercase' }}>
        {title}
      </Text>
      {items.map((it) => (
        <PressableCard key={it.route} onPress={() => router.push(it.route)}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{it.title}</Text>
          {it.subtitle ? (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{it.subtitle}</Text>
          ) : null}
        </PressableCard>
      ))}
    </View>
  );
}
