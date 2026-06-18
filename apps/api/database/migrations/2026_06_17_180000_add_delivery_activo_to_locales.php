<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * F100d — Toggle de servicio a domicilio.
 *
 * Default = true para que los locales existentes mantengan exactamente el
 * mismo comportamiento (delivery disponible si tenían delivery_fee). Los
 * dueños pueden desactivarlo desde /admin/branding y entonces:
 *   - se oculta la opción "Entrega a domicilio" en el landing público
 *   - se ocultan los campos de envío/tiempo/radio del editor de branding
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('locales', function (Blueprint $table) {
            if (! Schema::hasColumn('locales', 'delivery_activo')) {
                $table->boolean('delivery_activo')->default(true)->after('cerrado_temporal');
            }
        });
    }

    public function down(): void
    {
        Schema::table('locales', function (Blueprint $table) {
            if (Schema::hasColumn('locales', 'delivery_activo')) {
                $table->dropColumn('delivery_activo');
            }
        });
    }
};
