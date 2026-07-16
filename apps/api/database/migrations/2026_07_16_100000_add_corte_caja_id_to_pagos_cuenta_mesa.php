<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * F102 — reconciliación real de caja: asocia cada pago de cuenta de mesa al
 * corte de caja que lo recibió, para que `CajaService::cerrarCorte` pueda
 * sumar efectivo real recibido (antes sólo sumaba movimientos manuales).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('pagos_cuenta_mesa', function (Blueprint $t) {
            $t->foreignId('corte_caja_id')->nullable()->after('cuenta_mesa_id')
                ->constrained('cortes_caja')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pagos_cuenta_mesa', function (Blueprint $t) {
            $t->dropConstrainedForeignId('corte_caja_id');
        });
    }
};
