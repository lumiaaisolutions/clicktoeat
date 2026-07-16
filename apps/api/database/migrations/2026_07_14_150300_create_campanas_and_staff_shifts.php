<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campanas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('nombre', 120);
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('tipo', ['email', 'push'])->default('email');
            } else {
                $t->string('tipo', 10)->default('email');
            }
            $t->string('asunto', 150)->nullable();
            $t->text('mensaje');
            $t->string('segmento', 30)->default('todos'); // v1: sólo 'todos' — ver plan de implementación
            $t->timestamp('programada_para')->nullable();
            $t->timestamp('enviada_at')->nullable();
            $t->unsignedInteger('destinatarios_count')->nullable();
            $t->timestamps();

            $t->index(['local_id', 'enviada_at']);
        });

        Schema::create('staff_shifts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->dateTime('inicio');
            $t->dateTime('fin');
            $t->string('rol', 20); // cocina|mesero|caja — libre, no FK a MODULOS_VALIDOS
            $t->timestamps();

            $t->index(['local_id', 'inicio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_shifts');
        Schema::dropIfExists('campanas');
    }
};
