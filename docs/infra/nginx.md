# Infra — nginx

`docker/nginx/default.conf`. Sirve `/var/www/html/public` y reenvía PHP al contenedor `api` via fastcgi.

## Configuración resumida

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php;

    client_max_body_size 25M;

    # Headers de seguridad
    add_header X-Frame-Options          "SAMEORIGIN" always;
    add_header X-Content-Type-Options   "nosniff"    always;
    add_header Referrer-Policy          "strict-origin-when-cross-origin" always;

    # Fallback al index.php
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP via fastcgi
    location ~ \.php$ {
        fastcgi_pass api:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 60s;
    }

    # Bloquea dot-files (excepto .well-known)
    location ~ /\.(?!well-known).* { deny all; }

    # Cache estáticos
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2?|svg)$ {
        expires 7d;
        access_log off;
        try_files $uri =404;
    }
}
```

## Headers de seguridad

| Header                       | Valor                                   | Por qué                                                |
|-----------------------------|-----------------------------------------|--------------------------------------------------------|
| `X-Frame-Options`            | `SAMEORIGIN`                             | Evita que la app se cargue en `<iframe>` ajeno         |
| `X-Content-Type-Options`     | `nosniff`                                | Evita MIME-sniffing en navegadores                      |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`        | Reduce filtración de URLs sensibles a 3rd parties      |

## Lo que falta para producción

- **HTTPS / TLS**: el nginx interno no termina TLS. En prod hay un reverse-proxy externo (Caddy, Cloudflare, ALB) que lo hace.
- **HSTS**: añadir `Strict-Transport-Security: max-age=31536000; includeSubDomains` cuando se sirva sólo por HTTPS.
- **Content-Security-Policy**: hoy no se manda — pendiente diseñar política considerando las fuentes de Google, Leaflet tiles, etc.
- **Rate limit a nivel nginx** para endpoints públicos pesados.
- **Logging custom** (hoy usa el default).
- **gzip / brotli**: no configurado — habilitar para JSON responses grandes.

Ver [`issues/devops-faltante.md`](../issues/devops-faltante.md).
