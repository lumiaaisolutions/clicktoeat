<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos_cuenta_mesa', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('cuenta_mesa_id')->constrained('cuentas_mesa')->cascadeOnDelete();
            $t->decimal('monto', 10, 2);
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('metodo_pago', ['efectivo', 'tarjeta_entrega', 'tarjeta_tpv', 'transferencia']);
            } else {
                $t->string('metodo_pago', 20);
            }
            $t->string('pagado_por', 60)->nullable(); // etiqueta libre para split "por persona"
            $t->string('stripe_payment_intent_id')->nullable();
            $t->timestamps();

            $t->index(['local_id', 'cuenta_mesa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos_cuenta_mesa');
    }
};
