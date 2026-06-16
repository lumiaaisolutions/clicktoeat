<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('resenas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $t->foreignId('pedido_id')->nullable()->constrained('pedidos')->nullOnDelete();
            $t->unsignedTinyInteger('calificacion');             // 1..5
            $t->string('nombre_cliente', 120)->nullable();
            $t->text('comentario')->nullable();
            $t->boolean('publicada')->default(true);             // moderación
            $t->timestamps();

            $t->index(['local_id', 'producto_id', 'publicada']);
            $t->index(['producto_id', 'calificacion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resenas');
    }
};
