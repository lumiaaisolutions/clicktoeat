<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Auditoría inmutable de cambios sensibles.
 *
 * Append-only: nunca UPDATE ni DELETE de filas (salvo retención).
 *
 * Captura: quién, qué hizo, sobre qué recurso, con qué cambios, desde qué IP.
 *
 * Modelos auditados (vía Observers): Producto, Pedido, Categoria, Ingrediente,
 * Compra, Local, User. Ver `AuditObserver`.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('local_id')->nullable()->index();   // null = acción de super_admin
            $table->foreignId('actor_user_id')->nullable()->index();
            $table->string('action', 32);                          // created | updated | deleted | restored
            $table->string('resource_type', 64);                   // App\Models\Producto, etc.
            $table->unsignedBigInteger('resource_id');
            $table->json('changes')->nullable();                   // { campo: [antes, después] }
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['local_id', 'created_at']);
            $table->index(['resource_type', 'resource_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
