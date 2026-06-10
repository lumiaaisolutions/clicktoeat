<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Permite que un producto consuma OTRO producto en su receta ("producto compuesto").
 *
 * Ejemplo: "Combo familiar" cuya receta lista 1× Mix de frutas (que a su vez
 * tiene su propia receta de fresa+uva+durazno+chantilly). El InventoryService
 * expande recursivamente y descuenta los ingredientes hoja.
 *
 * Reglas:
 *  - Una receta apunta EITHER a un ingrediente, OR a un componente producto.
 *  - Nunca a ambos. El CHECK lo enforza en MySQL/sqlite.
 */
return new class extends Migration {
    public function up(): void
    {
        // Idempotente: la migración original ya define la columna en BDs nuevas.
        // Esta migración sólo aplica para BDs ya migradas antes del cambio.
        if (! Schema::hasColumn('recetas', 'componente_producto_id')) {
            Schema::table('recetas', function (Blueprint $table) {
                $table->foreignId('componente_producto_id')
                      ->nullable()
                      ->after('ingrediente_id')
                      ->constrained('productos')
                      ->cascadeOnDelete();
            });
        }

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE recetas MODIFY ingrediente_id BIGINT UNSIGNED NULL');
        }
    }

    public function down(): void
    {
        Schema::table('recetas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('componente_producto_id');
        });
    }
};
