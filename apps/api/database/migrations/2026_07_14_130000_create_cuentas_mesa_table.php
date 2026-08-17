<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuentas_mesa', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('mesa_id')->constrained('mesas')->cascadeOnDelete();
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('estado', ['abierta', 'pre_cuenta', 'cerrada'])->default('abierta');
            } else {
                $t->string('estado', 20)->default('abierta');
            }
            $t->decimal('subtotal', 10, 2)->default(0);
            $t->decimal('propina_total', 10, 2)->default(0);
            $t->decimal('total', 10, 2)->default(0);
            $t->timestamp('cerrada_at')->nullable();
            $t->timestamps();

            $t->index(['local_id', 'estado']);
            $t->index(['mesa_id', 'estado']);
        });

        Schema::table('pedidos', function (Blueprint $t) {
            $t->foreignId('cuenta_mesa_id')->nullable()->after('mesa_id')
                ->constrained('cuentas_mesa')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            $t->dropConstrainedForeignId('cuenta_mesa_id');
        });
        Schema::dropIfExists('cuentas_mesa');
    }
};
