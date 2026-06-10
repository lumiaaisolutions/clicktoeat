# Feature — QR del menú

## Caso de uso

El owner imprime un QR para pegar en mesas, mostrador, ventana. Cliente lo escanea con la cámara de su móvil → cae en la landing pública.

## Implementación

Sin servicio backend para QR — todo client-side.

### Componente
`apps/web/src/components/ui/QRCode.tsx` usando la librería `qrcode` (npm).

- Toma una URL y genera un PNG / SVG dataURL.
- Tamaño configurable.
- Color/foreground configurable (puede tomar el `color_primario` del local).

### Página
`apps/web/src/app/admin/qr/page.tsx`:
- Lee `useAuth().user.local` (o `GET /local`) para sacar `slug`.
- Arma `https://<NEXT_PUBLIC_APP_URL>/<slug>` (en local: `http://localhost:3000/<slug>`).
- Renderiza el QR + botón "Descargar PNG".
- Opcional: muestra cómo se vería el QR sobre fondo blanco con el logo arriba (para impresión).

## URL embebida

```
NEXT_PUBLIC_APP_URL/<slug>
```

`NEXT_PUBLIC_APP_URL` en `.env.local` (local: `http://localhost:3000`, prod: el dominio real).

## Decisiones

- **Sin tracking**: el QR no lleva params UTM. Si quieres saber cuántas visitas vienen de QR vs orgánico, hace falta query string + analytics.
- **No personalizable más allá de color**: si el negocio quiere QR con logo embebido en el centro, hay que cambiar la lib o implementar overlay manual con canvas.
- **No persiste el QR**: cada visita a `/admin/qr` lo regenera. Aceptable porque es determinístico (mismo slug → mismo QR).

## Pendientes

- QR con logo embebido al centro.
- Plantilla imprimible (PDF tamaño carta con varios QRs).
- Trackear visitas con `?source=qr` para métricas.
- Generar QR server-side cacheado, para que el owner reciba una imagen URL (útil para correos / docs).
