<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Carrusel de la pantalla de login/registro. Configuración GLOBAL de plataforma
 * (super_admin) — sin `local_id`, no es multi-tenant. Ver
 * docs/features/auth-login-redesign.md (Fase 2).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auth_carousel_slides', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->string('imagen_url')->nullable();
            $table->json('tags')->nullable();
            $table->text('quote');
            $table->string('source')->nullable();
            $table->string('role')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_carousel_slides');
    }
};
