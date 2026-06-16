<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * F91 — Receta granular.
 *
 * Hoy `recetas.cantidad` se interpreta en la unidad del ingrediente
 * (kg, l, unidades, etc). Agregamos `unidad_consumo` opcional para
 * permitir que la receta declare "consume X gramos" aunque el stock
 * del ingrediente se lleve en kilos.
 *
 * Conversiones soportadas (case-insensitive):
 *   g  ↔ kg  (1 kg = 1000 g)
 *   ml ↔ l   (1 l  = 1000 ml)
 *
 * Si unidad_consumo == ingrediente.unidad (o es null), no se convierte.
 * Si las unidades son incompatibles, InventoryService lanza una excepción.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('recetas', function (Blueprint $t) {
            if (! Schema::hasColumn('recetas', 'unidad_consumo')) {
                $t->string('unidad_consumo', 10)->nullable()->after('cantidad');
            }
        });
    }

    public function down(): void
    {
        Schema::table('recetas', function (Blueprint $t) {
            if (Schema::hasColumn('recetas', 'unidad_consumo')) {
                $t->dropColumn('unidad_consumo');
            }
        });
    }
};
