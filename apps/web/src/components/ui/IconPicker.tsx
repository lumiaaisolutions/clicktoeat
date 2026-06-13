'use client';

import { cn } from '@/lib/utils';
import { Icon, type IconName } from './Icon';

/**
 * Selector visual de iconos para categorías.
 *
 * Reemplaza el viejo input de texto "fa-pizza-slice" por un grid con preview
 * de cada opción. El owner ve el icono real antes de guardar — sin tener que
 * adivinar el nombre de la clase.
 *
 * Lista curada de iconos relevantes para comida/restaurante.
 */

export interface IconOption {
  value: IconName;
  label: string;
}

/**
 * Iconos disponibles para categorías. Curados para el dominio food/restaurant.
 * Si necesitas agregar más, primero agrégalo a `IconName` en Icon.tsx con su
 * SVG path, después añádelo aquí.
 */
export const CATEGORY_ICONS: IconOption[] = [
  // Comida específica
  { value: 'utensils',     label: 'Comida' },
  { value: 'pizza',        label: 'Pizza' },
  { value: 'sandwich',     label: 'Sandwich / burger' },
  { value: 'soup',         label: 'Sopa / caldo' },
  { value: 'beef',         label: 'Carnes' },
  { value: 'drumstick',    label: 'Pollo / aves' },
  { value: 'fish',         label: 'Pescado / mariscos' },
  { value: 'egg',          label: 'Desayunos' },
  { value: 'croissant',    label: 'Panadería' },
  { value: 'popcorn',      label: 'Snacks' },

  // Postres
  { value: 'cake',         label: 'Postres / pastel' },
  { value: 'ice-cream',    label: 'Helados' },
  { value: 'cherry',       label: 'Postres con fruta' },
  { value: 'popsicle',     label: 'Paletas' },
  { value: 'apple',        label: 'Fruta natural' },

  // Bebidas
  { value: 'coffee',       label: 'Café / calientes' },
  { value: 'beer',         label: 'Cerveza' },
  { value: 'wine',         label: 'Vinos' },
  { value: 'martini-glass', label: 'Cócteles' },
  { value: 'cup-soda',     label: 'Refrescos' },
  { value: 'milk',         label: 'Lácteos / batidos' },

  // Conceptos
  { value: 'salad',        label: 'Saludable' },
  { value: 'sprout',       label: 'Vegano' },
  { value: 'wheat',        label: 'Sin gluten' },
  { value: 'flame',        label: 'Picante' },
  { value: 'sun',          label: 'Desayunos / brunch' },
  { value: 'moon',         label: 'Cena' },
  { value: 'gift',         label: 'Combos / paquetes' },
  { value: 'sparkles',     label: 'Especiales' },
  { value: 'star-filled',  label: 'Destacados' },
  { value: 'storefront',   label: 'Take-away' },
  { value: 'truck',        label: 'Delivery' },
];

interface IconPickerProps {
  value: IconName | null | undefined;
  onChange: (icon: IconName) => void;
  /** Label de la sección (opcional) */
  label?: string;
  /** Hint debajo del label */
  hint?: string;
}

export function IconPicker({ value, onChange, label, hint }: IconPickerProps) {
  return (
    <div>
      {(label || hint) && (
        <div className="mb-2">
          {label && <p className="text-sm font-medium">{label}</p>}
          {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
        </div>
      )}

      {/* Preview grande del seleccionado */}
      {value && (
        <div className="mb-3 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[color:var(--ce-bg)] border border-line">
          <span className="w-10 h-10 rounded-lg bg-ink text-white grid place-items-center shrink-0">
            <Icon name={value} size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted uppercase tracking-wider">Icono seleccionado</p>
            <p className="text-sm font-medium truncate">
              {CATEGORY_ICONS.find((i) => i.value === value)?.label ?? value}
            </p>
          </div>
        </div>
      )}

      {/* Grid de opciones */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {CATEGORY_ICONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={active}
              className={cn(
                'group relative aspect-square rounded-xl border-2 grid place-items-center transition-all',
                active
                  ? 'border-ink bg-ink text-white scale-105 shadow-md'
                  : 'border-line bg-white text-ink/70 hover:border-ink/40 hover:text-ink hover:-translate-y-0.5',
              )}
            >
              <Icon name={opt.value} size={20} />
              {active && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white grid place-items-center text-[10px] font-bold shadow-md">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
