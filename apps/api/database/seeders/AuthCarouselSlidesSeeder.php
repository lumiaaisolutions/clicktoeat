<?php

namespace Database\Seeders;

use App\Models\AuthCarouselSlide;
use Illuminate\Database\Seeder;

/**
 * Slides curados del carrusel de login/registro (config global de plataforma).
 * Idempotente: `updateOrCreate` por `orden`, no borra slides ajenos.
 * Ver docs/features/auth-login-redesign.md.
 */
class AuthCarouselSlidesSeeder extends Seeder
{
    public function run(): void
    {
        $slides = [
            ['orden' => 1, 'tags' => ['Sin comisiones', '100% tuyo'], 'quote' => 'Cada pedido llega directo a tu WhatsApp con el mensaje ya armado. Cero comisiones, cero intermediarios.', 'source' => 'ClickToEat', 'role' => 'Pedidos por WhatsApp'],
            ['orden' => 2, 'tags' => ['Tu menú en un link', 'Sin app'], 'quote' => 'Tus clientes escanean el QR, ven tu menú con fotos y piden en segundos. Sin descargar nada.', 'source' => 'ClickToEat', 'role' => 'Menú digital + QR'],
            ['orden' => 3, 'tags' => ['Mesas y salón', 'Caja integrada'], 'quote' => 'Controla mesas, cocina y caja desde un mismo panel. Al cierre, el dinero cuadra solo.', 'source' => 'ClickToEat', 'role' => 'Operación del local'],
            ['orden' => 4, 'tags' => ['Inventario', 'Métricas'], 'quote' => 'Cada venta descuenta inventario y ves tus números reales: platos estrella, horas pico y utilidad.', 'source' => 'ClickToEat', 'role' => 'Decisiones con datos'],
        ];

        foreach ($slides as $s) {
            AuthCarouselSlide::updateOrCreate(
                ['orden' => $s['orden']],
                ['activo' => true, 'imagen_url' => null] + $s,
            );
        }
    }
}
