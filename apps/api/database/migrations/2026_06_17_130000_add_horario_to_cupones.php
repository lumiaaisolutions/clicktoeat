<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * F100 — Cupones programados por horario (happy hour, 2x1 5-7pm, etc).
 *
 * Aditiva (ADD COLUMN only) compatible con sqlite + mysql.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('cupones', function (Blueprint $t) {
            $t->time('hora_inicio')->nullable()->after('fecha_hasta');
            $t->time('hora_fin')->nullable()->after('hora_inicio');
            // JSON con días de semana: ["mon","tue","wed",...] o null = todos
            $t->json('dias_semana')->nullable()->after('hora_fin');
            // Si true, el cupón se muestra en la landing como banner ("Promo activa")
            $t->boolean('destacado_en_landing')->default(false)->after('dias_semana');
            // Si está presente, al click en el banner agrega estos productos al carrito
            $t->json('productos_sugeridos')->nullable()->after('destacado_en_landing');
        });
    }

    public function down(): void
    {
        Schema::table('cupones', function (Blueprint $t) {
            $t->dropColumn(['hora_inicio', 'hora_fin', 'dias_semana', 'destacado_en_landing', 'productos_sugeridos']);
        });
    }
};
