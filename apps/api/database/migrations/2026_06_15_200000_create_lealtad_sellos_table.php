<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Config por local
        Schema::table('locales', function (Blueprint $t) {
            if (! Schema::hasColumn('locales', 'lealtad_activo')) {
                $t->boolean('lealtad_activo')->default(false)->after('color_overrides');
            }
            if (! Schema::hasColumn('locales', 'lealtad_meta')) {
                $t->unsignedSmallInteger('lealtad_meta')->default(10)->after('lealtad_activo');
            }
            if (! Schema::hasColumn('locales', 'lealtad_premio')) {
                $t->string('lealtad_premio', 120)->nullable()->after('lealtad_meta');
            }
        });

        // Sellos por cliente
        Schema::create('lealtad_sellos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('cliente_email', 191);
            $t->string('cliente_nombre', 120)->nullable();
            $t->unsignedInteger('count')->default(0);
            $t->unsignedInteger('redimidos_total')->default(0);
            $t->timestamp('last_pedido_at')->nullable();
            $t->timestamps();

            $t->unique(['local_id', 'cliente_email'], 'lealtad_unique');
            $t->index('cliente_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lealtad_sellos');
        Schema::table('locales', function (Blueprint $t) {
            foreach (['lealtad_premio', 'lealtad_meta', 'lealtad_activo'] as $c) {
                if (Schema::hasColumn('locales', $c)) $t->dropColumn($c);
            }
        });
    }
};
