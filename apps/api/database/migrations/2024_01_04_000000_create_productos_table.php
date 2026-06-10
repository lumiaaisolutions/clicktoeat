<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $table->foreignId('categoria_id')->constrained('categorias')->cascadeOnDelete();

            $table->string('nombre');
            $table->string('slug');
            $table->text('descripcion')->nullable();
            $table->decimal('precio', 10, 2);
            $table->decimal('precio_descuento', 10, 2)->nullable();
            $table->string('imagen_url')->nullable();
            $table->string('imagen_public_id')->nullable();  // cloudinary id para borrar

            $table->boolean('disponible')->default(true);
            $table->boolean('es_combo')->default(false);
            $table->boolean('es_promocion')->default(false);
            $table->string('tag')->nullable();              // "Más pedido", "Nuevo", etc

            $table->json('extras')->nullable();             // grupos de extras (one/many)
            $table->json('meta')->nullable();               // misc

            $table->unsignedSmallInteger('orden')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['local_id', 'slug']);
            $table->index(['local_id', 'categoria_id', 'disponible']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
