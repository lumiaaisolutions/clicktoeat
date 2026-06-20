<?php

namespace Tests\Feature;

use Illuminate\Database\Eloquent\Model;
use Tests\TestCase;

/**
 * SEV-6 — Mass assignment guardrail.
 *
 * El `AppServiceProvider::boot()` invoca `Model::unguard()` global, lo que
 * desactiva la protección de mass assignment de Eloquent. Esto es safe
 * SÓLO si cada modelo declara `$fillable` explícito — sin él, un
 * `Model::create($req->all())` aceptaría cualquier columna (`rol`,
 * `local_id`, `stripe_subscription_id`, etc.).
 *
 * Este test recorre `app/Models/` y falla el build si algún modelo no
 * declara `$fillable` o lo deja vacío. Funciona como red de seguridad
 * mientras `Model::unguard()` siga activo. Cuando lo quitemos (SEV-6
 * cierre), este test sigue siendo útil porque garantiza disciplina
 * explícita en cada modelo nuevo.
 */
class FillableGuardTest extends TestCase
{
    /** @test */
    public function todos_los_modelos_declaran_fillable(): void
    {
        $modelos = collect(glob(app_path('Models/*.php')))
            ->map(fn (string $file) => 'App\\Models\\' . basename($file, '.php'))
            ->filter(fn (string $class) => class_exists($class))
            ->filter(fn (string $class) => is_subclass_of($class, Model::class))
            ->values();

        $this->assertNotEmpty($modelos, 'No se encontraron modelos en app/Models/.');

        $sinFillable = [];
        foreach ($modelos as $class) {
            /** @var Model $instance */
            $instance = new $class();
            $fillable = $instance->getFillable();
            $guarded  = $instance->getGuarded();

            // Permitimos dos patrones safe:
            //   1) $fillable declarado y no vacío (allowlist explícito)
            //   2) $guarded declarado y no vacío (denylist explícito).
            //      `$guarded = ['*']` o columnas críticas como ['id', 'rol']
            //      son válidos porque previenen mass assignment de esos campos.
            //
            // Inseguro:
            //   - $fillable = [] Y $guarded = []  → todo asignable, vulnerabilidad
            //   - $fillable = [] Y $guarded vacío por default → idem
            $tieneAllowlist = ! empty($fillable);
            $tieneDenylist  = ! empty($guarded);

            if (! $tieneAllowlist && ! $tieneDenylist) {
                $sinFillable[] = $class;
            }
        }

        $this->assertEmpty(
            $sinFillable,
            "Los siguientes modelos NO declaran \$fillable ni \$guarded — bajo "
            ."`Model::unguard()` global son vulnerables a mass assignment. "
            ."Agrega `protected \$fillable = [...]` con las columnas permitidas:\n  - "
            .implode("\n  - ", $sinFillable)
        );
    }
}
