<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('recetas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('ingrediente_id')->nullable()->constrained('ingredientes')->cascadeOnDelete();
            $table->foreignId('componente_producto_id')->nullable()->constrained('productos')->cascadeOnDelete();
            $table->decimal('cantidad', 12, 3);
            $table->timestamps();

            $table->unique(['producto_id', 'ingrediente_id']);
            $table->unique(['producto_id', 'componente_producto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recetas');
    }
};
