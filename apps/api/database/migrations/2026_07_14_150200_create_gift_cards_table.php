<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_cards', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('codigo', 20)->unique();
            $t->decimal('monto_inicial', 10, 2);
            $t->decimal('saldo', 10, 2);
            $t->string('comprador_email')->nullable();
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('estado', ['activa', 'agotada', 'cancelada'])->default('activa');
            } else {
                $t->string('estado', 20)->default('activa');
            }
            $t->timestamps();

            $t->index(['local_id', 'estado']);
        });

        Schema::create('gift_card_movimientos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('gift_card_id')->constrained('gift_cards')->cascadeOnDelete();
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('tipo', ['emision', 'redencion']);
            } else {
                $t->string('tipo', 10);
            }
            $t->decimal('monto', 10, 2);
            $t->foreignId('pedido_id')->nullable()->constrained('pedidos')->nullOnDelete();
            $t->timestamps();

            // Idempotencia: un mismo pedido no puede redimir la misma gift card dos veces.
            $t->unique(['gift_card_id', 'pedido_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_card_movimientos');
        Schema::dropIfExists('gift_cards');
    }
};
