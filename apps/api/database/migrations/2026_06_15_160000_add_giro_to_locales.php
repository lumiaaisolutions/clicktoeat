<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            if (! Schema::hasColumn('locales', 'giro')) {
                $t->string('giro', 40)->nullable()->after('slug');
            }
        });
    }

    public function down(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            if (Schema::hasColumn('locales', 'giro')) $t->dropColumn('giro');
        });
    }
};
