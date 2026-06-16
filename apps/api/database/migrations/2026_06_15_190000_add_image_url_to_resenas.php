<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('resenas', function (Blueprint $t) {
            if (! Schema::hasColumn('resenas', 'image_url')) {
                $t->string('image_url', 500)->nullable()->after('comentario');
            }
        });
    }

    public function down(): void
    {
        Schema::table('resenas', function (Blueprint $t) {
            if (Schema::hasColumn('resenas', 'image_url')) $t->dropColumn('image_url');
        });
    }
};
