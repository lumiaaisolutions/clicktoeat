/**
 * Unidades de medida de los insumos — fuente única para todos los selectores.
 * El `value` es el código corto que se guarda; el `label` incluye la explicación
 * entre paréntesis para que sea claro al registrar (ej. "g (gramos)").
 *
 * Debe mantenerse a la par con la validación del backend
 * (`Store/UpdateIngredienteRequest`: `in:pz,g,kg,ml,l,oz,lb`).
 */
export type Unidad = 'pz' | 'g' | 'kg' | 'ml' | 'l' | 'oz' | 'lb';

export const UNIDADES: { value: Unidad; label: string }[] = [
  { value: 'pz', label: 'pz (piezas)' },
  { value: 'g',  label: 'g (gramos)' },
  { value: 'kg', label: 'kg (kilogramos)' },
  { value: 'ml', label: 'ml (mililitros)' },
  { value: 'l',  label: 'L (litros)' },
  { value: 'oz', label: 'oz (onzas)' },
  { value: 'lb', label: 'lb (libras)' },
];

/** Código corto "bonito" para mostrar inline (ej. `l` → `L`). */
const CORTO: Record<string, string> = { pz: 'pz', g: 'g', kg: 'kg', ml: 'ml', l: 'L', oz: 'oz', lb: 'lb' };

export const unidadCorta = (u: string): string => CORTO[u] ?? u;

export const UNIDAD_LABEL: Record<string, string> =
  Object.fromEntries(UNIDADES.map((u) => [u.value, u.label]));
