<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * F102 — extiende el módulo de lealtad existente (sellos) hacia
 * tiers/challenges. NO reemplaza `lealtad_sellos` — ver ADR-012 decisión #3.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('lealtad_tiers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('nombre', 60);
            $t->unsignedInteger('sellos_requeridos');
            $t->string('beneficio', 200);
            $t->timestamps();

            $t->index(['local_id', 'sellos_requeridos']);
        });

        Schema::create('lealtad_challenges', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('nombre', 60);
            $t->json('criterio'); // ej. {"tipo":"pedidos_en_dias","cantidad":3,"dias":7}
            $t->string('premio', 200);
            $t->boolean('activo')->default(true);
            $t->timestamps();

            $t->index(['local_id', 'activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lealtad_challenges');
        Schema::dropIfExists('lealtad_tiers');
    }
};
