<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reservaciones', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('mesa_id')->nullable()->constrained('mesas')->nullOnDelete();
            $t->string('cliente_nombre', 120);
            $t->string('cliente_telefono', 20);
            $t->dateTime('fecha_hora');
            $t->unsignedInteger('personas');
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('estado', ['pendiente', 'confirmada', 'cancelada', 'cumplida'])->default('pendiente');
            } else {
                $t->string('estado', 20)->default('pendiente');
            }
            $t->string('notas', 300)->nullable();
            $t->timestamps();

            $t->index(['local_id', 'fecha_hora']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservaciones');
    }
};
