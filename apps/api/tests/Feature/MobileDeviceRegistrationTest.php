<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\MobileDevice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MobileDeviceRegistrationTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function owner_puede_registrar_su_dispositivo(): void
    {
        $local = Local::factory()->create();
        $owner = User::factory()->owner($local)->create();

        Sanctum::actingAs($owner, ['*']);

        $this->postJson('/api/v1/mobile/register-device', [
            'expo_push_token' => 'ExponentPushToken[abc123]',
            'platform'        => 'ios',
            'device_name'     => 'iPhone Cocina',
        ])->assertCreated();

        $this->assertDatabaseHas('mobile_devices', [
            'expo_push_token' => 'ExponentPushToken[abc123]',
            'user_id'         => $owner->id,
            'local_id'        => $local->id,
            'platform'        => 'ios',
            'device_name'     => 'iPhone Cocina',
        ]);
    }

    /** @test */
    public function reregistro_del_mismo_token_actualiza_no_duplica(): void
    {
        $local = Local::factory()->create();
        $owner = User::factory()->owner($local)->create();

        Sanctum::actingAs($owner, ['*']);

        $payload = [
            'expo_push_token' => 'ExponentPushToken[abc123]',
            'platform'        => 'ios',
            'device_name'     => 'iPhone Cocina',
        ];

        $this->postJson('/api/v1/mobile/register-device', $payload)->assertCreated();
        $this->postJson('/api/v1/mobile/register-device', array_merge($payload, [
            'device_name' => 'iPhone Caja',
        ]))->assertCreated();

        $this->assertSame(1, MobileDevice::query()->count());
        $this->assertDatabaseHas('mobile_devices', [
            'expo_push_token' => 'ExponentPushToken[abc123]',
            'device_name'     => 'iPhone Caja',
        ]);
    }

    /** @test */
    public function token_ya_registrado_para_otro_user_responde_409(): void
    {
        // SEV-11 — Antes el token se reasignaba silenciosamente al nuevo
        // user. Ahora rechazamos con 409 para evitar que un atacante con
        // un token Expo filtrado silencie las notificaciones del owner real.
        $localA = Local::factory()->create();
        $ownerA = User::factory()->owner($localA)->create();

        $localB = Local::factory()->create();
        $ownerB = User::factory()->owner($localB)->create();

        Sanctum::actingAs($ownerA, ['*']);
        $this->postJson('/api/v1/mobile/register-device', [
            'expo_push_token' => 'ExponentPushToken[shared]',
            'platform'        => 'ios',
        ])->assertCreated();

        Sanctum::actingAs($ownerB, ['*']);
        $this->postJson('/api/v1/mobile/register-device', [
            'expo_push_token' => 'ExponentPushToken[shared]',
            'platform'        => 'ios',
        ])->assertStatus(409)
          ->assertJsonPath('code', 'device_already_registered');

        // El registro del owner original NO se modificó.
        $device = MobileDevice::query()->first();
        $this->assertSame($ownerA->id, $device->user_id);
        $this->assertSame($localA->id, $device->local_id);
        $this->assertSame(1, MobileDevice::query()->count());
    }

    /** @test */
    public function unregister_solo_borra_si_es_del_user(): void
    {
        $localA = Local::factory()->create();
        $ownerA = User::factory()->owner($localA)->create();

        $localB = Local::factory()->create();
        $ownerB = User::factory()->owner($localB)->create();

        Sanctum::actingAs($ownerA, ['*']);
        $this->postJson('/api/v1/mobile/register-device', [
            'expo_push_token' => 'ExponentPushToken[A]',
            'platform'        => 'ios',
        ])->assertCreated();

        // Owner B intenta borrar el token de A → no debe borrar nada.
        Sanctum::actingAs($ownerB, ['*']);
        $this->postJson('/api/v1/mobile/unregister-device', [
            'expo_push_token' => 'ExponentPushToken[A]',
        ])->assertOk();

        $this->assertDatabaseHas('mobile_devices', [
            'expo_push_token' => 'ExponentPushToken[A]',
            'user_id'         => $ownerA->id,
        ]);
    }

    /** @test */
    public function endpoint_requiere_autenticacion(): void
    {
        $this->postJson('/api/v1/mobile/register-device', [
            'expo_push_token' => 'ExponentPushToken[abc123]',
            'platform'        => 'ios',
        ])->assertUnauthorized();
    }

    /** @test */
    public function platform_invalido_se_rechaza(): void
    {
        $local = Local::factory()->create();
        $owner = User::factory()->owner($local)->create();

        Sanctum::actingAs($owner, ['*']);

        $this->postJson('/api/v1/mobile/register-device', [
            'expo_push_token' => 'ExponentPushToken[abc123]',
            'platform'        => 'windows',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors('platform');
    }
}
