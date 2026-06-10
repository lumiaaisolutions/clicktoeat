<?php

namespace App\Providers;

use App\Models\Categoria;
use App\Models\Compra;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Notificacion;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\Receta;
use App\Policies\CategoriaPolicy;
use App\Policies\CompraPolicy;
use App\Policies\IngredientePolicy;
use App\Policies\LocalPolicy;
use App\Policies\NotificacionPolicy;
use App\Policies\PedidoPolicy;
use App\Policies\ProductoPolicy;
use App\Policies\RecetaPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Local::class       => LocalPolicy::class,
        Categoria::class   => CategoriaPolicy::class,
        Compra::class      => CompraPolicy::class,
        Producto::class    => ProductoPolicy::class,
        Pedido::class      => PedidoPolicy::class,
        Ingrediente::class => IngredientePolicy::class,
        Receta::class       => RecetaPolicy::class,
        Notificacion::class => NotificacionPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
