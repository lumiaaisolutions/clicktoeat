<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            $t->foreignId('plan_id')->nullable()->after('owner_id')->constrained('plans')->nullOnDelete();
            // En sqlite usamos string en lugar de enum (no soporta enum).
            if (DB::connection()->getDriverName() === 'mysql') {
                $t->enum('plan_status', ['trialing', 'active', 'past_due', 'canceled', 'incomplete'])
                    ->default('incomplete')
                    ->after('plan_id');
            } else {
                $t->string('plan_status', 20)->default('incomplete')->after('plan_id');
            }
            $t->string('stripe_customer_id', 100)->nullable()->after('plan_status');
            $t->string('stripe_subscription_id', 100)->nullable()->after('stripe_customer_id');
            $t->timestamp('trial_ends_at')->nullable()->after('stripe_subscription_id');
            $t->timestamp('current_period_ends_at')->nullable()->after('trial_ends_at');
            $t->timestamp('canceled_at')->nullable()->after('current_period_ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('locales', function (Blueprint $t) {
            $t->dropConstrainedForeignId('plan_id');
            $t->dropColumn([
                'plan_status',
                'stripe_customer_id',
                'stripe_subscription_id',
                'trial_ends_at',
                'current_period_ends_at',
                'canceled_at',
            ]);
        });
    }
};
