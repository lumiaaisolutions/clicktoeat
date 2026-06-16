<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Cada local tiene un código único auto-generado (slug + 4 chars).
        Schema::table('locales', function (Blueprint $t) {
            if (! Schema::hasColumn('locales', 'codigo_referido')) {
                $t->string('codigo_referido', 32)->nullable()->unique()->after('slug');
            }
        });

        // Tabla de referidos (un local recomienda a otro).
        Schema::create('referrals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('referrer_local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('referred_local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('status', 20)->default('pending');  // pending | rewarded | invalid
            $t->timestamp('rewarded_at')->nullable();
            $t->string('stripe_coupon_id', 100)->nullable();  // coupon que se aplicó al referrer
            $t->timestamps();

            $t->unique(['referrer_local_id', 'referred_local_id']);
            $t->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referrals');
        Schema::table('locales', function (Blueprint $t) {
            if (Schema::hasColumn('locales', 'codigo_referido')) $t->dropColumn('codigo_referido');
        });
    }
};
