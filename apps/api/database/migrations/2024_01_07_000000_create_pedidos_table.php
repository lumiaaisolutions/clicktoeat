<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 12)->unique();          // human-friendly e.g. CE-AB12CD
            $table->foreignId('local_id')->constrained('locales')->cascadeOnDelete();

            // Cliente (sin login, captura libre desde la landing)
            $table->string('cliente_nombre');
            $table->string('cliente_telefono', 20);
            $table->text('direccion')->nullable();
            $table->text('notas')->nullable();

            $table->enum('metodo_entrega', ['pickup', 'delivery', 'sucursal'])->default('pickup');
            $table->enum('metodo_pago', ['efectivo', 'tarjeta_entrega', 'tarjeta_tpv', 'transferencia'])->default('efectivo');

            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('delivery_fee', 10, 2)->default(0);
            $table->decimal('descuento', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);

            $table->enum('estado', [
                'nuevo', 'confirmado', 'preparando', 'listo',
                'en_camino', 'entregado', 'cancelado',
            ])->default('nuevo')->index();

            $table->text('whatsapp_url')->nullable();  // url generada wa.me?text=... — puede ser larga
            $table->timestamp('confirmado_at')->nullable();
            $table->timestamp('entregado_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['local_id', 'estado', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos');
    }
};
