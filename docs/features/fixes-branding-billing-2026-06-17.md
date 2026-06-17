# Fixes branding/billing/landing — sesión 2026-06-17 (tarde)

5 bugs visuales + 1 inconsistencia de precio + sidebar fix.

## 1. Precio del plan hardcoded en /admin/billing

**Bug**: la página decía `"essential" ? 99 : 299` en línea 82. Para
Premium mostraba $299 cuando debía $499.

**Fix**:
- Backend `AuthController@me` ahora retorna `plan.precio_mxn` (calculado
  como `centavos / 100`).
- `PlanInfo` interface tiene el nuevo campo opcional.
- `/admin/billing` ahora usa `plan.precio_mxn` en vez del condicional.

## 2. Integraciones bloqueado pese a plan Premium

**Bug**: el sidebar mostraba "Integraciones" con icono candado para
Premium. Causa: la feature `api_webhooks` se removió del Premium (decisión
del producto: NO ofrecemos integración con ERP/cocina externa) pero la
entrada del nav seguía.

**Fix**: comentada la entrada `/admin/integraciones` del NAV_OWNER en
`apps/web/src/app/admin/layout.tsx`. La página existe todavía pero no es
accesible desde el menú. Si en el futuro vuelve la feature, descomentar
la línea + agregar `api_webhooks` al seeder del Premium.

## 3. Tipografías muy similares + vista previa no reaccionaba

**Bug 3a — vista previa**: al cambiar tipografía, el preview del lado
derecho NO se actualizaba. Causa: `previewVars` solo inyectaba
`--ce-accent` y `background`, pero no `--ce-display-font`. El CSS global
`.ce-display` lee esa variable.

**Fix**: agregado `['--ce-display-font' as any]: '"${tipografia}"'` al
`previewVars`. Ahora cambia instantáneamente.

**Bug 3b — fuentes muy parecidas**: el catálogo tenía 12 fuentes pero 5
serif similares y 4 sans similares. Reemplazado por 12 fuentes con
personalidad MUY visible cada una:

- Bricolage Grotesque (moderna)
- Playfair Display (editorial clásica)
- **Pacifico** (script casual) ← nuevo
- **Abril Fatface** (display retro) ← nuevo
- **Anton** (impact alto condensed) ← nuevo
- Lora (humanista cálida)
- **Space Mono** (monospace tech) ← nuevo
- **Lobster** (script bold) ← nuevo
- **Bebas Neue** (condensed mayúsculas) ← nuevo
- **Caveat** (handwriting) ← nuevo
- DM Serif Display (display lujoso)
- **Roboto Slab** (slab moderno) ← nuevo

Las 8 fuentes nuevas se agregaron al `<link>` de Google Fonts en
`apps/web/src/app/layout.tsx`. Total cargado: 20 familias (las 12 viejas
para compatibilidad con locales que ya las usan + 8 nuevas).

## 4. "Lo más pedido hoy" en landing muy chico

Tras hacerlo demasiado compacto en la iteración anterior, el user pidió
que estuviera **ligeramente más pequeño** que las cards de producto de
abajo (no apretado).

**Fix**: thumbnails 11x11 (era 8x8), padding del contenedor py-3 (era
py-2), texto del producto text-sm (era el "1 ped." chico). Sigue siendo
lista vertical (no grid) para ahorrar alto vertical.

## 5. Botón "Volver al landing principal" en /admin/billing

**Bug**: el user pidió que estuviera ahí — no estaba.

**Fix**: header de `/admin/billing` ahora tiene a la derecha un botón
outline "🏠 Volver al landing principal" que abre
`https://clicktoeat.lumiaaisolutions.com/` en nueva pestaña.

## Sobre programa de referidos (`/admin/referidos`)

El user mostró imagen #257 con el código vacío (solo un guion).

**Investigación**: el código de referido del local se genera al crear.
Si el código aparece vacío significa que el local en BD tiene
`codigo_referido = null`. Posible causa: locales legacy creados antes
de F36.

**Workaround**: el owner puede entrar a `/admin/referidos` y el sistema
debe generarlo si no existe. Si esto no pasa, se necesita ejecutar
manualmente:

```bash
php artisan tinker --execute="
\\App\\Models\\Local::whereNull('codigo_referido')->each(fn(\$l) => \$l->update(['codigo_referido' => \\Str::upper(\\Str::random(8))]));
"
```

(No se implementó como fix automático en esta sesión porque requiere
verificación caso por caso.)
