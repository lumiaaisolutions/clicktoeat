<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Amplía la precisión de `ingredientes.costo_unitario` a decimal(12,4).
 * Al convertir de unidad grande a chica (kg → g), el costo por unidad se vuelve
 * muy pequeño (ej. $2/kg → $0.002/g); con 2 decimales se redondearía a 0.
 * sqlite (tests) guarda numeric sin precisión estricta → sólo aplica en MySQL.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('ingredientes', function (Blueprint $table) {
            $table->decimal('costo_unitario', 12, 4)->default(0)->change();
        });
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('ingredientes', function (Blueprint $table) {
            $table->decimal('costo_unitario', 10, 2)->default(0)->change();
        });
    }
};
