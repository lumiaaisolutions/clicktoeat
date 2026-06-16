<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (! Schema::hasColumn('users', 'two_factor_secret')) {
                $t->text('two_factor_secret')->nullable()->after('password');
            }
            if (! Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                $t->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_secret');
            }
            if (! Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                $t->text('two_factor_recovery_codes')->nullable()->after('two_factor_confirmed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            foreach (['two_factor_secret', 'two_factor_confirmed_at', 'two_factor_recovery_codes'] as $c) {
                if (Schema::hasColumn('users', $c)) $t->dropColumn($c);
            }
        });
    }
};
