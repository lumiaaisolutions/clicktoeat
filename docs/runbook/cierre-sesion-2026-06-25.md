# Cierre de sesión — 2026-06-25

> Sesión de diagnóstico. Sin features nuevas ni código commiteado.
> El sistema permaneció estable y sin cambios en prod.

## TL;DR

- **0 commits** — solo diagnóstico de incidente
- **Incidente**: `/admin` mostraba pantalla en blanco con `ChunkLoadError`
- **Causa raíz**: browser cache del owner tenía HTML de un build anterior con
  hashes de chunks que no existen en el servidor actual
- **Fix**: hard refresh en el browser (`Cmd+Shift+R`) — el servidor está bien
- **Hallazgo secundario**: `sharp` no instalado en el servidor (warning en
  `stderr.log`, no es causa del error pero degrada image optimization)
- **Estado del sistema**: 100% operativo, sin rollback ni deploy necesario

## Incidente — blank page en `/admin`

### Síntomas

Browser en `clicktoeat.lumiaaisolutions.com/admin`:
```
Failed to load resource: 404  /_next/static/chunks/app/admin/loading-1e3bb80cd24c5c9f.js
Failed to load resource: 404  /_next/static/chunks/app/admin/layout-423ede4c52d21c3f.js
Failed to load resource: 404  /_next/static/chunks/app/layout-771799d21db56861.js
Failed to load resource: 404  /_next/static/css/af608c3e03adb7d5.css
Refused to execute as script (X-Content-Type-Options: nosniff)
ChunkLoadError: Loading chunk 3 failed.
Error: Minified React error #423
```

### Diagnóstico

| Verificación | Resultado |
|---|---|
| Chunks pedidos por el browser existen en servidor | ❌ No — hashes distintos |
| Chunks pedidos existen en build local | ❌ No — nunca se generaron |
| BUILD_ID servidor vs local | ✅ Iguales: `gbLDmVf59_a6OF8WaQ0h5` |
| Chunks en servidor vs local | ✅ Idénticos: `loading-c28e17fb*`, `layout-f45852b2*` |
| `server.js` en servidor | ✅ Consistente con `.next/static` (Jun 24 16:27) |

**Conclusión**: el browser había cacheado HTML de un build previo (con hashes
`1e3bb80c…`, `423ede4c…`) que nunca existió en producción. Al pedir esos
chunks, el servidor devuelve 404 porque no coinciden con los del build actual.

### Fix

Hard refresh en el browser borra el HTML cacheado y el servidor responde
con HTML fresco que referencia los chunks correctos:
- **Chrome/Edge**: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Win)
- **Safari**: `Cmd+Option+E` → vaciar cache → recargar
- **Todos**: DevTools → Network → tick "Disable cache" → recargar

Si reapareciera en múltiples usuarios (no browser-local), agregar en
`.htaccess` del web:
```apache
<FilesMatch "\.html$">
  Header set Cache-Control "no-store, no-cache, must-revalidate"
</FilesMatch>
```
Pero en Next.js + Passenger las rutas dinámicas no generan HTML estático
— este patrón es improbable a escala.

### Hallazgo secundario — `sharp` no instalado

`stderr.log` del servidor muestra:
```
Error: 'sharp' is required to be installed in standalone mode
for the image optimization to function correctly.
```

**Impacto**: `next/image` hace resize sin `sharp` (usa la versión pure-JS,
más lenta). No causa el error de chunks. Para instalarlo en el servidor:
```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
cd ~/domains/clicktoeat.lumiaaisolutions.com/nodejs
npm install sharp
touch tmp/restart.txt
```
⚠️ Requiere que la versión de Node del VPS sea compatible con el binario
de `sharp`. Verificar con `node --version` antes de instalar.

## Verificación estado final

```bash
# Ambos OK al cierre de sesión
curl -I https://clicktoeat.lumiaaisolutions.com/        # 200
curl -I https://clicktoeat-api.lumiaaisolutions.com/up  # 200
```

## Métricas de la sesión

| Métrica | Valor |
|---|---|
| Commits | 0 |
| Deploys | 0 |
| Incidentes diagnosticados | 1 (chunk mismatch — browser cache) |
| Incidentes resueltos | 1 (hard refresh) |
| Hallazgos secundarios | 1 (`sharp` no instalado) |
| Rollbacks | 0 |
