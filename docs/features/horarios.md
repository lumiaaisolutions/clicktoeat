# Feature — Horarios y estado del local

`App\Support\HorarioCalculator`.

## Datos persistidos

En `locales`:

| Columna             | Tipo            | Notas                                                   |
|--------------------|-----------------|---------------------------------------------------------|
| `horarios`          | JSON array       | `[{dia:'lun', open:'12:00', close:'23:00'}, ...]`         |
| `cerrado_temporal`  | boolean          | Override manual — siempre gana                          |
| `zona_horaria`      | varchar(60)      | Default `America/Mexico_City`                            |

Validaciones:
- `dia` ∈ `lun, mar, mie, jue, vie, sab, dom`.
- `open`/`close` formato `H:i` (24h).
- Max 7 entradas (una por día).
- `zona_horaria` debe ser una TZ válida (regla `timezone` de Laravel).

## `HorarioCalculator::estado(Local $local)`

Devuelve:
```php
[
  'abierto'          => bool | null,  // null = sin horario definido
  'mensaje'          => string,
  'proxima_apertura' => 'HH:MM' | null,
  'proximo_cierre'   => 'HH:MM' | null,
]
```

### Reglas, en orden

1. Si `cerrado_temporal === true` → `{abierto:false, mensaje:'Cerrado temporalmente'}`.
2. Si `horarios` está vacío → `{abierto:null, mensaje:'Sin horario definido'}`. Esto evita falsos negativos cuando aún no se configuró.
3. Calcular `now` en `zona_horaria`.
4. Indexar horarios por día (`{lun: {open,close}, ...}`).
5. **Chequear hoy y ayer**:
   - Hoy: si el rango actual contiene `now`, está abierto. Devuelve `proximo_cierre = close`.
   - Ayer: si el slot de ayer cruza medianoche (`close < open`) y `now < close`, sigue abierto desde anoche.
6. Si ninguno → buscar próxima apertura en los siguientes 7 días.
   - Si hay slot hoy con `open > now` → `"abre hoy a las HH:MM"`.
   - Si no → buscar día siguiente con slot → `"abre mañana/lunes/martes... a las HH:MM"`.

### Horarios cruzando medianoche

Soportado: si `close < open` el slot se interpreta como "hasta `close` del día siguiente". Ej. bar abierto `19:00 → 02:00`. A las 1:00 AM del martes, está abierto por el slot del **lunes**.

### Edge cases

- Slot con formato inválido (`open` o `close` no parseables) → se ignora ese día.
- Día sin slot → se considera cerrado todo el día.
- Día con dos slots (ej. comida 13-16 + cena 19-23) → **no soportado** (la lista es indexada por día, el último gana). Pendiente: convertir a array de slots por día.

## Endpoints

### `GET /api/v1/local/horarios`
Devuelve `{ horarios, cerrado_temporal, zona_horaria, estado }`.

### `PATCH /api/v1/local/horarios`
Body acepta esos 3 campos. Normalización:
- Ordena por día de semana (`lun → dom`).
- Deduplica por día (último gana si hay duplicados).

### `GET /public/menu/{slug}` y `GET /public/locales`
Incluyen `estado` calculado. Server-side por diseño: si el cliente calculara con su reloj, podría haber drift de zona horaria + hydration mismatch en Next.js.

## Bloqueo de pedidos por horario

`PublicPedidoController::store` evalúa `HorarioCalculator::estado(...)`. Si `abierto === false` → 409 con `{message, estado}`.

**Nota:** `abierto === null` (sin horario definido) **no bloquea** — un local recién creado puede recibir pedidos hasta que configure horarios.

Importante: el POS interno **no** verifica horario. Permite vender presencialmente fuera de horario.

## UI

`apps/web/src/app/admin/horarios/page.tsx` — formulario para configurar los 7 días + toggle `cerrado_temporal` + selector de zona horaria.

## Pendientes

- Multi-slot por día (comida + cena).
- Excepciones por día específico (días feriados, días libres).
- Notificación cuando el local cruza a "abierto" automáticamente (útil para que el owner verifique que el sistema lo abrió correcto).
