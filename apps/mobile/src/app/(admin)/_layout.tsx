import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import type { ColorValue } from 'react-native';
import { colors } from '@/design/tokens';

function TabIcon({ char, color }: { char: string; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{char}</Text>;
}

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon char="◉" color={color} /> }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{ title: 'Pedidos', headerShown: false, tabBarIcon: ({ color }) => <TabIcon char="●" color={color} /> }}
      />
      <Tabs.Screen
        name="buscar"
        options={{ title: 'Buscar', tabBarIcon: ({ color }) => <TabIcon char="◎" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Más', tabBarIcon: ({ color }) => <TabIcon char="◐" color={color} /> }}
      />

      {/* Rutas ocultas del tab bar — accesibles desde el menú o por router.push */}
      <Tabs.Screen name="metricas"       options={{ href: null, title: 'Métricas' }} />
      <Tabs.Screen name="notificaciones" options={{ href: null, title: 'Notificaciones' }} />
      <Tabs.Screen name="productos"      options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="categorias"     options={{ href: null, title: 'Categorías' }} />
      <Tabs.Screen name="horarios"       options={{ href: null, title: 'Horarios' }} />
      <Tabs.Screen name="inventario"     options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="compras"        options={{ href: null, title: 'Compras' }} />
      <Tabs.Screen name="cupones"        options={{ href: null, title: 'Cupones' }} />
      <Tabs.Screen name="reviews"        options={{ href: null, title: 'Reseñas' }} />
      <Tabs.Screen name="staff"          options={{ href: null, title: 'Staff' }} />
      <Tabs.Screen name="branding"       options={{ href: null, title: 'Local y marca' }} />
      <Tabs.Screen name="tickets"        options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="audit"          options={{ href: null, title: 'Audit log' }} />
      <Tabs.Screen name="switch-local"   options={{ href: null, title: 'Cambiar sucursal' }} />
      <Tabs.Screen name="super"          options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
