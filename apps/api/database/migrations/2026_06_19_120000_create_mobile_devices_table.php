<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mobile_devices', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('local_id')->nullable()->constrained('locales')->cascadeOnDelete();
            // Token Expo Push (ExponentPushToken[xxxxxxxxxx]) o native FCM/APNs.
            $t->string('expo_push_token', 200)->unique();
            $t->string('platform', 10); // 'ios' | 'android'
            $t->string('device_name', 120)->nullable();
            $t->string('app_version', 32)->nullable();
            $t->timestamp('last_seen_at')->nullable();
            $t->timestamps();

            $t->index(['user_id', 'local_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_devices');
    }
};
