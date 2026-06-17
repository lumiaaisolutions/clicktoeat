<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * F100 — Reviews/calificaciones + alertas de bajo stock.
 *
 * Aditiva (CREATE TABLE solo), compatible con sqlite + mysql.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('pedido_id')->nullable()->constrained('pedidos')->nullOnDelete();
            $t->string('cliente_nombre', 120);
            $t->string('cliente_telefono', 30)->nullable();
            $t->unsignedTinyInteger('rating');  // 1-5
            $t->text('comentario')->nullable();
            $t->boolean('aprobado')->default(true);  // owner puede des-aprobar
            $t->string('token', 64)->unique();      // link único para que el cliente abra el form
            $t->timestamps();
            $t->index(['local_id', 'aprobado', 'created_at']);
        });

        Schema::create('stock_alerts_sent', function (Blueprint $t) {
            // Evita spam: registramos cada alerta enviada por owner para no
            // mandar la misma 1000 veces al día.
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('ingrediente_id')->nullable()->constrained('ingredientes')->cascadeOnDelete();
            $t->string('tipo', 30);   // 'bajo_stock' | 'agotado'
            $t->timestamp('sent_at')->useCurrent();
            $t->index(['local_id', 'ingrediente_id', 'tipo', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_alerts_sent');
        Schema::dropIfExists('reviews');
    }
};
