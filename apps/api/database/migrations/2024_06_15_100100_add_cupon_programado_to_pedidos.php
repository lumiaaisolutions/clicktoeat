<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            // F25 — Cupones
            if (! Schema::hasColumn('pedidos', 'cupon_codigo')) {
                $t->string('cupon_codigo', 32)->nullable()->after('total');
            }
            if (! Schema::hasColumn('pedidos', 'descuento')) {
                $t->decimal('descuento', 10, 2)->default(0)->after('cupon_codigo');
            }
            // F27 — Pedido programado
            if (! Schema::hasColumn('pedidos', 'programado_para')) {
                $t->timestamp('programado_para')->nullable()->after('descuento');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            foreach (['cupon_codigo', 'descuento', 'programado_para'] as $col) {
                if (Schema::hasColumn('pedidos', $col)) $t->dropColumn($col);
            }
        });
    }
};
