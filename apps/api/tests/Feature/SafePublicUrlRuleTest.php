<?php

namespace Tests\Feature;

use App\Rules\SafePublicUrl;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class SafePublicUrlRuleTest extends TestCase
{
    /**
     * @dataProvider blockedUrls
     */
    public function test_bloquea_urls_inseguras(string $url, string $razon): void
    {
        $v = Validator::make(['u' => $url], ['u' => [new SafePublicUrl(allowHttp: true)]]);
        $this->assertTrue($v->fails(), "Debió rechazar: {$url} ({$razon})");
    }

    public static function blockedUrls(): array
    {
        return [
            'loopback v4'         => ['http://127.0.0.1/x', 'loopback'],
            'loopback v4 :puerto' => ['http://127.0.0.1:6379/', 'loopback'],
            'loopback v6'         => ['http://[::1]/x', 'loopback v6'],
            'rfc1918 10/8'        => ['http://10.0.0.5/admin', 'rfc1918'],
            'rfc1918 192.168'     => ['http://192.168.1.1/', 'rfc1918'],
            'rfc1918 172.16'      => ['http://172.16.0.1/', 'rfc1918'],
            'link-local v4'       => ['http://169.254.1.1/', 'link-local'],
            'imds aws'            => ['http://169.254.169.254/latest/meta-data/', 'imds aws'],
            'localhost host'      => ['http://localhost/x', 'localhost'],
            'metadata.google'     => ['http://metadata.google.internal/x', 'gcp metadata'],
            'scheme file'         => ['file:///etc/passwd', 'scheme inválido'],
            'scheme gopher'       => ['gopher://x.com/_', 'scheme inválido'],
            'scheme dict'         => ['dict://x.com/x', 'scheme inválido'],
            'sin host'            => ['https://', 'parse falla'],
            // Nota: el caso de cadena vacía lo cubre `required` de Laravel
            // (en uso real: `['required', new SafePublicUrl()]`), no esta rule.
        ];
    }

    /**
     * Usamos IPs literales públicas para no depender de DNS del entorno de
     * tests (CI puede no tener resolución). 8.8.8.8 (Google DNS) y 1.1.1.1
     * (Cloudflare DNS) son IPs públicas estables y enrutables.
     *
     * @dataProvider allowedUrls
     */
    public function test_acepta_urls_publicas(string $url): void
    {
        $v = Validator::make(['u' => $url], ['u' => [new SafePublicUrl(allowHttp: true)]]);
        $this->assertFalse($v->fails(), "Debió aceptar: {$url} — errores: " . json_encode($v->errors()->all()));
    }

    public static function allowedUrls(): array
    {
        return [
            'ip pública v4 https'   => ['https://8.8.8.8/webhooks/cte'],
            'ip pública v4 + puerto'=> ['https://1.1.1.1:8443/cb'],
            'ip pública v4 http'    => ['http://8.8.8.8/cb'],
        ];
    }

    public function test_rechaza_http_cuando_no_se_permite(): void
    {
        $v = Validator::make(
            ['u' => 'http://example.com/cb'],
            ['u' => [new SafePublicUrl(allowHttp: false)]],
        );
        $this->assertTrue($v->fails());
    }
}
