<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * GET /clientes/historial?telefono=... — agregado del cliente para el detalle
 * de reseñas. Verifica el agregado, el aislamiento multi-tenant y la exclusión
 * de cancelados.
 */
class ClienteHistorialTest extends TestCase
{
    use RefreshDatabase;

    private function local(string $slug): Local
    {
        return Local::create([
            'nombre' => $slug, 'slug' => $slug, 'whatsapp' => '5215500000000',
            'color_primario' => '#F26A1F', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Outfit', 'delivery_fee' => 0, 'activo' => true,
        ]);
    }

    private function pedido(Local $local, string $tel, float $total, string $estado = 'entregado', ?string $email = null): Pedido
    {
        return Pedido::create([
            'local_id' => $local->id,
            'codigo' => 'CE-'.strtoupper(substr(md5((string) mt_rand()), 0, 6)),
            'cliente_nombre' => 'Cliente',
            'cliente_telefono' => $tel,
            'cliente_email' => $email,
            'whatsapp_url' => 'https://wa.me/'.$tel,
            'metodo_entrega' => 'sucursal', 'metodo_pago' => 'efectivo',
            'estado' => $estado, 'estado_pago' => 'pagado',
            'subtotal' => $total, 'total' => $total,
        ]);
    }

    public function test_agrega_pedidos_del_cliente_y_excluye_cancelados_y_otros_locales(): void
    {
        $a = $this->local('local-a');
        $b = $this->local('local-b');
        $owner = User::create([
            'nombre' => 'Owner A', 'email' => 'owner@a.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $a->id,
        ]);

        $this->pedido($a, '5215511112222', 100);
        $this->pedido($a, '5215511112222', 250);
        $this->pedido($a, '5215511112222', 999, 'cancelado');   // excluido
        $this->pedido($a, '5215599998888', 50);                 // otro cliente
        $this->pedido($b, '5215511112222', 500);                // otro local — no debe contar

        $resp = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/v1/clientes/historial?telefono=5215511112222');

        $resp->assertOk();
        $this->assertEquals(2, $resp->json('data.pedidos'));
        $this->assertEquals(350.0, $resp->json('data.total_gastado'));
    }

    public function test_unifica_al_cliente_por_telefono_o_email(): void
    {
        $a = $this->local('local-a');
        $owner = User::create([
            'nombre' => 'Owner A', 'email' => 'owner@a.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $a->id,
        ]);

        // Mismo cliente: un pedido con teléfono, otro con correo (dato distinto).
        $this->pedido($a, '5215511112222', 100);
        $this->pedido($a, '5210000000000', 250, 'entregado', 'ana@correo.com');
        // Otro cliente (no debe contar).
        $this->pedido($a, '5215599998888', 999, 'entregado', 'otro@correo.com');

        $resp = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/v1/clientes/historial?telefono=5215511112222&email=ana@correo.com');

        $resp->assertOk();
        $this->assertEquals(2, $resp->json('data.pedidos'));
        $this->assertEquals(350.0, $resp->json('data.total_gastado'));
    }

    public function test_cliente_sin_pedidos_devuelve_cero(): void
    {
        $a = $this->local('local-a');
        $owner = User::create([
            'nombre' => 'Owner A', 'email' => 'owner@a.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $a->id,
        ]);

        $resp = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/v1/clientes/historial?telefono=5210000000000');

        $resp->assertOk();
        $this->assertEquals(0, $resp->json('data.pedidos'));
    }
}
