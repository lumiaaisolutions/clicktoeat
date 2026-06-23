import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLocal, updateLocal } from '@/features/local/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Input } from '@/design/components/Input';
import { colors } from '@/design/tokens';

const COLORES_SUGERIDOS = ['#FF2D2D', '#0EA5E9', '#16A34A', '#8B5CF6', '#F59E0B', '#0B0B0F'];

export default function BrandingScreen() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['local'], queryFn: fetchLocal });

  const [nombre, setNombre] = useState('');
  const [tagline, setTagline] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [colorPrim, setColorPrim] = useState<string>(colors.accent);
  const [lealtadActivo, setLealtadActivo] = useState(false);
  const [lealtadMeta, setLealtadMeta] = useState('10');
  const [lealtadPremio, setLealtadPremio] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data || dirty) return;
    const l = query.data;
    setNombre(l.nombre);
    setTagline(l.tagline ?? '');
    setWhatsapp(l.whatsapp ?? '');
    setTelefono(l.telefono ?? '');
    setDireccion(l.direccion ?? '');
    setColorPrim(l.color_primario ?? colors.accent);
    setLealtadActivo(l.lealtad_activo);
    setLealtadMeta(String(l.lealtad_meta ?? 10));
    setLealtadPremio(l.lealtad_premio ?? '');
  }, [query.data, dirty]);

  const save = useMutation({
    mutationFn: () => updateLocal({
      nombre,
      tagline: tagline || null,
      whatsapp,
      telefono: telefono || null,
      direccion: direccion || null,
      color_primario: colorPrim,
      lealtad_activo: lealtadActivo,
      lealtad_meta: parseInt(lealtadMeta, 10) || 10,
      lealtad_premio: lealtadPremio || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['local'] });
      setDirty(false);
      Alert.alert('Listo', 'Cambios guardados.');
    },
    onError: () => Alert.alert('Error', 'No se pudieron guardar los cambios.'),
  });

  if (!query.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.muted }}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Card>
            <Input label="Nombre del local" value={nombre} onChangeText={(v) => { setDirty(true); setNombre(v); }} />
            <Input label="Tagline" value={tagline} onChangeText={(v) => { setDirty(true); setTagline(v); }} />
            <Input
              label="WhatsApp"
              value={whatsapp}
              onChangeText={(v) => { setDirty(true); setWhatsapp(v); }}
              keyboardType="phone-pad"
              hint="Con código de país, ej. 521234567890"
            />
            <Input label="Teléfono" value={telefono} onChangeText={(v) => { setDirty(true); setTelefono(v); }} keyboardType="phone-pad" />
            <Input
              label="Dirección"
              value={direccion}
              onChangeText={(v) => { setDirty(true); setDireccion(v); }}
              multiline
              style={{ minHeight: 60, textAlignVertical: 'top' }}
            />
          </Card>

          <Card>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>
              Color primario
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {COLORES_SUGERIDOS.map((c) => (
                <View
                  key={c}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    backgroundColor: c,
                    borderColor: colorPrim === c ? colors.ink : 'transparent',
                    borderWidth: 3,
                  }}
                  onTouchEnd={() => { setDirty(true); setColorPrim(c); }}
                />
              ))}
            </View>
            <Input
              label="Hex personalizado"
              value={colorPrim}
              onChangeText={(v) => { setDirty(true); setColorPrim(v); }}
              autoCapitalize="characters"
              hint="Ej. #FF2D2D"
            />
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Programa de lealtad</Text>
              <Switch value={lealtadActivo} onValueChange={(v) => { setDirty(true); setLealtadActivo(v); }} />
            </View>
            {lealtadActivo ? (
              <>
                <Input
                  label="Sellos para premio"
                  value={lealtadMeta}
                  onChangeText={(v) => { setDirty(true); setLealtadMeta(v.replace(/[^0-9]/g, '')); }}
                  keyboardType="number-pad"
                />
                <Input
                  label="Premio"
                  value={lealtadPremio}
                  onChangeText={(v) => { setDirty(true); setLealtadPremio(v); }}
                  placeholder="Ej. Una bebida gratis"
                />
              </>
            ) : null}
          </Card>

          <Button label="Guardar cambios" onPress={() => save.mutate()} loading={save.isPending} disabled={!dirty} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
