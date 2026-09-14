<?php

namespace App\Services\Organizations;

use App\Models\Local;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Alta self-service de sucursales para owners Premium (F102 / ADR-014).
 *
 * Crea un `Local` nuevo colgado de la organización del owner. NO toca el
 * TenantScope: cada sucursal sigue siendo un tenant aislado (ver ADR-014). La
 * sucursal hereda el branding del local padre y arranca con catálogo vacío; su
 * billing queda cubierto por el plan de la organización (`pago_externo`).
 */
class SucursalService
{
    /**
     * @param  array{nombre:string,whatsapp:string,slug?:string|null,email_contacto?:string|null,direccion?:string|null}  $input
     */
    public function crear(User $owner, Local $padre, array $input): Local
    {
        return DB::transaction(function () use ($owner, $padre, $input) {
            // 1. La organización agrupa las sucursales. Si el local padre aún no
            //    tiene una, la creamos y lo enrolamos (retro-compat: locales de
            //    una sola ubicación nunca tienen organización).
            $org = $padre->organization;
            if (! $org) {
                $org = Organization::create([
                    'nombre' => $padre->nombre,
                    'owner_user_id' => $owner->id,
                ]);
                $padre->forceFill(['organization_id' => $org->id])->save();
            }

            // 2. Sucursal nueva: hereda branding del padre, catálogo vacío.
            $sucursal = Local::create([
                'nombre' => $input['nombre'],
                'slug' => $this->slugUnico($input['slug'] ?? $input['nombre']),
                'whatsapp' => $input['whatsapp'],
                'email_contacto' => $input['email_contacto'] ?? $padre->email_contacto,
                'direccion' => $input['direccion'] ?? null,
                // Branding heredado del local padre
                'giro' => $padre->giro,
                'tagline' => $padre->tagline,
                'logo_url' => $padre->logo_url,
                'banner_url' => $padre->banner_url,
                'color_primario' => $padre->color_primario,
                'color_secundario' => $padre->color_secundario,
                'color_fondo' => $padre->color_fondo,
                'color_overrides' => $padre->color_overrides,
                'tipografia' => $padre->tipografia,
                'dark_mode' => $padre->dark_mode,
                'metodos_pago' => $padre->metodos_pago,
                'organization_id' => $org->id,
                'owner_id' => $owner->id,
                'activo' => true,
                'suspendido' => false,
                // Billing: cubierta por el plan de la organización (no cobra aparte).
                'plan_id' => $padre->plan_id,
                'plan_status' => 'active',
                'pago_externo' => true,
                'pago_externo_notas' => "Sucursal incluida en el plan de la organización #{$org->id} (local padre #{$padre->id}).",
            ]);

            // 3. Enrolar al owner en ambos locales (para que aparezcan en el switcher).
            $owner->locales()->syncWithoutDetaching([$padre->id, $sucursal->id]);

            return $sucursal;
        });
    }

    /**
     * Cuenta cuántos locales tiene la organización del padre (incluye al padre).
     * Sin organización todavía → 1 (solo el padre).
     */
    public function conteoActual(Local $padre): int
    {
        if (! $padre->organization_id) {
            return 1;
        }

        return Local::where('organization_id', $padre->organization_id)->count();
    }

    /** Slug único global (incluye soft-deleted para no colisionar al restaurar). */
    private function slugUnico(string $base): string
    {
        $slug = Str::slug($base);
        if ($slug === '') {
            $slug = 'sucursal';
        }

        $candidato = $slug;
        $i = 2;
        while (Local::withTrashed()->where('slug', $candidato)->exists()) {
            $candidato = "{$slug}-{$i}";
            $i++;
        }

        return $candidato;
    }
}
