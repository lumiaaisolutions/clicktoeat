<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cajas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('nombre', 60);
            $t->boolean('activa')->default(true);
            $t->timestamps();

            $t->index(['local_id', 'activa']);
        });

        Schema::create('cortes_caja', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('caja_id')->constrained('cajas')->cascadeOnDelete();
            $t->foreignId('abierto_por')->constrained('users')->cascadeOnDelete();
            $t->foreignId('cerrado_por')->nullable()->constrained('users')->nullOnDelete();
            $t->decimal('monto_inicial', 10, 2)->default(0);
            $t->decimal('monto_esperado', 10, 2)->nullable();
            $t->decimal('monto_contado', 10, 2)->nullable();
            $t->decimal('varianza', 10, 2)->nullable();
            $t->timestamp('abierta_at');
            $t->timestamp('cerrada_at')->nullable();
            $t->timestamps();

            $t->index(['local_id', 'caja_id', 'cerrada_at']);
        });

        Schema::create('movimientos_caja', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('corte_caja_id')->constrained('cortes_caja')->cascadeOnDelete();
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('tipo', ['fondo', 'retiro', 'vale']);
            } else {
                $t->string('tipo', 10);
            }
            $t->decimal('monto', 10, 2);
            $t->string('motivo', 200)->nullable();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->timestamps();

            $t->index(['local_id', 'corte_caja_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_caja');
        Schema::dropIfExists('cortes_caja');
        Schema::dropIfExists('cajas');
    }
};
