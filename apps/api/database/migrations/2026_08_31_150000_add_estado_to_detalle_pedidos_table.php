<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase E del roadmap de salón (docs/features/salon-roadmap.md): KDS por ítem.
 * Cada línea del pedido puede marcarse lista de forma independiente
 * (ej. "las papas ya, la carne no"). `estado`: pendiente | listo.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('detalle_pedidos', 'estado')) {
            Schema::table('detalle_pedidos', function (Blueprint $t) {
                $t->string('estado', 12)->default('pendiente')->after('notas');
            });
        }
    }

    public function down(): void
    {
        Schema::table('detalle_pedidos', function (Blueprint $t) {
            $t->dropColumn('estado');
        });
    }
};
