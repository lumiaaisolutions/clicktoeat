import { ScrollView, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { useAuth } from '@/store/auth';

export default function SettingsScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Sesión</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{user?.nombre}</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>{user?.email}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
            Rol: {user?.rol}
          </Text>
        </Card>

        <View style={{ marginTop: 8 }}>
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
