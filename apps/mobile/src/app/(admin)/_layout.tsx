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
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.ink, fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabIcon char="◉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon char="●" color={color} />,
        }}
      />
      <Tabs.Screen
        name="metricas"
        options={{
          title: 'Métricas',
          tabBarIcon: ({ color }) => <TabIcon char="▲" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <TabIcon char="◐" color={color} />,
        }}
      />
    </Tabs>
  );
}
