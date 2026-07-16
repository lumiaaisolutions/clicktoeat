<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('llamados_mesero', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('mesa_id')->constrained('mesas')->cascadeOnDelete();
            $t->timestamp('atendido_at')->nullable();
            $t->foreignId('atendido_por')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();

            $t->index(['local_id', 'atendido_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('llamados_mesero');
    }
};
