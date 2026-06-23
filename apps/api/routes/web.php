<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name'    => config('app.name'),
        'version' => '1.0.0',
        'docs'    => url('/api/documentation'),
    ]);
});

/*
 * Stub `login` route.
 *
 * Laravel's `Authenticate` middleware calls `route('login')` cuando una
 * request guarded llega sin Accept: application/json. Como esta API no
 * tiene UI de login (el frontend Next.js corre en otro origen), faltaba
 * la ruta y se devolvía 500 (RouteNotFoundException) en vez de 401.
 *
 * Esto resuelve `route('login')` y devuelve el 401 JSON correcto sin
 * importar el Accept header.
 */
Route::any('/login', function () {
    return response()->json(['message' => 'No autenticado'], 401);
})->name('login');
