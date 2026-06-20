# Sonidos

Coloca aquí `bell.mp3` — la campana que suena al llegar un pedido nuevo.

Mientras no exista el archivo, `src/core/audio.ts` deja la campana en `null`
y `playBell()` es no-op, así que la app compila sin problemas.

Sugerencia: usar un MP3 corto (~0.5s), 44.1 kHz, mono, ~16 KB.
