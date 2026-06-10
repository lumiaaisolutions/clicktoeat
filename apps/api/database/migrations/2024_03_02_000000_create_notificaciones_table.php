<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $table->string('tipo', 40);              // p.ej. 'bajo_stock'
            $table->string('titulo');
            $table->text('mensaje');
            $table->json('data')->nullable();        // contexto extra ej. {ingrediente_id, stock}
            $table->timestamp('leida_at')->nullable();
            $table->timestamps();

            $table->index(['local_id', 'leida_at', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificaciones');
    }
};
