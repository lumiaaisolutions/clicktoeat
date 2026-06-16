# Audit log global

Vista del log de auditoría **sin scope tenant** para el `super_admin`.
Útil para diagnóstico, soporte y forense de seguridad.

## Diferencia con `audit-logs` de owner

| Endpoint                              | Quién | Scope |
|---------------------------------------|-------|-------|
| `GET /api/v1/audit-logs`              | owner | sólo logs de su local (TenantScope) |
| `GET /api/v1/admin/audit-logs`        | super_admin | TODOS los logs sin scope |

El endpoint de owner está además gated por `feature:audit_log` (Premium).
El endpoint super_admin no tiene gating — siempre disponible para él.

## Endpoint

```
GET /api/v1/admin/audit-logs?q=<keyword>&page=<n>

Response: paginación Laravel estándar.
{
  "data": [
    {
      "id": 12345,
      "actor": { "id":7, "nombre":"Owner X", "rol":"owner", "email":"..." },
      "action": "producto.updated",
      "subject_type": "App\\Models\\Producto",
      "subject_id":   42,
      "local_id":     3,
      "created_at":   "2026-06-15T18:34:21.000000Z"
    },
    ...
  ],
  "meta": { "current_page":1, "last_page":47, "total":4670 }
}
```

El filtro `q` matchea contra `action` y `subject_type` (LIKE %q%).

## Frontend

`apps/web/src/app/admin/auditoria/page.tsx` con tabla paginada + buscador.

## Privacidad

El log NUNCA incluye `password` aunque cambie (test
`audit_log_NO_incluye_password_aunque_cambie` cubre esto). Tampoco se
loguean lecturas — solo writes (created/updated/deleted/restored).

## Retención

No hay política de purga automática. Si el tamaño crece, agendar job que
limpie registros > 90 días para super_admin / > 365 días para
compliance.
