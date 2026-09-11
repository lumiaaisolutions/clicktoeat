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

// ── Conversión (espejo de App\Services\Inventory\UnitConverter) ──
// Se usa sólo para el aviso/preview en el modal; la conversión real la hace el
// backend al guardar. Los factores deben coincidir con el PHP.
const FAMILIA: Record<Unidad, 'masa' | 'volumen' | 'conteo'> = {
  g: 'masa', kg: 'masa', oz: 'masa', lb: 'masa', ml: 'volumen', l: 'volumen', pz: 'conteo',
};
const FACTOR: Record<Unidad, number> = {
  g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237, ml: 1, l: 1000, pz: 1,
};

/** ¿El cambio de unidad se puede convertir automáticamente (misma familia)? */
export const puedeConvertir = (desde: Unidad, hasta: Unidad): boolean =>
  desde !== hasta && FAMILIA[desde] === FAMILIA[hasta] && FAMILIA[desde] !== 'conteo';

/** Convierte una cantidad (stock, mínimo) de una unidad a otra. */
export const convertirCantidad = (v: number, desde: Unidad, hasta: Unidad): number =>
  Math.round((v * FACTOR[desde]) / FACTOR[hasta] * 1000) / 1000;

/** Convierte un costo POR unidad (sentido inverso a la cantidad). */
export const convertirCosto = (v: number, desde: Unidad, hasta: Unidad): number =>
  Math.round((v * FACTOR[hasta]) / FACTOR[desde] * 10000) / 10000;
