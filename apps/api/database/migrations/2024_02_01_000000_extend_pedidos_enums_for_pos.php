<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Añade los valores de POS a los enums de pedidos:
 *  - metodo_entrega: + 'sucursal' (consumo en el local)
 *  - metodo_pago:    + 'tarjeta_tpv' (terminal punto-de-venta)
 *
 * En sqlite (tests) los "enums" son strings normales, así que la migración no
 * hace nada. Esto la hace idempotente cross-driver.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('pedidos')) {
            return;
        }
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE pedidos
            MODIFY COLUMN metodo_entrega
            ENUM('pickup','delivery','sucursal') NOT NULL DEFAULT 'pickup'
        ");

        DB::statement("
            ALTER TABLE pedidos
            MODIFY COLUMN metodo_pago
            ENUM('efectivo','tarjeta_entrega','tarjeta_tpv','transferencia') NOT NULL DEFAULT 'efectivo'
        ");
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("UPDATE pedidos SET metodo_entrega = 'pickup' WHERE metodo_entrega = 'sucursal'");
        DB::statement("UPDATE pedidos SET metodo_pago    = 'tarjeta_entrega' WHERE metodo_pago = 'tarjeta_tpv'");

        DB::statement("
            ALTER TABLE pedidos
            MODIFY COLUMN metodo_entrega
            ENUM('pickup','delivery') NOT NULL DEFAULT 'pickup'
        ");
        DB::statement("
            ALTER TABLE pedidos
            MODIFY COLUMN metodo_pago
            ENUM('efectivo','tarjeta_entrega','transferencia') NOT NULL DEFAULT 'efectivo'
        ");
    }
};
