<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * F102 — conecta gift cards al checkout (Fase 2, corrección post-build).
 * `pedidos.gift_card_codigo`: aplicado en pedidos públicos normales (pickup/
 * delivery), mismo patrón que `cupon_codigo`.
 * `cuentas_mesa.gift_card_id`/`descuento_gift_card`: aplicado a nivel cuenta
 * de mesa (puede cubrir varios pedidos), no a un pedido individual.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            $t->string('gift_card_codigo')->nullable()->after('cupon_codigo');
        });

        Schema::table('cuentas_mesa', function (Blueprint $t) {
            $t->foreignId('gift_card_id')->nullable()->after('mesa_id')
                ->constrained('gift_cards')->nullOnDelete();
            $t->decimal('descuento_gift_card', 10, 2)->default(0)->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('cuentas_mesa', function (Blueprint $t) {
            $t->dropColumn('descuento_gift_card');
            $t->dropConstrainedForeignId('gift_card_id');
        });
        Schema::table('pedidos', function (Blueprint $t) {
            $t->dropColumn('gift_card_codigo');
        });
    }
};
