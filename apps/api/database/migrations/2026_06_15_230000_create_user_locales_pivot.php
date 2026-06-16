<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Multi-sucursal (F71): un owner puede tener acceso a varios locales.
 *
 * Estrategia compatible con código existente:
 *   - `users.local_id` sigue siendo el "local activo" (current_local_id).
 *     Todo el código existente que filtra por user.local_id sigue funcionando.
 *   - `user_locales` es la lista completa a la que tiene acceso.
 *   - El usuario puede cambiar el activo con `POST /me/switch-local/{id}`.
 *
 * Backfill: cada usuario con local_id ya seteado se inserta en el pivot.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_locales', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();
            $t->timestamp('created_at')->useCurrent();

            $t->unique(['user_id', 'local_id']);
        });

        // Backfill
        DB::table('users')
            ->whereNotNull('local_id')
            ->orderBy('id')
            ->chunk(200, function ($users) {
                foreach ($users as $u) {
                    DB::table('user_locales')->insertOrIgnore([
                        'user_id'    => $u->id,
                        'local_id'   => $u->local_id,
                        'created_at' => now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_locales');
    }
};
