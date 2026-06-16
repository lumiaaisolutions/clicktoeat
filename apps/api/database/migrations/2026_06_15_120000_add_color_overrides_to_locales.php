<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            if (! Schema::hasColumn('locales', 'color_overrides')) {
                $t->json('color_overrides')->nullable()->after('color_fondo');
            }
        });
    }

    public function down(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            if (Schema::hasColumn('locales', 'color_overrides')) {
                $t->dropColumn('color_overrides');
            }
        });
    }
};
