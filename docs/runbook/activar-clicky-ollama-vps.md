# Runbook — Activar Clicky con Ollama en el VPS (sin cuota, sin API key)

> Contexto: la key de Gemini quedó bloqueada por cuota (429) desde
> 2026-08-06. El VPS ya corre **Ollama** en `localhost:11434` (lo usa n8n),
> así que Clicky puede responder con IA real sin depender de ningún
> proveedor externo. El código ya soporta `CLICKY_PROVIDER=ollama` en ambos
> repos (2026-08-17); esto es solo la activación en producción.

## ✅ EJECUTADO 2026-08-17 — estado real

Activado en producción en **ambos** proyectos con `OLLAMA_MODEL=qwen2.5:3b`
(el 7b excede el timeout en carga fría: el VPS es KVM 2 con 2 vCPU y RAM
justa). Verificado end-to-end server-side: respuestas reales de IA en
**2-4 s** (caliente) por pregunta. El cliente además usa `keep_alive`
(default 30m, `OLLAMA_KEEP_ALIVE`) para mantener el modelo caliente entre
preguntas sin dejarlo residente, y timeout de 120 s para absorber la carga
fría. Lo de abajo queda como referencia del procedimiento.

Aplica a **clicktoeat** y **clicktoshop** (paridad). Rutas por proyecto:
`/var/www/clicktoeat/api` y `/var/www/clicktoshop/api`.

## 1. Deploy del código (desde cada repo local)

```bash
./scripts/deploy-api.sh
```

## 2. Ver qué modelo hay descargado en Ollama

```bash
ssh -p 8080 deploy@2.24.123.93 "curl -s localhost:11434/api/tags"
```

Anota el `name` de un modelo de texto (ej. `llama3.1:8b`). Si no hay
ninguno adecuado (solo modelos de visión), descarga uno chico:

```bash
ssh -p 8080 deploy@2.24.123.93 "ollama pull llama3.1:8b"
```

⚠️ El VPS es KVM 2 compartido con otros productos — no descargues modelos
grandes (>8b) sin revisar RAM/disco (`free -h`, `df -h`).

## 3. Setear las variables en el `.env` productivo (por proyecto)

```bash
ssh -p 8080 deploy@2.24.123.93
cd /var/www/clicktoeat/api      # (y luego repetir en /var/www/clicktoshop/api)

# limpiar valores previos si existieran y agregar los nuevos
sed -i '/^CLICKY_PROVIDER=/d;/^OLLAMA_URL=/d;/^OLLAMA_MODEL=/d' .env
printf 'CLICKY_PROVIDER=ollama\nOLLAMA_URL=http://localhost:11434\nOLLAMA_MODEL=llama3.1:8b\n' >> .env

php artisan config:clear && php artisan config:cache
```

(Ajusta `OLLAMA_MODEL` al nombre exacto que devolvió `/api/tags`.)

## 4. Verificar de punta a punta

Con un token real de un local Professional/Premium (o desde el panel,
abriendo Clicky y haciendo una pregunta libre que no calce en las dudas
rápidas):

```bash
curl -s https://clicktoeat-api.lumiaaisolutions.com/api/v1/clicky/ask \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"message":"¿Cómo agrego un producto?","pathname":"/admin"}'
```

Debe responder con una instrucción real (no el fallback "No puedo ayudarte
con eso justo ahora 🙈"). Si responde el fallback, revisar
`storage/logs/laravel.log` — el error real queda en el warning
`LLM call failed`.

## 5. Latencia esperada

Ollama en CPU (KVM 2) tarda varios segundos por respuesta (el timeout del
cliente es 60 s). Si la latencia resulta inaceptable en uso real, las
opciones son: modelo más chico (ej. `llama3.2:3b`), o volver a
`CLICKY_PROVIDER=gemini` cuando se arregle la cuota en Google Cloud
Console (billing) — el código soporta ambos sin cambios.

## Rollback

```bash
sed -i 's/^CLICKY_PROVIDER=.*/CLICKY_PROVIDER=gemini/' .env
php artisan config:clear && php artisan config:cache
```

(Con la cuota de Gemini rota, esto vuelve al fallback fijo — no rompe, pero
no responde con IA real.)
