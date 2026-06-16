<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('local_email_log', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            // tipo: trial_d3, trial_d7, trial_d14, trial_ending, payment_failed, etc.
            $t->string('tipo', 40);
            $t->timestamp('sent_at')->useCurrent();

            $t->unique(['local_id', 'tipo'], 'local_email_log_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('local_email_log');
    }
};
