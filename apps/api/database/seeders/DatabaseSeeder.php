<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UsuariosSeeder::class,
            LocalesSeeder::class,
            InventarioSeeder::class,
            PostresStitchSeeder::class,
        ]);
    }
}
