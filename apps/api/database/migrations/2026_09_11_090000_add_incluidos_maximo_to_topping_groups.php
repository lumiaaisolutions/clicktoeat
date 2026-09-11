<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Límite de toppings por grupo:
 * - `incluidos`: cuántas opciones van gratis (las más caras se incluyen); las
 *   demás cobran su propio precio. null = todas cobran su precio (comportamiento previo).
 * - `maximo`: tope de cuántas puede elegir el cliente. null = sin tope.
 *
 * En el producto, esto viaja en el snapshot JSON de `extras` (por grupo); estas
 * columnas guardan el default del catálogo reutilizable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topping_groups', function (Blueprint $table) {
            if (! Schema::hasColumn('topping_groups', 'incluidos')) {
                $table->unsignedSmallInteger('incluidos')->nullable()->after('required');
            }
            if (! Schema::hasColumn('topping_groups', 'maximo')) {
                $table->unsignedSmallInteger('maximo')->nullable()->after('incluidos');
            }
        });
    }

    public function down(): void
    {
        Schema::table('topping_groups', function (Blueprint $table) {
            $table->dropColumn(['incluidos', 'maximo']);
        });
    }
};
