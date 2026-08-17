<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pisos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('nombre', 60);
            $t->integer('orden')->default(0);
            $t->timestamps();

            $t->index(['local_id', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pisos');
    }
};
