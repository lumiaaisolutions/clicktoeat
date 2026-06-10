<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Módulo de compras: registro de mercancía recibida del proveedor.
 *
 * Una compra agrupa múltiples ingredientes recibidos en una sola transacción
 * (típicamente una factura del proveedor). Al guardar:
 *  - aumenta stock de cada ingrediente listado
 *  - actualiza costo_unitario con promedio ponderado
 *  - registra MovimientoInventario tipo 'entrada' con referencia "compra:N"
 *
 * Anular una compra revierte el stock — solo si no se ha consumido parte.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('compras', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 16)->unique();         // CP-XXXXXX
            $table->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $table->string('proveedor', 150)->nullable();
            $table->string('referencia_factura', 60)->nullable(); // # de factura/ticket
            $table->date('fecha');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('impuestos', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->text('notas')->nullable();
            $table->enum('estado', ['registrada', 'anulada'])->default('registrada')->index();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['local_id', 'estado', 'fecha']);
        });

        Schema::create('detalle_compras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('compra_id')->constrained('compras')->cascadeOnDelete();
            $table->foreignId('ingrediente_id')->constrained('ingredientes')->cascadeOnDelete();
            $table->decimal('cantidad', 12, 3);
            $table->decimal('costo_unitario', 12, 2);     // precio pagado por unidad
            $table->decimal('subtotal', 12, 2);            // cantidad × costo_unitario
            $table->timestamps();

            $table->index('compra_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_compras');
        Schema::dropIfExists('compras');
    }
};
