# Cierre de sesión — 2026-06-30

## Qué se hizo

### Automatizaciones IA con n8n + Ollama

Diseño e implementación del primer workflow de IA conectado a la BD de producción.

**Objetivo:** bot que analiza el historial del cliente y da recomendaciones personalizadas antes de que haga su pedido.

---

## Infraestructura configurada

### Remote MySQL en Hostinger

Para que n8n (externo al VPS) pueda consultar la BD:

- Habilitado en **hPanel → Databases → Remote MySQL**
- Base: `u221820910_clicktoeat` con `Access host: %`
- **Host real de MySQL** (no el VPS): `srv943.hstgr.io` / `31.97.208.164`
- Puerto: `3306`

> El host del VPS (`86.38.202.72`) NO es el mismo que el host MySQL de Hostinger. Siempre usar `srv943.hstgr.io` para conexiones externas.

---

## Workflow n8n

**URL webhook producción:** `http://2.24.123.93:5678/webhook/3ad747d0-ccd1-4af3-bca1-4ab0f93b924f`

**URL webhook test:** `http://2.24.123.93:5678/webhook-test/3ad747d0-ccd1-4af3-bca1-4ab0f93b924f`

### Estructura de nodos

```
Webhook → Execute a SQL query → Execute a SQL query1 → Edit Fields → Basic LLM Chain
                                                                            ↓
                                                                      Ollama Model
```

### POST body

```json
{
  "session_id": "uuid-cualquiera",
  "local_slug": "postres-stitch",
  "cliente_telefono": "7222695572"
}
```

`session_id` → solo para n8n (no mapea a BD).
`local_slug` → mapea a `locales.slug`.
`cliente_telefono` → mapea a `pedidos.cliente_telefono` (no hay tabla clientes).

---

## Queries SQL

### Query 1 — Contexto cliente + local (`Execute a SQL query`)

Parámetros posicionales: `$1 = cliente_telefono`, `$2 = local_slug`

```sql
SELECT
  l.id                 AS local_id,
  l.nombre             AS local_nombre,
  l.whatsapp,
  l.delivery_fee,
  h.cliente_nombre,
  h.total_pedidos,
  h.ultimo_pedido_at,
  h.productos_favoritos
FROM locales l
LEFT JOIN (
  SELECT
    p.local_id,
    p.cliente_nombre,
    COUNT(DISTINCT p.id)                            AS total_pedidos,
    MAX(p.created_at)                               AS ultimo_pedido_at,
    GROUP_CONCAT(dp.producto_nombre SEPARATOR ', ') AS productos_favoritos
  FROM pedidos p
  JOIN detalle_pedidos dp ON dp.pedido_id = p.id
  WHERE p.cliente_telefono = $1
    AND p.estado           != 'cancelado'
    AND p.deleted_at       IS NULL
  GROUP BY p.local_id, p.cliente_nombre
) h ON h.local_id = l.id
WHERE l.slug       = $2
  AND l.activo     = 1
  AND l.suspendido = 0
  AND l.deleted_at IS NULL;
```

Query Parameters (campo en n8n):
```
{{ $json.body.cliente_telefono }},{{ $json.body.local_slug }}
```

### Query 2 — Catálogo del local (`Execute a SQL query1`)

Parámetro: `$1 = local_id` del resultado del Query 1.

```sql
SELECT
  c.nombre  AS categoria,
  p.id      AS producto_id,
  p.nombre  AS producto_nombre,
  p.descripcion,
  p.precio,
  p.precio_descuento,
  p.es_promocion,
  p.tag
FROM productos p
JOIN categorias c ON c.id = p.categoria_id
WHERE p.local_id    = $1
  AND p.disponible  = 1
  AND p.deleted_at  IS NULL
  AND c.activo      = 1
ORDER BY c.orden, p.orden;
```

Query Parameters:
```
{{ $('Execute a SQL query').first().json.local_id }}
```

---

## Prompt del Basic LLM Chain

```
Eres un asistente de pedidos para {{ $('Execute a SQL query').first().json.local_nombre }}.
Responde siempre en español, de forma amigable y concisa.

IMPORTANTE: Responde TODO en UN SOLO mensaje. No hagas preguntas intermedias.
Da el saludo, las recomendaciones y el menú completo de una sola vez.

=== DATOS DEL CLIENTE ===
{% if $('Execute a SQL query').first().json.total_pedidos %}
- Nombre: {{ $('Execute a SQL query').first().json.cliente_nombre }}
- Pedidos anteriores: {{ $('Execute a SQL query').first().json.total_pedidos }}
- Sus favoritos: {{ $('Execute a SQL query').first().json.productos_favoritos }}
{% else %}
- Cliente nuevo, sin historial
{% endif %}

=== MENÚ DISPONIBLE ===
{{ $('Execute a SQL query1').all().map(p => `[${p.json.categoria}] ${p.json.producto_nombre} - $${p.json.precio}${p.json.descripcion ? ' · ' + p.json.descripcion : ''}${p.json.es_promocion ? ' PROMO' : ''}`).join('\n') }}

=== TU RESPUESTA (un solo mensaje) ===
1. Saluda al cliente por nombre si es recurrente, menciona sus favoritos
2. Recomienda 2-3 productos con precio
3. Muestra el menú completo organizado por categoría
4. Pregunta con qué quiere proceder

No hagas múltiples turnos de conversación. Todo en un mensaje.
```

**Configuración importante:** en Settings del nodo Basic LLM Chain → activar **Execute Once** para que corra una sola vez aunque entren 9 items del menú.

---

## Resultado verificado con datos reales

Query ejecutado contra `u221820910_clicktoeat`:

| Campo | Valor real |
|---|---|
| `local_nombre` | Postres Cost.co Stitch |
| `whatsapp` | 7131121266 |
| `cliente_nombre` | Denisse |
| `total_pedidos` | 2 |
| `ultimo_pedido_at` | 2026-06-05 19:37:09 |
| `productos_favoritos` | Fresas con Crema y Nutella, Pay de limón |

Output del bot: reconoció a Denisse, mencionó sus favoritos, recomendó Pastel Matilda + Chocoflan + Pastel Red Velvet, mostró menú completo. ~650 tokens, ~20s con Ollama local.

---

## Pendiente — próximas sesiones

### 1. Flujo de registro del pedido

Cuando el cliente confirme, el bot debe outputear JSON y n8n debe registrarlo en Laravel:

```
Basic LLM Chain
      ↓
IF — texto contiene "pedido_listo": true
      ↓ SÍ
Code node — extrae JSON del texto:
  const match = text.match(/\{[\s\S]*"pedido_listo"[\s\S]*\}/);
  return [{ json: JSON.parse(match[0]) }];
      ↓
HTTP Request → POST https://clicktoeat-api.lumiaaisolutions.com/api/v1/pedidos
      ↓
Respond → confirmación + link WhatsApp
```

El prompt debe incluir `producto_id` en el JSON final (no solo `producto_nombre`) para que la API de Laravel lo acepte.

### 2. Chat widget en el frontend

En la página pública `/{slug}` agregar botón "Pedir por chat" que:
- Conoce el `slug` de la URL
- Pide el teléfono al cliente al inicio
- Hace POST al webhook con `{ local_slug, cliente_telefono, mensaje }`
- Muestra la respuesta en un componente React de chat

Componente destino: `apps/web/src/components/public/ChatBot.tsx`
