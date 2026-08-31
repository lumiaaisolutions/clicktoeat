<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase A del roadmap de salón (docs/features/salon-roadmap.md): la mesa ahora
 * sabe QUIÉN la atiende. `atendido_por` es nullable (una mesa libre no tiene
 * mesero). FK a users solo en MySQL — sqlite no soporta agregar FK vía ALTER.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('mesas', 'atendido_por')) {
            Schema::table('mesas', function (Blueprint $t) {
                $t->foreignId('atendido_por')->nullable()->after('estado');
                $t->timestamp('atendido_desde')->nullable()->after('atendido_por');
            });

            if (DB::connection()->getDriverName() === 'mysql') {
                Schema::table('mesas', function (Blueprint $t) {
                    $t->foreign('atendido_por')->references('id')->on('users')->nullOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql' && Schema::hasColumn('mesas', 'atendido_por')) {
            Schema::table('mesas', function (Blueprint $t) {
                $t->dropForeign(['atendido_por']);
            });
        }
        Schema::table('mesas', function (Blueprint $t) {
            $t->dropColumn(['atendido_por', 'atendido_desde']);
        });
    }
};
