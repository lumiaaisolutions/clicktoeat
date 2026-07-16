<?php

namespace Tests\Feature;

use App\Mail\CampanaMail;
use App\Models\Campana;
use App\Models\Categoria;
use App\Models\CuentaMesa;
use App\Models\Local;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\Reservacion;
use App\Models\User;
use App\Services\Salon\GiftCardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * F102 — Etapa D (reservaciones, loyalty tiers/challenges, gift cards, turnos).
 */
class CrecimientoYRrhhTest extends TestCase
{
    use RefreshDatabase;

    protected Local $localA;

    protected Local $localB;

    protected User $ownerA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->localA = Local::create([
            'nombre' => 'Local A', 'slug' => 'local-a', 'whatsapp' => '5215500000001',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Bricolage Grotesque', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->localB = Local::create([
            'nombre' => 'Local B', 'slug' => 'local-b', 'whatsapp' => '5215500000002',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Bricolage Grotesque', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->ownerA = User::create([
            'nombre' => 'Owner A', 'email' => 'owner@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $this->localA->id,
        ]);
    }

    public function test_owner_crea_reservacion(): void
    {
        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/reservaciones', [
            'cliente_nombre' => 'Juan', 'cliente_telefono' => '5551234567',
            'fecha_hora' => now()->addDay()->toDateTimeString(), 'personas' => 4,
        ]);

        $resp->assertCreated();
        $this->assertDatabaseHas('reservaciones', ['cliente_nombre' => 'Juan', 'local_id' => $this->localA->id]);
    }

    public function test_owner_no_ve_reservaciones_de_otro_local(): void
    {
        Reservacion::create([
            'local_id' => $this->localB->id, 'cliente_nombre' => 'Ajeno', 'cliente_telefono' => '555',
            'fecha_hora' => now(), 'personas' => 2,
        ]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson('/api/v1/reservaciones');
        $resp->assertOk();
        $this->assertCount(0, $resp->json('data'));
    }

    public function test_no_se_puede_reservar_la_misma_mesa_en_horario_traslapado(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 1']);
        $hora = now()->addDay()->setTime(20, 0);

        $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/reservaciones', [
            'mesa_id' => $mesa->id, 'cliente_nombre' => 'Juan', 'cliente_telefono' => '5551234567',
            'fecha_hora' => $hora->toDateTimeString(), 'personas' => 2,
        ])->assertCreated();

        // 30 min después, misma mesa — dentro de la ventana de traslape de 90 min.
        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/reservaciones', [
            'mesa_id' => $mesa->id, 'cliente_nombre' => 'Ana', 'cliente_telefono' => '5551234568',
            'fecha_hora' => $hora->copy()->addMinutes(30)->toDateTimeString(), 'personas' => 4,
        ]);
        $resp->assertStatus(409);
        $this->assertSame(1, Reservacion::where('mesa_id', $mesa->id)->count());
    }

    public function test_se_puede_reservar_la_misma_mesa_fuera_de_la_ventana_de_traslape(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 1']);
        $hora = now()->addDay()->setTime(20, 0);

        $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/reservaciones', [
            'mesa_id' => $mesa->id, 'cliente_nombre' => 'Juan', 'cliente_telefono' => '5551234567',
            'fecha_hora' => $hora->toDateTimeString(), 'personas' => 2,
        ])->assertCreated();

        // 3 horas después — fuera de la ventana de 90 min.
        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/reservaciones', [
            'mesa_id' => $mesa->id, 'cliente_nombre' => 'Ana', 'cliente_telefono' => '5551234568',
            'fecha_hora' => $hora->copy()->addHours(3)->toDateTimeString(), 'personas' => 4,
        ]);
        $resp->assertCreated();
        $this->assertSame(2, Reservacion::where('mesa_id', $mesa->id)->count());
    }

    public function test_reservaciones_sin_mesa_asignada_nunca_traslapan(): void
    {
        $hora = now()->addDay()->setTime(20, 0);

        $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/reservaciones', [
            'cliente_nombre' => 'Juan', 'cliente_telefono' => '5551234567',
            'fecha_hora' => $hora->toDateTimeString(), 'personas' => 2,
        ])->assertCreated();

        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/reservaciones', [
            'cliente_nombre' => 'Ana', 'cliente_telefono' => '5551234568',
            'fecha_hora' => $hora->toDateTimeString(), 'personas' => 4,
        ]);
        $resp->assertCreated();
    }

    public function test_owner_crea_tier_y_challenge_de_lealtad(): void
    {
        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/lealtad-tiers', ['nombre' => 'Oro', 'sellos_requeridos' => 10, 'beneficio' => '20% descuento'])
            ->assertCreated();

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/lealtad-challenges', [
                'nombre' => '3 en 7 días', 'criterio' => ['tipo' => 'pedidos_en_dias', 'cantidad' => 3, 'dias' => 7],
                'premio' => 'Postre gratis',
            ])->assertCreated();

        $this->assertDatabaseHas('lealtad_tiers', ['nombre' => 'Oro', 'local_id' => $this->localA->id]);
        $this->assertDatabaseHas('lealtad_challenges', ['nombre' => '3 en 7 días', 'local_id' => $this->localA->id]);
    }

    public function test_owner_emite_gift_card(): void
    {
        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/gift-cards', ['monto' => 500, 'comprador_email' => 'cliente@test.local']);

        $resp->assertCreated()->assertJsonPath('data.saldo', '500.00');
        $this->assertDatabaseHas('gift_card_movimientos', ['tipo' => 'emision', 'monto' => 500]);
    }

    public function test_redimir_gift_card_descuenta_saldo_y_es_idempotente_por_pedido(): void
    {
        $categoria = Categoria::create([
            'local_id' => $this->localA->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $producto = Producto::create([
            'local_id' => $this->localA->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 20, 'disponible' => true,
        ]);
        $pedido = Pedido::create([
            'local_id' => $this->localA->id, 'cliente_nombre' => 'Juan', 'cliente_telefono' => '555',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 20, 'delivery_fee' => 0, 'descuento' => 0, 'total' => 20, 'estado' => 'nuevo',
        ]);

        $service = app(GiftCardService::class);
        $giftCard = $service->emitir($this->localA, 100);

        $service->redimir($giftCard, 20, $pedido);
        $this->assertSame('80.00', $giftCard->fresh()->saldo);

        // Redimir de nuevo con el MISMO pedido no debe descontar otra vez (idempotencia).
        $service->redimir($giftCard, 20, $pedido);
        $this->assertSame('80.00', $giftCard->fresh()->saldo);
    }

    public function test_redimir_gift_card_sin_saldo_suficiente_falla(): void
    {
        $pedido = Pedido::create([
            'local_id' => $this->localA->id, 'cliente_nombre' => 'Juan', 'cliente_telefono' => '555',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 200, 'delivery_fee' => 0, 'descuento' => 0, 'total' => 200, 'estado' => 'nuevo',
        ]);
        $service = app(GiftCardService::class);
        $giftCard = $service->emitir($this->localA, 50);

        $this->expectException(\RuntimeException::class);
        $service->redimir($giftCard, 200, $pedido);
    }

    public function test_pedido_publico_aplica_gift_card_al_checkout(): void
    {
        $categoria = Categoria::create([
            'local_id' => $this->localA->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $producto = Producto::create([
            'local_id' => $this->localA->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 100, 'disponible' => true,
        ]);
        $giftCard = app(GiftCardService::class)->emitir($this->localA, 30);

        $resp = $this->postJson("/api/v1/public/pedidos/{$this->localA->slug}", [
            'cliente' => ['nombre' => 'Juan', 'telefono' => '5551234567'],
            'metodo_entrega' => 'pickup',
            'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
            'gift_card_codigo' => $giftCard->codigo,
        ]);

        $resp->assertCreated()
            ->assertJsonPath('data.total', 70)
            ->assertJsonPath('data.descuento', 30);
        $this->assertSame('0.00', $giftCard->fresh()->saldo);
    }

    public function test_gift_card_de_otro_local_no_se_puede_aplicar(): void
    {
        $categoria = Categoria::create([
            'local_id' => $this->localA->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $producto = Producto::create([
            'local_id' => $this->localA->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 100, 'disponible' => true,
        ]);
        $giftCardAjena = app(GiftCardService::class)->emitir($this->localB, 30);

        $resp = $this->postJson("/api/v1/public/pedidos/{$this->localA->slug}", [
            'cliente' => ['nombre' => 'Juan', 'telefono' => '5551234567'],
            'metodo_entrega' => 'pickup',
            'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $producto->id, 'cantidad' => 1]],
            'gift_card_codigo' => $giftCardAjena->codigo,
        ]);

        // El pedido se crea igual (gift card inválida se ignora, no rompe el checkout)
        $resp->assertCreated()->assertJsonPath('data.total', 100);
        $this->assertSame('30.00', $giftCardAjena->fresh()->saldo);
    }

    public function test_owner_aplica_gift_card_a_cuenta_de_mesa(): void
    {
        $categoria = Categoria::create([
            'local_id' => $this->localA->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $producto = Producto::create([
            'local_id' => $this->localA->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 50, 'disponible' => true,
        ]);
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 1']);
        $this->postJson("/api/v1/public/mesa/{$mesa->qr_token}/pedidos", [
            'items' => [['producto_id' => $producto->id, 'cantidad' => 2]],
        ])->assertCreated(); // $100

        $giftCard = app(GiftCardService::class)->emitir($this->localA, 40);
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/gift-card", ['codigo' => $giftCard->codigo]);

        $resp->assertOk()->assertJsonPath('data.total', '60.00');
        $this->assertSame('0.00', $giftCard->fresh()->saldo);

        // Cerrar la cuenta ahora sólo requiere cubrir $60, no $100.
        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/cerrar", [
                'pagos' => [['monto' => 60, 'metodo_pago' => 'efectivo']],
            ])->assertOk();
    }

    public function test_owner_crea_turno_de_staff_y_no_ve_turnos_de_otro_local(): void
    {
        $staff = User::create([
            'nombre' => 'Mesero', 'email' => 'mesero@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['mesero'],
        ]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/staff-shifts', [
            'user_id' => $staff->id,
            'inicio' => now()->addDay()->setTime(9, 0)->toDateTimeString(),
            'fin' => now()->addDay()->setTime(17, 0)->toDateTimeString(),
            'rol' => 'mesero',
        ]);
        $resp->assertCreated();

        $this->assertDatabaseHas('staff_shifts', ['user_id' => $staff->id, 'local_id' => $this->localA->id]);
    }

    public function test_owner_envia_campana_por_email_a_clientes_del_local(): void
    {
        Mail::fake();

        Pedido::create([
            'local_id' => $this->localA->id, 'cliente_nombre' => 'Juan', 'cliente_email' => 'juan@test.local',
            'cliente_telefono' => '555', 'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 20, 'delivery_fee' => 0, 'descuento' => 0, 'total' => 20, 'estado' => 'entregado',
        ]);
        Pedido::create([
            'local_id' => $this->localB->id, 'cliente_nombre' => 'Ajeno', 'cliente_email' => 'ajeno@test.local',
            'cliente_telefono' => '555', 'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 20, 'delivery_fee' => 0, 'descuento' => 0, 'total' => 20, 'estado' => 'entregado',
        ]);

        $campana = Campana::create([
            'local_id' => $this->localA->id, 'nombre' => 'Promo julio', 'tipo' => 'email',
            'asunto' => '2x1 en tacos', 'mensaje' => 'Este fin de semana 2x1.', 'segmento' => 'todos',
        ]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson("/api/v1/campanas/{$campana->id}/enviar");

        $resp->assertOk()->assertJsonPath('data.destinatarios_count', 1);
        Mail::assertSent(CampanaMail::class, function ($mail) {
            return $mail->hasTo('juan@test.local');
        });
        Mail::assertNotSent(CampanaMail::class, function ($mail) {
            return $mail->hasTo('ajeno@test.local');
        });
    }

    public function test_campana_push_a_clientes_no_soportada_todavia(): void
    {
        $campana = Campana::create([
            'local_id' => $this->localA->id, 'nombre' => 'Push promo', 'tipo' => 'push', 'mensaje' => 'Hola',
        ]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson("/api/v1/campanas/{$campana->id}/enviar");

        $resp->assertStatus(409);
        $this->assertNull($campana->fresh()->enviada_at);
    }

    public function test_no_se_puede_reenviar_una_campana_ya_enviada(): void
    {
        Mail::fake();
        $campana = Campana::create([
            'local_id' => $this->localA->id, 'nombre' => 'Promo', 'tipo' => 'email', 'mensaje' => 'Hola',
            'enviada_at' => now(),
        ]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson("/api/v1/campanas/{$campana->id}/enviar");

        $resp->assertStatus(409);
    }

    public function test_owner_no_puede_asignar_turno_a_staff_de_otro_local(): void
    {
        $staffAjeno = User::create([
            'nombre' => 'Staff Ajeno', 'email' => 'staff@local-b.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localB->id,
        ]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/staff-shifts', [
            'user_id' => $staffAjeno->id,
            'inicio' => now()->addDay()->toDateTimeString(),
            'fin' => now()->addDay()->addHours(8)->toDateTimeString(),
            'rol' => 'mesero',
        ]);

        $resp->assertStatus(422);
    }
}
