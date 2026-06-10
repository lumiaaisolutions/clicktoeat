<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsuariosSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@ClickToEat.app'],
            [
                'nombre'   => 'Super Admin',
                'password' => Hash::make('password123'),
                'rol'      => 'super_admin',
                'email_verified_at' => now(),
            ],
        );
    }
}
