import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHorarios, updateHorarios } from '@/features/horarios/api';
import { Button } from '@/design/components/Button';
import { Card } from '@/design/components/Card';
import { Input } from '@/design/components/Input';
import { colors } from '@/design/tokens';
import type { HorarioSlot } from '@/lib/types';

const DIAS: Array<{ key: HorarioSlot['dia']; label: string }> = [
  { key: 'lun', label: 'Lunes' },
  { key: 'mar', label: 'Martes' },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' },
  { key: 'vie', label: 'Viernes' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

export default function HorariosScreen() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['horarios'], queryFn: fetchHorarios });

  const [slots, setSlots] = useState<Record<HorarioSlot['dia'], HorarioSlot | null>>({
    lun: null, mar: null, mie: null, jue: null, vie: null, sab: null, dom: null,
  });
  const [cerrado, setCerrado] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data || dirty) return;
    const next: Record<HorarioSlot['dia'], HorarioSlot | null> = {
      lun: null, mar: null, mie: null, jue: null, vie: null, sab: null, dom: null,
    };
    for (const h of query.data.horarios) {
      next[h.dia] = h;
    }
    setSlots(next);
    setCerrado(query.data.cerrado_temporal);
  }, [query.data, dirty]);

  const save = useMutation({
    mutationFn: () => updateHorarios({
      horarios: Object.values(slots).filter((s): s is HorarioSlot => !!s),
      cerrado_temporal: cerrado,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios'] });
      Alert.alert('Listo', 'Horarios actualizados.');
    },
    onError: () => Alert.alert('No se pudo guardar', 'Revisa los datos e intenta de nuevo.'),
  });

  const setOpen = (dia: HorarioSlot['dia'], abierto: boolean) => {
    setDirty(true);
    setSlots((prev) => ({
      ...prev,
      [dia]: abierto ? { dia, open: '09:00', close: '22:00' } : null,
    }));
  };

  const setTime = (dia: HorarioSlot['dia'], field: 'open' | 'close', value: string) => {
    setDirty(true);
    setSlots((prev) => {
      const s = prev[dia];
      if (!s) return prev;
      return { ...prev, [dia]: { ...s, [field]: value } };
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>Cerrado temporal</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                Activar para pausar pedidos sin tocar horarios.
              </Text>
            </View>
            <Switch value={cerrado} onValueChange={(v) => { setDirty(true); setCerrado(v); }} />
          </View>
        </Card>

        {DIAS.map(({ key, label }) => {
          const s = slots[key];
          const abierto = !!s;
          return (
            <Card key={key}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{label}</Text>
                <Switch
                  value={abierto}
                  onValueChange={(v) => setOpen(key, v)}
                  thumbColor={abierto ? colors.ok : colors.muted}
                />
              </View>
              {abierto ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Abre" value={s!.open} onChangeText={(v) => setTime(key, 'open', v)} placeholder="09:00" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Cierra" value={s!.close} onChangeText={(v) => setTime(key, 'close', v)} placeholder="22:00" />
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })}

        <Button label="Guardar horarios" onPress={() => save.mutate()} loading={save.isPending} disabled={!dirty} />
      </ScrollView>
    </SafeAreaView>
  );
}
