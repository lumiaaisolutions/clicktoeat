<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Permisos granulares por staff. Owner siempre ignora esta columna (tiene
 * acceso total). Para rol `staff`, NULL = solo acceso a `pedidos` por
 * default. Array de strings = los módulos listados.
 *
 * Módulos soportados (validados en StoreStaffRequest):
 *   pedidos, pos, productos, categorias, inventario, compras, recetas,
 *   metricas, branding, qr, horarios, audit_log
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'permisos')) {
                $table->json('permisos')->nullable()->after('rol');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'permisos')) {
                $table->dropColumn('permisos');
            }
        });
    }
};
