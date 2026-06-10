<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

/**
 * @OA\Info(
 *     title="ClickToEat API",
 *     version="1.0.0",
 *     description="API multi-tenant para landing pages de restaurantes con pedidos por WhatsApp.",
 *     @OA\Contact(email="dev@ClickToEat.app")
 * )
 *
 * @OA\Server(url=L5_SWAGGER_CONST_HOST, description="Local")
 *
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="Token"
 * )
 */
abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;
}
