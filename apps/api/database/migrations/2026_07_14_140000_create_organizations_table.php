<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * F102 Etapa C — sucursales consolidadas. Ver ADR-014: esto NO reemplaza
 * el aislamiento por `local_id` (TenantScope) — es una capa opcional por
 * ENCIMA de Local, de sólo lectura en v1.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $t) {
            $t->id();
            $t->string('nombre', 120);
            $t->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $t->timestamps();
        });

        Schema::table('locales', function (Blueprint $t) {
            $t->foreignId('organization_id')->nullable()->after('owner_id')
                ->constrained('organizations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            $t->dropConstrainedForeignId('organization_id');
        });
        Schema::dropIfExists('organizations');
    }
};
