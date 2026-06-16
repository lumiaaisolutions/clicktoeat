# Newsletter / blast

Envío masivo de correo a todos los usuarios desde `/admin/newsletter`.
Solo el `super_admin` puede ejecutarlo.

## Cuándo usarlo

- Anunciar nuevas features de la plataforma.
- Cambios de pricing.
- Cambios de política de uso o términos.
- Recordatorios de tareas (ej. "confirma tus datos de facturación").

**No usar para**: marketing al cliente final (eso lo hace cada local desde
su propio sistema), pedidos individuales (eso es ticket de soporte).

## Modelo

Tabla `newsletter_blasts`:

| Columna             | Tipo        | Notas |
|---------------------|-------------|-------|
| `id`                | bigInt PK   |       |
| `user_id`           | FK          | quién lo envió (super_admin) |
| `asunto`            | string(200) |       |
| `body`              | text        | texto plano, se renderiza en plantilla mínima |
| `rol`               | enum (owner, super_admin, todos) | a quiénes |
| `recipients_count`  | int         | snapshot del count al momento de enviar |
| `sent_count`        | int         | cuántos se enviaron exitosos |
| `failed_count`      | int         | cuántos fallaron |
| `started_at`        | timestamp   |       |
| `finished_at`       | timestamp nullable | null = aún corriendo |
| timestamps          |             |       |

## Endpoints

```
GET  /api/v1/admin/newsletter            super_admin   historial
POST /api/v1/admin/newsletter/send       super_admin   dispara el envío sync
```

## Flujo

`POST /admin/newsletter/send` itera los usuarios con `rol` matching e itera
en chunks de 200 disparando `Mail::raw(...)` con plantilla minimal. Va
escribiendo `sent_count`/`failed_count` a la fila del blast.

Para envíos > 5,000 destinatarios este flujo se vuelve lento (Mail síncrono).
Roadmap: mover a job en queue cuando crezca el volumen. Por ahora con
< 1,000 owners es aceptable.

## Frontend

`apps/web/src/app/admin/newsletter/page.tsx` con:
- Formulario asunto / body / rol target.
- Confirm dialog antes de enviar.
- Histórico debajo con count de enviados / fallidos.
