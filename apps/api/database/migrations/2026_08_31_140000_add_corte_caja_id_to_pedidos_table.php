<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase D del roadmap de salón (docs/features/salon-roadmap.md): "todo pasa por
 * caja". Un pedido de mostrador cobrado en efectivo se liga al corte de caja
 * para que entre en la reconciliación (corrige gap #6 del audit). FK solo en MySQL.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('pedidos', 'corte_caja_id')) {
            Schema::table('pedidos', function (Blueprint $t) {
                $t->foreignId('corte_caja_id')->nullable()->after('cuenta_mesa_id');
            });

            if (DB::connection()->getDriverName() === 'mysql') {
                Schema::table('pedidos', function (Blueprint $t) {
                    $t->foreign('corte_caja_id')->references('id')->on('cortes_caja')->nullOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql' && Schema::hasColumn('pedidos', 'corte_caja_id')) {
            Schema::table('pedidos', function (Blueprint $t) {
                $t->dropForeign(['corte_caja_id']);
            });
        }
        Schema::table('pedidos', function (Blueprint $t) {
            $t->dropColumn('corte_caja_id');
        });
    }
};
