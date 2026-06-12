<?php

namespace Database\Factories;

use App\Models\Local;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    protected static ?string $defaultPassword = null;

    public function definition(): array
    {
        return [
            'nombre'             => $this->faker->name(),
            'email'              => $this->faker->unique()->safeEmail(),
            'password'           => static::$defaultPassword ??= Hash::make('password123'),
            'rol'                => 'staff',
            'local_id'           => null,
            'email_verified_at'  => now(),
            'remember_token'     => null,
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(fn () => [
            'rol'      => 'super_admin',
            'local_id' => null,
        ]);
    }

    public function owner(?Local $local = null): static
    {
        return $this->state(fn () => [
            'rol'      => 'owner',
            'local_id' => $local?->id ?? Local::factory(),
        ]);
    }

    public function staff(?Local $local = null): static
    {
        return $this->state(fn () => [
            'rol'      => 'staff',
            'local_id' => $local?->id ?? Local::factory(),
        ]);
    }

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }
}
