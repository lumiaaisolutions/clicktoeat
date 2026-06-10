<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('locales', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();

            // Branding
            $table->string('logo_url')->nullable();
            $table->string('banner_url')->nullable();
            $table->string('color_primario', 9)->default('#FF2D2D');
            $table->string('color_secundario', 9)->default('#0B0B0F');
            $table->string('color_fondo', 9)->default('#FAFAF7');
            $table->string('tipografia')->default('Bricolage Grotesque');
            $table->boolean('dark_mode')->default(false);

            // Contacto
            $table->string('whatsapp', 20);
            $table->string('telefono', 20)->nullable();
            $table->string('email_contacto')->nullable();
            $table->text('direccion')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();

            // Operación
            $table->json('horarios')->nullable();        // [{dia:'lun', open:'12:00', close:'23:00'}, ...]
            $table->json('zona_entrega')->nullable();    // poligono / radio / lista de cps
            $table->decimal('delivery_fee', 8, 2)->default(0);
            $table->unsignedSmallInteger('delivery_min_minutos')->default(30);

            // Redes
            $table->json('redes_sociales')->nullable();  // {ig,fb,tt,wapp}

            // Estado
            $table->boolean('activo')->default(true)->index();
            $table->boolean('suspendido')->default(false)->index();
            $table->boolean('cerrado_temporal')->default(false);
            $table->string('zona_horaria', 60)->default('America/Mexico_City');
            $table->json('modulos')->nullable();         // {inventario:true, promos:true, ...}

            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });

        // FK retroactiva users.local_id → locales.id
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('local_id')->references('id')->on('locales')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['local_id']);
        });
        Schema::dropIfExists('locales');
    }
};
