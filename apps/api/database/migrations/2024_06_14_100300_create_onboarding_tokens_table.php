<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('onboarding_tokens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->string('value', 80)->unique();
            $t->json('completed_steps')->nullable();    // ['password', 'local', …]
            $t->timestamp('used_at')->nullable();        // marcado en finalizar
            $t->timestamp('expires_at');                  // 24h por defecto
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_tokens');
    }
};
