<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cupones', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('codigo', 32);                          // BIENVENIDO, VERANO20 — uppercase
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('tipo', ['percent', 'fixed']);        // 10% o $50 MXN
            } else {
                $t->string('tipo', 10);
            }
            $t->decimal('valor', 10, 2);                        // 10 (percent) o 50.00 (fixed)
            $t->decimal('min_subtotal', 10, 2)->default(0);    // monto mínimo del pedido
            $t->decimal('max_descuento', 10, 2)->nullable();   // tope (útil con percent)
            $t->date('fecha_desde')->nullable();
            $t->date('fecha_hasta')->nullable();
            $t->integer('max_usos')->nullable();               // null = ilimitado
            $t->integer('usos_actuales')->default(0);
            $t->boolean('activo')->default(true);
            $t->softDeletes();
            $t->timestamps();

            $t->unique(['local_id', 'codigo']);
            $t->index(['local_id', 'activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cupones');
    }
};
