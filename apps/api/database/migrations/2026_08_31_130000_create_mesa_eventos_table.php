<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase B del roadmap de salón (docs/features/salon-roadmap.md): historial de
 * cambios de una mesa (quién, cuándo, qué). Log append-only, sin updates.
 * `tipo`: estado_cambio | tomada | liberada | pedido_agregado | cuenta_cerrada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mesa_eventos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('mesa_id')->constrained('mesas')->cascadeOnDelete();
            $t->string('tipo', 30);
            $t->string('estado_anterior', 20)->nullable();
            $t->string('estado_nuevo', 20)->nullable();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->json('meta')->nullable();
            $t->timestamps();

            $t->index(['local_id', 'mesa_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mesa_eventos');
    }
};
