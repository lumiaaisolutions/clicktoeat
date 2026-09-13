<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Atribución de cobro: quién (usuario/mesero/cajero) marcó pagado un pedido de
 * mostrador. Nullable — pagos legacy o automáticos no lo tienen. FK a users
 * solo en MySQL (sqlite no soporta agregar FK vía ALTER — mismo patrón que
 * atendido_por en mesas).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('pedidos', 'cobrado_por')) {
            Schema::table('pedidos', function (Blueprint $t) {
                $t->foreignId('cobrado_por')->nullable()->after('pagado_at');
            });
            if (DB::connection()->getDriverName() === 'mysql') {
                Schema::table('pedidos', function (Blueprint $t) {
                    $t->foreign('cobrado_por')->references('id')->on('users')->nullOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pedidos', 'cobrado_por')) {
            Schema::table('pedidos', function (Blueprint $t) {
                if (DB::connection()->getDriverName() === 'mysql') {
                    $t->dropForeign(['cobrado_por']);
                }
                $t->dropColumn('cobrado_por');
            });
        }
    }
};
