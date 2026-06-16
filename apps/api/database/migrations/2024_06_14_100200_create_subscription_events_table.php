<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('subscription_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->nullable()->constrained('locales')->nullOnDelete();
            $t->string('stripe_event_id', 100)->unique();   // idempotencia
            $t->string('type', 100);                         // 'invoice.paid', etc.
            $t->json('payload');                             // raw event
            $t->timestamp('processed_at')->nullable();
            $t->text('error')->nullable();
            $t->timestamps();

            $t->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_events');
    }
};
