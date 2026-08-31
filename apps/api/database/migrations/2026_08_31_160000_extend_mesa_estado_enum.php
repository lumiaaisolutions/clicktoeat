<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fase G del roadmap de salón (docs/features/salon-roadmap.md): estados de mesa
 * más ricos. Suma `reservada` y `limpieza` al enum. En sqlite el estado es un
 * string libre (no requiere ALTER); solo MySQL necesita modificar el enum.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }
        DB::statement("ALTER TABLE mesas MODIFY estado ENUM('libre','ocupada','por_cobrar','reservada','limpieza') NOT NULL DEFAULT 'libre'");
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }
        DB::statement("ALTER TABLE mesas MODIFY estado ENUM('libre','ocupada','por_cobrar') NOT NULL DEFAULT 'libre'");
    }
};
