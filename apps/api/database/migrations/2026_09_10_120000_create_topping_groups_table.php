<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo reutilizable de "toppings" / grupos de opciones (Tamaño, Salsas,
 * Extras…). Se administran aparte y se seleccionan al crear un producto, en vez
 * de re-escribirlos cada vez. Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('topping_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $table->string('nombre', 80);
            $table->string('kind', 10)->default('many');   // one | many
            $table->boolean('required')->default(false);
            $table->json('items');                          // [{ name, price }]
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->index('local_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topping_groups');
    }
};
