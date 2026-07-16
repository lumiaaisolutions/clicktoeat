<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\Organizations\OrganizationReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Reporte consolidado de la organización del owner autenticado. Ver ADR-014
 * — sólo lectura, sólo para quien es dueño de la organización.
 */
class OrganizationController extends Controller
{
    public function __construct(protected OrganizationReportService $reports) {}

    public function mine(Request $req): JsonResponse
    {
        $org = Organization::query()->where('owner_user_id', $req->user()->id)->first();

        if (! $org) {
            throw new NotFoundHttpException('No perteneces a ninguna organización con sucursales consolidadas.');
        }

        $this->authorize('view', $org);

        return response()->json(['data' => $this->reports->resumen($org)]);
    }
}
