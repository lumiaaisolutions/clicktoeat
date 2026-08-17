<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tip pooling (F102). `reglas_propina` es config, no dinero real repartido
 * automáticamente todavía — ver nota legal en ADR-012 §3.5 (IMSS/ISR
 * pendiente de confirmar antes de automatizar el reparto físico).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            $t->json('reglas_propina')->nullable()->after('metodos_pago');
        });

        Schema::create('propinas_reparto', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('cuenta_mesa_id')->constrained('cuentas_mesa')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->string('rol', 20);
            $t->decimal('monto', 10, 2);
            $t->timestamps();

            $t->index(['local_id', 'cuenta_mesa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('propinas_reparto');
        Schema::table('locales', function (Blueprint $t) {
            $t->dropColumn('reglas_propina');
        });
    }
};
