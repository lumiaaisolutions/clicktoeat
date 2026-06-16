<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('local_id')->nullable()->constrained('locales')->cascadeOnDelete();
            // El endpoint del browser es único por suscripción.
            $t->string('endpoint', 500)->unique();
            $t->string('p256dh', 128);
            $t->string('auth', 64);
            $t->string('user_agent', 200)->nullable();
            $t->timestamp('last_used_at')->nullable();
            $t->timestamps();

            $t->index(['user_id', 'local_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
