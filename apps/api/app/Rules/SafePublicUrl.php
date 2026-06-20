<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * SEV-3 — Rule anti-SSRF para URLs entregadas por usuarios (webhooks salientes,
 * importadores remotos, etc.). El validador `url` de Laravel sólo verifica
 * sintaxis RFC; no bloquea localhost, RFC 1918, link-local ni metadata cloud.
 *
 * Reglas:
 *  - Sólo schemes http / https (en producción se puede endurecer a https).
 *  - El host se resuelve y TODAS las IPs resultantes deben ser públicas
 *    enrutables (sin loopback, sin privadas, sin link-local, sin multicast,
 *    sin metadata IMDS, sin documentation/reserved ranges).
 *  - Bloqueo explícito de 169.254.169.254 y fd00::/8 (IPv6 unique-local).
 *
 * Para defensa adicional contra DNS rebinding, el cliente HTTP que use esta
 * URL DEBE reconectarse a la IP literal validada (no al hostname). Ver
 * `OutgoingWebhookDispatcher` para el patrón.
 */
class SafePublicUrl implements ValidationRule
{
    private const BLOCKED_IPV6 = [
        '::1',                      // loopback
        '::',                       // unspecified
        '::ffff:0:0',               // IPv4-mapped IPv6 (catch obvious)
    ];

    private const BLOCKED_HOSTS = [
        'localhost',
        'metadata.google.internal',
        'metadata.goog',
    ];

    public function __construct(
        private readonly bool $allowHttp = false,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            $fail('La URL es inválida.');
            return;
        }

        $parts = parse_url($value);
        if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
            $fail('La URL es inválida.');
            return;
        }

        $scheme = strtolower($parts['scheme']);
        $allowed = $this->allowHttp ? ['http', 'https'] : ['https'];
        if (! in_array($scheme, $allowed, true)) {
            $fail($this->allowHttp
                ? 'La URL debe usar http o https.'
                : 'La URL debe usar https.');
            return;
        }

        $host = strtolower($parts['host']);

        if (in_array($host, self::BLOCKED_HOSTS, true)) {
            $fail('La URL apunta a un host bloqueado.');
            return;
        }

        // Si el host es una IP literal, validar directamente.
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (! $this->isPublicIp($host)) {
                $fail('La URL apunta a una IP reservada o privada.');
            }
            return;
        }

        // Hostname: resolver A + AAAA. TODAS las IPs deben ser públicas — si
        // alguna apunta a privado, el host se rechaza (defensa contra
        // multi-record DNS rebinding).
        $ips = $this->resolveHost($host);
        if ($ips === []) {
            $fail('El dominio no resuelve a ninguna IP.');
            return;
        }

        foreach ($ips as $ip) {
            if (! $this->isPublicIp($ip)) {
                $fail('La URL apunta a una IP reservada, privada o de metadata interna.');
                return;
            }
        }
    }

    /**
     * @return list<string>
     */
    private function resolveHost(string $host): array
    {
        $ips = [];
        $a = @gethostbynamel($host);
        if (is_array($a)) {
            $ips = array_merge($ips, $a);
        }
        // dns_get_record para AAAA (IPv6). Silenciado si DNS no soporta.
        $aaaa = @dns_get_record($host, DNS_AAAA);
        if (is_array($aaaa)) {
            foreach ($aaaa as $rec) {
                if (! empty($rec['ipv6'])) {
                    $ips[] = $rec['ipv6'];
                }
            }
        }
        return array_values(array_unique($ips));
    }

    private function isPublicIp(string $ip): bool
    {
        // Catch explícito de metadata IMDS (AWS / Alibaba / Oracle).
        if ($ip === '169.254.169.254' || $ip === 'fd00:ec2::254') {
            return false;
        }

        if (in_array($ip, self::BLOCKED_IPV6, true)) {
            return false;
        }

        // FILTER_FLAG_NO_PRIV_RANGE: rechaza RFC 1918 (10/8, 172.16/12, 192.168/16)
        //                            y RFC 4193 (fc00::/7).
        // FILTER_FLAG_NO_RES_RANGE: rechaza reserved (loopback 127/8, link-local
        //                           169.254/16 + fe80::/10, multicast, documentation
        //                           ranges, etc.).
        $public = filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
        );

        return $public !== false;
    }
}
