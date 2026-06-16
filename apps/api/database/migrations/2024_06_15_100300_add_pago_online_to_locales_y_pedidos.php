<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            if (! Schema::hasColumn('locales', 'acepta_pago_online')) {
                $t->boolean('acepta_pago_online')->default(false)->after('metodos_pago');
            }
            // Cuenta connect del owner para recibir el dinero (Stripe Connect).
            // Si null, el cobro va a la cuenta plataforma (modo "marketplace simple").
            if (! Schema::hasColumn('locales', 'stripe_account_id')) {
                $t->string('stripe_account_id', 100)->nullable()->after('acepta_pago_online');
            }
        });

        Schema::table('pedidos', function (Blueprint $t) {
            if (! Schema::hasColumn('pedidos', 'estado_pago')) {
                $t->string('estado_pago', 20)->default('pendiente')->after('estado');
                // pendiente | pagado | fallido | reembolsado
            }
            if (! Schema::hasColumn('pedidos', 'stripe_payment_link_id')) {
                $t->string('stripe_payment_link_id', 100)->nullable()->after('estado_pago');
            }
            if (! Schema::hasColumn('pedidos', 'stripe_payment_intent_id')) {
                $t->string('stripe_payment_intent_id', 100)->nullable()->after('stripe_payment_link_id');
            }
            if (! Schema::hasColumn('pedidos', 'pagado_at')) {
                $t->timestamp('pagado_at')->nullable()->after('stripe_payment_intent_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            foreach (['acepta_pago_online', 'stripe_account_id'] as $col) {
                if (Schema::hasColumn('locales', $col)) $t->dropColumn($col);
            }
        });
        Schema::table('pedidos', function (Blueprint $t) {
            foreach (['estado_pago', 'stripe_payment_link_id', 'stripe_payment_intent_id', 'pagado_at'] as $col) {
                if (Schema::hasColumn('pedidos', $col)) $t->dropColumn($col);
            }
        });
    }
};
