<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 32)->unique();              // 'essential', 'professional', 'premium'
            $t->string('nombre', 100);
            $t->integer('precio_mxn_centavos');            // 9900, 29900, 49900
            $t->string('stripe_price_id', 100)->nullable();
            $t->json('features');                           // ['inventario', 'pos', …]
            $t->integer('max_productos')->nullable();       // null = ilimitado
            $t->integer('max_categorias')->nullable();
            $t->integer('max_staff')->nullable();
            $t->boolean('activo')->default(true);
            $t->integer('orden')->default(0);               // para ordenar en pricing UI
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
