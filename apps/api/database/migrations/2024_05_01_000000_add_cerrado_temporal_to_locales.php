<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Override manual del estado de apertura.
 *
 * `cerrado_temporal=true` fuerza a la landing pública a mostrar "cerrado"
 * aunque los horarios programados digan que está abierto (ej. cerrado por
 * inventario agotado, evento privado, día libre del owner).
 *
 * Cuando `cerrado_temporal=false`, el estado se calcula desde `horarios`.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('locales', function (Blueprint $table) {
            if (! Schema::hasColumn('locales', 'cerrado_temporal')) {
                $table->boolean('cerrado_temporal')->default(false)->after('suspendido');
            }
            if (! Schema::hasColumn('locales', 'zona_horaria')) {
                $table->string('zona_horaria', 60)->default('America/Mexico_City')->after('cerrado_temporal');
            }
        });
    }

    public function down(): void
    {
        Schema::table('locales', function (Blueprint $table) {
            $table->dropColumn(['cerrado_temporal', 'zona_horaria']);
        });
    }
};
