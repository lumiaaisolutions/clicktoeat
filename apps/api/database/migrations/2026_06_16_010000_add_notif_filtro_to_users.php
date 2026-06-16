<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (! Schema::hasColumn('users', 'notif_filtro')) {
                // todos | cocina | caja | delivery | ninguno
                $t->string('notif_filtro', 20)->default('todos')->after('permisos');
            }
        });
    }
    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (Schema::hasColumn('users', 'notif_filtro')) $t->dropColumn('notif_filtro');
        });
    }
};
