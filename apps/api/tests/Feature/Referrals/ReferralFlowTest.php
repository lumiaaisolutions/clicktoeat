<?php

namespace Tests\Feature\Referrals;

use App\Models\Local;
use App\Models\OnboardingToken;
use App\Models\Referral;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Valida que el flujo de captura del código de referido funcione:
 *  - El paso `local` del onboarding acepta `codigo_referido`.
 *  - Si el código corresponde a un local activo distinto, se crea un
 *    `Referral` pending entre referrer y referido.
 *  - Códigos inválidos, inactivos o auto-referenciados NO crean Referral.
 */
class ReferralFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_codigo_referido_valido_crea_referral_pending(): void
    {
        $referrer = Local::factory()->create([
            'codigo_referido' => 'TEST1234',
            'activo'          => true,
        ]);
        $nuevo = Local::factory()->create([
            'codigo_referido' => 'NUEVO5678',
            'activo'          => true,
        ]);
        $token = OnboardingToken::issueFor($nuevo);

        $res = $this->withToken($token->value)
            ->postJson('/api/v1/onboarding/local', [
                'nombre'          => 'Postres del Nuevo',
                'slug'            => 'postres-del-nuevo',
                'codigo_referido' => 'TEST1234',
            ]);

        $res->assertOk();

        $this->assertDatabaseHas('referrals', [
            'referrer_local_id' => $referrer->id,
            'referred_local_id' => $nuevo->id,
            'status'            => 'pending',
        ]);
    }

    public function test_codigo_inexistente_no_crea_referral(): void
    {
        $nuevo = Local::factory()->create(['activo' => true]);
        $token = OnboardingToken::issueFor($nuevo);

        $res = $this->withToken($token->value)
            ->postJson('/api/v1/onboarding/local', [
                'nombre'          => 'Postres del Nuevo',
                'slug'            => 'postres-del-nuevo-2',
                'codigo_referido' => 'NOEXISTE99',
            ]);

        $res->assertOk();
        $this->assertEquals(0, Referral::count());
    }

    public function test_auto_referencia_no_crea_referral(): void
    {
        $local = Local::factory()->create([
            'codigo_referido' => 'YOSOY9999',
            'activo'          => true,
        ]);
        $token = OnboardingToken::issueFor($local);

        $res = $this->withToken($token->value)
            ->postJson('/api/v1/onboarding/local', [
                'nombre'          => $local->nombre,
                'slug'            => $local->slug,
                'codigo_referido' => 'YOSOY9999',
            ]);

        $res->assertOk();
        $this->assertEquals(0, Referral::count());
    }

    public function test_codigo_es_normalizado_a_uppercase(): void
    {
        $referrer = Local::factory()->create([
            'codigo_referido' => 'MAYUS123',
            'activo'          => true,
        ]);
        $nuevo = Local::factory()->create(['activo' => true]);
        $token = OnboardingToken::issueFor($nuevo);

        // El usuario pega el código en minúscula
        $this->withToken($token->value)
            ->postJson('/api/v1/onboarding/local', [
                'nombre'          => 'Postres XYZ',
                'slug'            => 'postres-xyz',
                'codigo_referido' => 'mayus123',
            ])->assertOk();

        $this->assertDatabaseHas('referrals', [
            'referrer_local_id' => $referrer->id,
            'referred_local_id' => $nuevo->id,
            'status'            => 'pending',
        ]);
    }
}
