export const colors = {
  ink:     '#0B0B0F',
  bg:      '#FAFAF7',
  line:    '#E8E8E2',
  muted:   '#6B6B6B',
  surface: '#FFFFFF',
  accent:  '#FF2D2D',
  ok:      '#16A34A',
  warn:    '#F59E0B',
  info:    '#0EA5E9',
} as const;

export const radii = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
  '2xl': 28,
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  '2xl': 32,
} as const;

export const PEDIDO_ESTADO_COLORS: Record<string, string> = {
  nuevo:      '#FF2D2D',
  confirmado: '#0EA5E9',
  preparando: '#F59E0B',
  listo:      '#16A34A',
  en_camino:  '#8B5CF6',
  entregado:  '#6B6B6B',
  cancelado:  '#94A3B8',
};

export const PEDIDO_ESTADO_LABEL: Record<string, string> = {
  nuevo:      'Nuevo',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  listo:      'Listo',
  en_camino:  'En camino',
  entregado:  'Entregado',
  cancelado:  'Cancelado',
};
