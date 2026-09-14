<?php

namespace Tests\Feature\Organization;

use App\Models\Local;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SucursalSelfServiceTest extends TestCase
{
    use RefreshDatabase;

    private function ownerPremium(): array
    {
        $local = Local::factory()->withPlan('premium')->create(['nombre' => 'Matriz']);
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        return [$owner, $local];
    }

    public function test_owner_premium_crea_sucursal_hereda_branding_y_crea_organizacion(): void
    {
        [$owner, $local] = $this->ownerPremium();
        $local->update(['color_primario' => '#123456', 'tipografia' => 'Inter']);

        $res = $this->postJson('/api/v1/me/sucursales', [
            'nombre' => 'Sucursal Centro',
            'whatsapp' => '5215500000000',
        ])->assertCreated();

        $sucursalId = $res->json('data.id');
        $sucursal = Local::find($sucursalId);

        // Hereda branding del padre
        $this->assertSame('#123456', $sucursal->color_primario);
        $this->assertSame('Inter', $sucursal->tipografia);
        // Billing cubierto por la organización
        $this->assertTrue($sucursal->pago_externo);
        $this->assertSame($local->plan_id, $sucursal->plan_id);
        $this->assertTrue($sucursal->hasActivePlan());
        // Organización creada y ambos locales enrolados
        $this->assertNotNull($sucursal->organization_id);
        $this->assertSame($sucursal->organization_id, $local->fresh()->organization_id);
        // El owner queda enrolado en la sucursal (aparece en el switcher)
        $this->assertTrue($owner->fresh()->canAccessLocal($sucursalId));
    }

    public function test_slug_no_colisiona(): void
    {
        [, $local] = $this->ownerPremium();
        Local::factory()->create(['slug' => 'centro']);

        $res = $this->postJson('/api/v1/me/sucursales', [
            'nombre' => 'Centro',
            'whatsapp' => '5215511111111',
        ])->assertCreated();

        $this->assertNotSame('centro', $res->json('data.slug'));
    }

    public function test_respeta_limite_del_plan(): void
    {
        [$owner, $local] = $this->ownerPremium();
        $org = Organization::create(['nombre' => 'Cadena', 'owner_user_id' => $owner->id]);
        $local->forceFill(['organization_id' => $org->id])->save();
        // Premium = 5 total; ya hay padre + 4 = 5.
        Local::factory()->count(4)->create(['organization_id' => $org->id]);

        $this->postJson('/api/v1/me/sucursales', [
            'nombre' => 'Una más',
            'whatsapp' => '5215522222222',
        ])->assertStatus(422)->assertJsonPath('code', 'SUCURSAL_LIMIT_REACHED');
    }

    public function test_plan_sin_feature_no_puede(): void
    {
        $local = Local::factory()->withPlan('essential')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/me/sucursales', [
            'nombre' => 'X', 'whatsapp' => '5215533333333',
        ])->assertStatus(402)->assertJsonPath('required_feature', 'sucursales_consolidadas');
    }

    public function test_staff_no_puede_crear_sucursal(): void
    {
        $local = Local::factory()->withPlan('premium')->create();
        $staff = User::factory()->create(['rol' => 'staff', 'local_id' => $local->id]);
        $staff->locales()->syncWithoutDetaching([$local->id]);
        Sanctum::actingAs($staff);

        $this->postJson('/api/v1/me/sucursales', [
            'nombre' => 'X', 'whatsapp' => '5215544444444',
        ])->assertStatus(403);
    }

    public function test_index_lista_sucursales_y_limite(): void
    {
        [, $local] = $this->ownerPremium();

        $this->postJson('/api/v1/me/sucursales', [
            'nombre' => 'Sucursal Norte', 'whatsapp' => '5215555555555',
        ])->assertCreated();

        $this->getJson('/api/v1/me/sucursales')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.limite', 5)
            ->assertJsonPath('meta.puede_crear', true);
    }
}
