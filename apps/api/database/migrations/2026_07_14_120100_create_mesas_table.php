<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mesas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->foreignId('piso_id')->nullable()->constrained('pisos')->nullOnDelete();
            $t->string('etiqueta', 40);                 // "Mesa 5", "Barra 2"
            $t->integer('pos_x')->default(0);           // posición en el mapa de piso (grid simple, no canvas libre en v1)
            $t->integer('pos_y')->default(0);
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('estado', ['libre', 'ocupada', 'por_cobrar'])->default('libre');
            } else {
                $t->string('estado', 20)->default('libre');
            }
            $t->string('qr_token', 40)->unique();
            $t->timestamps();

            $t->index(['local_id', 'piso_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mesas');
    }
};
