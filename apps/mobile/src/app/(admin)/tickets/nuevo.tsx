import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createTicket } from '@/features/tickets/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Input } from '@/design/components/Input';
import { colors } from '@/design/tokens';

const CATEGORIAS = ['general', 'bug', 'feature', 'billing'];
const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'];

export default function NuevoTicket() {
  const qc = useQueryClient();
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [categoria, setCategoria] = useState('general');
  const [prioridad, setPrioridad] = useState('media');

  const create = useMutation({
    mutationFn: () => createTicket({ asunto, mensaje, categoria, prioridad }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'No se pudo crear el ticket.'),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Card>
            <Input label="Asunto" value={asunto} onChangeText={setAsunto} maxLength={200} />
            <Input
              label="Describe el problema"
              value={mensaje}
              onChangeText={setMensaje}
              multiline
              numberOfLines={6}
              maxLength={5000}
              style={{ minHeight: 140, textAlignVertical: 'top' }}
            />
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Categoría</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {CATEGORIAS.map((c) => (
                <Button
                  key={c}
                  label={c}
                  variant={categoria === c ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth={false}
                  onPress={() => setCategoria(c)}
                />
              ))}
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Prioridad</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {PRIORIDADES.map((p) => (
                <Button
                  key={p}
                  label={p}
                  variant={prioridad === p ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth={false}
                  onPress={() => setPrioridad(p)}
                />
              ))}
            </View>
          </Card>
          <Button
            label="Enviar ticket"
            onPress={() => create.mutate()}
            loading={create.isPending}
            disabled={!asunto.trim() || !mensaje.trim()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
