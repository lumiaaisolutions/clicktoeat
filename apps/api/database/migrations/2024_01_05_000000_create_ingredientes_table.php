<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ingredientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $table->string('nombre');
            $table->decimal('stock', 12, 3)->default(0);
            $table->decimal('stock_minimo', 12, 3)->default(0);
            $table->string('unidad', 16)->default('pz');  // pz, kg, g, l, ml
            $table->decimal('costo_unitario', 10, 2)->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index(['local_id', 'activo']);
        });

        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $table->foreignId('ingrediente_id')->constrained('ingredientes')->cascadeOnDelete();
            $table->enum('tipo', ['entrada', 'salida', 'ajuste', 'merma']);
            $table->decimal('cantidad', 12, 3);
            $table->decimal('stock_resultante', 12, 3);
            $table->string('referencia')->nullable();   // p.ej. pedido:123
            $table->string('motivo')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['local_id', 'ingrediente_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
        Schema::dropIfExists('ingredientes');
    }
};
