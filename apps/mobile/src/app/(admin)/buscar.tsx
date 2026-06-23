import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { searchGlobal } from '@/features/search/api';
import { PressableCard } from '@/design/components/Card';
import { colors } from '@/design/tokens';
import { formatMoney } from '@/lib/format';

export default function BuscarScreen() {
  const [q, setQ] = useState('');

  const query = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchGlobal(q),
    enabled: q.trim().length >= 2,
  });

  const r = query.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right']}>
      <View style={{ padding: 12 }}>
        <TextInput
          placeholder="Buscar pedido, producto, cliente…"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          autoFocus
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.line,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: colors.ink,
          }}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}>
        {q.trim().length < 2 ? (
          <Text style={{ color: colors.muted, paddingTop: 40, textAlign: 'center' }}>
            Escribe al menos 2 letras para buscar.
          </Text>
        ) : null}

        {r?.pedidos.length ? (
          <Section title="Pedidos">
            {r.pedidos.map((p) => (
              <PressableCard
                key={p.id}
                onPress={() => router.push({ pathname: '/(admin)/pedidos/[id]', params: { id: p.id } })}
              >
                <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '700' }}>{p.codigo}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 2 }}>
                  {p.cliente_nombre}
                </Text>
                <Text style={{ fontSize: 14, color: colors.ink, marginTop: 4 }}>{formatMoney(p.total)}</Text>
              </PressableCard>
            ))}
          </Section>
        ) : null}

        {r?.productos.length ? (
          <Section title="Productos">
            {r.productos.map((p) => (
              <PressableCard
                key={p.id}
                onPress={() => router.push({ pathname: '/(admin)/productos/[id]', params: { id: p.id } })}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{p.nombre}</Text>
                <Text style={{ fontSize: 14, color: colors.ink, marginTop: 4 }}>
                  {formatMoney(p.precio)}{!p.disponible ? '  ·  No disponible' : ''}
                </Text>
              </PressableCard>
            ))}
          </Section>
        ) : null}

        {r?.clientes.length ? (
          <Section title="Clientes">
            {r.clientes.map((c, idx) => (
              <PressableCard key={idx} onPress={() => {}}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{c.cliente_nombre}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{c.cliente_telefono}</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                  {c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'}
                </Text>
              </PressableCard>
            ))}
          </Section>
        ) : null}

        {q.trim().length >= 2 && !query.isLoading && r &&
          r.pedidos.length === 0 && r.productos.length === 0 && r.clientes.length === 0 ? (
          <Text style={{ color: colors.muted, paddingTop: 40, textAlign: 'center' }}>
            Sin resultados para "{q}".
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
