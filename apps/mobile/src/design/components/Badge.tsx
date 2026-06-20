import { Text, View } from 'react-native';
import { colors, PEDIDO_ESTADO_COLORS, PEDIDO_ESTADO_LABEL } from '../tokens';
import type { PedidoEstado } from '@/lib/types';

interface BadgeProps {
  estado: PedidoEstado;
}

export function EstadoBadge({ estado }: BadgeProps) {
  const bg = PEDIDO_ESTADO_COLORS[estado] ?? colors.muted;
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
        {PEDIDO_ESTADO_LABEL[estado] ?? estado}
      </Text>
    </View>
  );
}
