# Plan por fases — agosto 2026

> Estado REAL del sistema verificado contra el código el 2026-08-17 (no
> contra docs viejos — `roadmap.md`, `funcionalidad-faltante.md` y
> `devops-faltante.md` son snapshots de junio y tienen muchos ítems ya
> cerrados; este documento los sustituye como fuente de prioridades).
>
> Regla de paridad: toda feature de plataforma se mantiene a la par con
> **ClickToShop** (`../clicktoshop/`) — ver CLAUDE.md de ambos repos.

## Corrección de contexto (por qué este doc)

Los docs de issues decían "falta" mucho de lo que YA existe: cupones (F25),
lealtad por sellos (F73), 2FA TOTP (F67), PWA + Web Push (F51-F52),
webhooks salientes con HMAC (F90), exports CSV (F26), métricas SaaS
MRR/ARR/churn para super_admin (F30), cohort de retención (F63),
multi-sucursal con pivot + switcher (F71+F82), POS offline (F70),
expiración de tokens Sanctum (7 días, `config/sanctum.php`), CI en
`.github/workflows/` y monitoreo UptimeRobot. Nada de eso está pendiente.

## Fase 0 — Hecho en esta sesión (2026-08-17, código local)

- ✅ **Clicky → Ollama** en ambos repos: provider `ollama` en `LLMClient`
  (con soporte de `system` prompt y `temperature`), `CLICKY_PROVIDER`
  configurable (`config/services.php`), tests con `Http::fake`
  (8/8 en cada repo). Motivo: la key de Gemini está bloqueada por cuota
  (429) desde 2026-08-06; Ollama corre en el propio VPS (`localhost:11434`,
  el mismo que usa n8n) — sin API key ni cuota.
- ✅ **Pint**: cleanup masivo de formato (~300 archivos) + paso reactivado
  en CI. Suite completa verde después (332 tests).
- ✅ **Tests dependientes de fecha corregidos**: `IdempotencyTest` y
  `EndpointPublicoTamperingTest` fallaban los domingos (la factory
  `conHorarios()` no abre domingo → 409 en pedidos públicos). Ahora
  congelan el reloj en miércoles 15:00 CDMX (`travelTo`).
- ✅ **ESLint reactivado en CI**: eslint downgradeado a v8 (compatible con
  eslint-config-next@14), regla cosmética `react/no-unescaped-entities`
  off, fix real de `rules-of-hooks` en `PinnedFoodStory`
  (`frameOpacity` → `useFrameOpacity`).
- ✅ **Test espejo de WhatsApp** (`apps/web/src/lib/__tests__/whatsapp.test.ts`,
  vitest nuevo): cubre el formato TS contra el contrato del
  `WhatsAppLinkBuilder` PHP. Paso `npm run test` agregado al CI.
- ✅ **CLAUDE.md actualizado en ambos repos** (VPS real post-migración, ya
  sin CageFS/Passenger/LiteSpeed) + **regla de paridad** ClickToEat ↔
  ClickToShop escrita en ambos.
- ✅ Confirmado por el usuario: el **login en producción funciona** — se
  cierra el pendiente de validación post-migración de la Fase 7.

## Fase 1 — Cierre operativo en el VPS — ✅ ejecutada 2026-08-17 (salvo mail)

Estado real tras la ejecución: APIs de ambos proyectos desplegadas (health
OK), Clicky activo con Ollama (`qwen2.5:3b`, respuestas reales en 2-4 s,
verificado server-side en ambos), backups y cron intactos. **Mail quedó
bloqueado**: el password SMTP del buzón ya no autentica (535) — se dejó
`MAIL_MAILER=log` como fallback; falta que el usuario resetee el password
del buzón (ver runbook de mail). El push a GitHub se hizo en esta misma
sesión.

> Procedimientos: [`runbook/activar-clicky-ollama-vps.md`](../runbook/activar-clicky-ollama-vps.md)
> y [`runbook/setup-mail-hostinger.md`](../runbook/setup-mail-hostinger.md).

1. **Deploy del código de esta sesión** (`./scripts/deploy-api.sh` +
   `./scripts/deploy-web.sh` en ambos repos).
2. **Activar Clicky con Ollama**: `CLICKY_PROVIDER=ollama` (+ `OLLAMA_URL`,
   `OLLAMA_MODEL` según el modelo ya descargado en el VPS — verificar con
   `curl localhost:11434/api/tags`) en el `.env` de ambas APIs +
   `config:cache` + prueba real del endpoint.
3. **Mail productivo**: replicar las 8 vars `MAIL_*` del `.env` local de
   clicktoeat (Hostinger SMTP, ya funcionaban en local desde F24) al `.env`
   del VPS + `config:cache` + mail de prueba. Repetir para clicktoshop.
4. **Commit + push** del trabajo local (la rama va 12 commits adelante de
   origin y con todo el cleanup sin commitear).
5. (Opcional, decisión de no pagar ya tomada) Off-site de backups: crear
   cuenta Backblaze B2 free y setear `B2_REMOTE`/`B2_BUCKET` — el script ya
   soporta ambos modos.

## Fase 2 — Activaciones de cosas ya pre-implementadas (1-2 sesiones c/u)

1. **Tiempo real (Reverb)**: el frontend (`lib/echo.ts`), el evento
   `PedidoCreado` y el channel auth ya existen; en el host viejo se
   descartó por CageFS (sin supervisor). El VPS actual SÍ soporta systemd →
   instalar `laravel/reverb`, servicio systemd, proxy websocket en nginx.
   Ver `docs/features/realtime-reverb.md`.
2. **Pagos online en pedidos (F31)**: `PaymentLinkService` ya crea Payment
   Links; falta el hook en `PublicPedidoController` cuando
   `local.acepta_pago_online`, la opción "Pagar ahora" en checkout y el
   webhook `checkout.session.completed` con `tipo=pedido_anticipado`.
3. **S3/B2 para uploads**: disk `s3` + comando `uploads:migrar-a-s3`
   listos; activar cuando el volumen lo amerite (hoy ~12 MB).

## Fase 3 — Gaps reales de producto (verificados hoy)

1. **Transferencia de owner** (super_admin) — no existe endpoint ni UI.
2. **SEO restante**: `sitemap.ts` y `robots.ts` no existen en
   `apps/web/src/app/`; `generateMetadata` por landing SÍ existe. Verificar
   OG dinámico y JSON-LD antes de implementar.
3. **Reactivar eslint/vitest en el CI de clicktoshop** (pint ya quedó
   reactivado hoy por paridad; el lint/tests del frontend siguen pendientes ahí).
4. **Exports PDF** (CSV ya existe) — solo si el negocio lo pide.

## Fase 4 — Largo plazo (sin cambios de prioridad)

- WhatsApp Business API real (confirmaciones automáticas al cliente).
- Multi-sucursal "Business" completo (F33: TenantContext refactor).
- Lotes/caducidad FIFO en inventario, conteos físicos programados.
- Forecasting de demanda/inventario.
- i18n + multi-currency.

## Riesgos / notas

- El VPS es compartido con otros productos LUMIA en vivo — todo cambio de
  sistema (php-fpm, nginx, apt) se confirma con el usuario primero.
- La cuota de Gemini sigue rota (429); con `CLICKY_PROVIDER=ollama` deja de
  importar, pero si se quiere Gemini de vuelta es cosa de Google Cloud
  Console (billing), no de código.
- 217 deprecations de PHPUnit en la suite — ruido, no fallas; limpiar
  cuando se suba PHPUnit.
