<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('carritos_abandonados', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('email', 191);
            $t->string('cliente_nombre', 120)->nullable();
            $t->json('items');                 // [{producto_id, nombre, cantidad, precio}, ...]
            $t->decimal('total_estimado', 10, 2)->default(0);
            $t->timestamp('seen_at')->useCurrent();      // última actividad
            $t->timestamp('recovered_at')->nullable();   // se convirtió en pedido
            $t->timestamp('notified_at')->nullable();    // mail ya enviado
            $t->timestamps();

            $t->index(['local_id', 'email']);
            $t->index('seen_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carritos_abandonados');
    }
};
