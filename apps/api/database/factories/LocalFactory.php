<?php

namespace Database\Factories;

use App\Models\Local;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Local>
 */
class LocalFactory extends Factory
{
    protected $model = Local::class;

    public function definition(): array
    {
        $nombre = $this->faker->company();

        return [
            'nombre'                => $nombre,
            'slug'                  => Str::slug($nombre).'-'.Str::lower(Str::random(4)),
            'tagline'               => $this->faker->catchPhrase(),
            'whatsapp'              => '521'.$this->faker->numerify('##########'),
            'telefono'              => $this->faker->numerify('##########'),
            'email_contacto'        => $this->faker->companyEmail(),
            'direccion'             => $this->faker->address(),
            'color_primario'        => '#FF2D2D',
            'color_secundario'      => '#0B0B0F',
            'color_fondo'           => '#FAFAF7',
            'tipografia'            => 'Bricolage Grotesque',
            'dark_mode'             => false,
            'delivery_fee'          => 35,
            'delivery_min_minutos'  => 30,
            'delivery_radio_km'     => 5,
            'metodos_pago'          => ['efectivo', 'tarjeta_entrega', 'transferencia'],
            'activo'                => true,
            'suspendido'            => false,
            'cerrado_temporal'      => false,
            'zona_horaria'          => 'America/Mexico_City',
        ];
    }

    public function suspendido(): static
    {
        return $this->state(fn () => ['suspendido' => true]);
    }

    public function inactivo(): static
    {
        return $this->state(fn () => ['activo' => false]);
    }

    public function cerradoTemporal(): static
    {
        return $this->state(fn () => ['cerrado_temporal' => true]);
    }

    public function conHorarios(array $horarios = null): static
    {
        return $this->state(fn () => [
            'horarios' => $horarios ?? [
                ['dia' => 'lun', 'open' => '12:00', 'close' => '23:00'],
                ['dia' => 'mar', 'open' => '12:00', 'close' => '23:00'],
                ['dia' => 'mie', 'open' => '12:00', 'close' => '23:00'],
                ['dia' => 'jue', 'open' => '12:00', 'close' => '23:00'],
                ['dia' => 'vie', 'open' => '12:00', 'close' => '02:00'],
                ['dia' => 'sab', 'open' => '12:00', 'close' => '02:00'],
            ],
        ]);
    }

    public function conCoordenadas(): static
    {
        return $this->state(fn () => [
            'lat' => 19.4326,
            'lng' => -99.1332,
        ]);
    }

    public function withPlan(string $slug = 'professional', string $status = 'trialing'): static
    {
        return $this->state(function () use ($slug, $status) {
            $plan = \App\Models\Plan::query()->where('slug', $slug)->first()
                ?? \App\Models\Plan::factory()->$slug()->create();

            return [
                'plan_id'                => $plan->id,
                'plan_status'            => $status,
                'stripe_customer_id'     => 'cus_test_'.\Illuminate\Support\Str::random(10),
                'stripe_subscription_id' => 'sub_test_'.\Illuminate\Support\Str::random(10),
                'trial_ends_at'          => $status === 'trialing' ? now()->addDays(14) : null,
                'current_period_ends_at' => now()->addMonth(),
            ];
        });
    }
}
