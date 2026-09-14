<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Límite de sucursales por plan (self-service de alta de sucursales).
 * Premium puede abrir hasta N ubicaciones consolidadas; el resto = 1 (sin extras).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('plans', 'max_sucursales')) {
            Schema::table('plans', function (Blueprint $table) {
                // null = ilimitado; 1 = solo el local principal (sin sucursales).
                $table->unsignedInteger('max_sucursales')->default(1)->after('max_staff');
            });
        }

        // Reformista: Premium arranca con 5 ubicaciones incluidas.
        DB::table('plans')->where('slug', 'premium')->update(['max_sucursales' => 5]);
        DB::table('plans')->whereIn('slug', ['essential', 'professional'])->update(['max_sucursales' => 1]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('plans', 'max_sucursales')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->dropColumn('max_sucursales');
            });
        }
    }
};
