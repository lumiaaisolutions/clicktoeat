<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\MovimientoInventario;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PuntoVentaTest extends TestCase
{
    use RefreshDatabase;

    protected Local $local;
    protected User $owner;
    protected User $staff;
    protected Producto $tacoPastor;
    protected Ingrediente $tortilla;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local = Local::create([
            'nombre' => 'Tacos POS', 'slug' => 'tacos-pos', 'whatsapp' => '5215512345678',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'sans', 'delivery_fee' => 35, 'activo' => true,
        ]);

        $this->owner = User::create([
            'nombre' => 'Owner', 'email' => 'owner@pos.test',
            'password' => Hash::make('password123'), 'rol' => 'owner',
            'local_id' => $this->local->id,
        ]);

        $this->staff = User::create([
            'nombre' => 'Cajero', 'email' => 'cajero@pos.test',
            'password' => Hash::make('password123'), 'rol' => 'staff',
            'local_id' => $this->local->id,
        ]);

        $cat = Categoria::create([
            'local_id' => $this->local->id,
            'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $this->tacoPastor = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $cat->id,
            'nombre' => 'Taco al Pastor', 'slug' => 'taco-al-pastor',
            'precio' => 28, 'disponible' => true,
        ]);
        $this->tortilla = Ingrediente::create([
            'local_id' => $this->local->id, 'nombre' => 'Tortilla',
            'stock' => 100, 'unidad' => 'pz', 'activo' => true,
        ]);
        Receta::create([
            'producto_id' => $this->tacoPastor->id,
            'ingrediente_id' => $this->tortilla->id,
            'cantidad' => 1,
        ]);
    }

    /** @test */
    public function staff_crea_un_pedido_en_sucursal_y_se_marca_confirmado(): void
    {
        $resp = $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/v1/pedidos', [
                'metodo_entrega' => 'sucursal',
                'metodo_pago'    => 'efectivo',
                'items' => [['producto_id' => $this->tacoPastor->id, 'cantidad' => 5]],
            ]);

        $resp->assertCreated()
            ->assertJsonPath('data.metodo_entrega', 'sucursal')
            ->assertJsonPath('data.estado',         'confirmado')   // auto-confirma
            ->assertJsonPath('data.cliente_nombre', 'Mostrador')    // default
            ->assertJsonPath('data.delivery_fee',   0)               // sucursal no cobra envío
            ->assertJsonPath('data.total',          5 * 28);

        // Inventario descontado
        $this->assertEqualsWithDelta(95.0, (float) $this->tortilla->fresh()->stock, 0.001);

        // Movimiento registrado
        $this->assertSame(1, MovimientoInventario::where('tipo', 'salida')->count());
    }

    /** @test */
    public function acepta_metodo_pago_tarjeta_tpv(): void
    {
        $resp = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/pedidos', [
                'metodo_entrega' => 'sucursal',
                'metodo_pago'    => 'tarjeta_tpv',
                'items' => [['producto_id' => $this->tacoPastor->id, 'cantidad' => 1]],
            ]);

        $resp->assertCreated()->assertJsonPath('data.metodo_pago', 'tarjeta_tpv');
    }

    /** @test */
    public function acepta_cliente_nombre_personalizado_para_apartar_orden(): void
    {
        $resp = $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/v1/pedidos', [
                'cliente'        => ['nombre' => 'Mesa 4'],
                'metodo_entrega' => 'sucursal',
                'metodo_pago'    => 'efectivo',
                'items' => [['producto_id' => $this->tacoPastor->id, 'cantidad' => 2]],
            ]);

        $resp->assertCreated()
            ->assertJsonPath('data.cliente_nombre', 'Mesa 4');
    }

    /** @test */
    public function rechaza_pos_sin_stock_y_no_descuenta(): void
    {
        $this->tortilla->update(['stock' => 50]); // < lo que se va a pedir
        $stockAntes = $this->tortilla->fresh()->stock;

        $resp = $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/v1/pedidos', [
                'metodo_entrega' => 'sucursal',
                'metodo_pago'    => 'efectivo',
                'items' => [['producto_id' => $this->tacoPastor->id, 'cantidad' => 99]], // tope de validación
            ]);

        $resp->assertStatus(409);
        $this->assertSame((float) $stockAntes, (float) $this->tortilla->fresh()->stock);
        $this->assertSame(0, Pedido::count());
    }

    /** @test */
    public function usuario_sin_local_id_no_puede_crear_pedido_pos(): void
    {
        $superAdmin = User::create([
            'nombre' => 'Super', 'email' => 'sa@pos.test',
            'password' => Hash::make('password123'), 'rol' => 'super_admin',
            'local_id' => null,
        ]);
        // refrescar de BD para que strict mode tenga todos los atributos cargados
        $superAdmin = User::findOrFail($superAdmin->id);

        $this->actingAs($superAdmin, 'sanctum')
            ->postJson('/api/v1/pedidos', [
                'metodo_entrega' => 'sucursal',
                'metodo_pago'    => 'efectivo',
                'items' => [['producto_id' => $this->tacoPastor->id, 'cantidad' => 1]],
            ])
            ->assertStatus(403);   // sin local_id, authorize() false
    }

    /** @test */
    public function pedido_de_sucursal_aparece_en_la_lista_general_del_local(): void
    {
        $this->actingAs($this->staff, 'sanctum')
            ->postJson('/api/v1/pedidos', [
                'metodo_entrega' => 'sucursal',
                'metodo_pago'    => 'efectivo',
                'items' => [['producto_id' => $this->tacoPastor->id, 'cantidad' => 1]],
            ])->assertCreated();

        $resp = $this->actingAs($this->owner, 'sanctum')->getJson('/api/v1/pedidos');
        $resp->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.metodo_entrega', 'sucursal');
    }
}
