<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('detalle_pedidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->foreignId('producto_id')->nullable()->constrained('productos')->nullOnDelete();

            // Snapshot del producto en el momento del pedido (los productos pueden cambiar después)
            $table->string('producto_nombre');
            $table->decimal('precio_unitario', 10, 2);
            $table->unsignedSmallInteger('cantidad');
            $table->decimal('subtotal', 10, 2);

            $table->json('extras_seleccionados')->nullable();  // [{group:'Tortilla', item:'Harina', price:5}, ...]
            $table->text('notas')->nullable();

            $table->timestamps();

            $table->index('pedido_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_pedidos');
    }
};
