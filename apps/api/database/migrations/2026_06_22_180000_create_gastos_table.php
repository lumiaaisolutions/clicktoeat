<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('gastos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->constrained('locales')->cascadeOnDelete();

            // Categoría limitada — slugs estables que el frontend traduce a labels.
            // Decidido sobre enum para no necesitar migración en cada agregado nuevo;
            // validación happens en el FormRequest.
            $t->string('categoria', 32);
            $t->string('concepto', 200);

            // Siempre en centavos — evita floats. Compatible con resto del sistema
            // (Plan::precio_mxn_centavos, Pedido::total_centavos, etc.)
            $t->unsignedInteger('monto_centavos');

            $t->date('fecha');

            // Para gastos recurrentes (renta, servicios) — el cliente puede
            // duplicar el próximo mes con un click. Hoy solo es flag descriptivo;
            // si más adelante se quiere auto-replicar, hay base.
            $t->boolean('recurrente')->default(false);

            $t->text('notas')->nullable();

            // Url de comprobante/factura subido — opcional. Por ahora solo string;
            // a futuro storage/app/public/gastos/<uuid>.jpg vía Storage::disk('public').
            $t->string('comprobante_url', 500)->nullable();

            $t->foreignId('created_by_user_id')->nullable()
              ->constrained('users')->nullOnDelete();

            $t->timestamps();
            $t->softDeletes();

            // Índices para queries comunes (resumen mensual por categoría)
            $t->index(['local_id', 'fecha']);
            $t->index(['local_id', 'categoria', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gastos');
    }
};
