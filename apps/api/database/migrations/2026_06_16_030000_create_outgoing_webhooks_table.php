<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('outgoing_webhooks', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            // Eventos disparadores. Por ahora sólo 'pedido.creado', pero
            // dejamos string para futuras adiciones (pedido.entregado, etc).
            $t->string('event', 40);
            $t->string('url', 500);
            // Secret para que el cliente verifique HMAC SHA-256 del payload.
            $t->string('secret', 80);
            $t->boolean('active')->default(true);
            $t->timestamp('last_called_at')->nullable();
            $t->smallInteger('last_status')->nullable();
            $t->string('last_error', 500)->nullable();
            $t->unsignedInteger('error_count')->default(0);
            $t->timestamps();

            $t->index(['local_id', 'event', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outgoing_webhooks');
    }
};
