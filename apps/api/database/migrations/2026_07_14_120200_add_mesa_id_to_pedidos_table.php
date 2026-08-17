<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dine-in (F102 — plan $499 operación de salón). NO se toca el enum
 * `estado` (nuevo→confirmado→preparando→listo→entregado ya cubre el flujo
 * de cocina) ni `metodo_entrega` (`sucursal` ya significa "consumido en el
 * local" — una mesa es sólo un refinamiento de eso). Ver ADR-012.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            $t->foreignId('mesa_id')->nullable()->after('local_id')
                ->constrained('mesas')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            $t->dropConstrainedForeignId('mesa_id');
        });
    }
};
