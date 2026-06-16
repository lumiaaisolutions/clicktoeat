<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            if (! Schema::hasColumn('locales', 'pago_externo')) {
                $t->boolean('pago_externo')->default(false)->after('canceled_at');
            }
            if (! Schema::hasColumn('locales', 'pago_externo_notas')) {
                $t->string('pago_externo_notas', 250)->nullable()->after('pago_externo');
            }
        });
    }

    public function down(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            if (Schema::hasColumn('locales', 'pago_externo_notas')) $t->dropColumn('pago_externo_notas');
            if (Schema::hasColumn('locales', 'pago_externo'))       $t->dropColumn('pago_externo');
        });
    }
};
