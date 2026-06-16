<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * F92-F98 — Tablas para los nuevos módulos de super_admin:
 *  - anuncios_globales: banner en panel de todos los locales
 *  - newsletter_blasts: emails masivos a todos los owners
 *  - cupones_globales: plantillas que se replican a todos los locales
 *  - support_tickets + support_messages: cola de soporte
 *
 * F96 (audit log global) usa la tabla audit_logs existente sin scope.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('anuncios_globales', function (Blueprint $t) {
            $t->id();
            $t->string('titulo', 120);
            $t->text('body');
            $t->string('severity', 20)->default('info'); // info | warning | success | danger
            $t->boolean('active')->default(true);
            $t->boolean('show_to_super')->default(false);
            $t->timestamp('starts_at')->nullable();
            $t->timestamp('ends_at')->nullable();
            $t->timestamps();
            $t->index(['active', 'starts_at', 'ends_at']);
        });

        Schema::create('newsletter_blasts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // super que lo envió
            $t->string('asunto', 200);
            $t->text('body');
            $t->unsignedInteger('recipients_count')->default(0);
            $t->unsignedInteger('sent_count')->default(0);
            $t->unsignedInteger('failed_count')->default(0);
            $t->timestamp('started_at')->nullable();
            $t->timestamp('finished_at')->nullable();
            $t->timestamps();
        });

        Schema::create('cupones_globales', function (Blueprint $t) {
            $t->id();
            $t->string('codigo', 32);
            $t->string('descripcion', 200)->nullable();
            $t->string('tipo', 20); // 'porcentaje' | 'monto'
            $t->decimal('valor', 10, 2);
            $t->decimal('min_subtotal', 10, 2)->nullable();
            $t->unsignedInteger('max_usos_por_local')->nullable();
            $t->boolean('aplicar_nuevos')->default(true); // si futuros locales lo reciben automáticamente
            $t->date('vigente_desde')->nullable();
            $t->date('vigente_hasta')->nullable();
            $t->timestamps();
        });

        Schema::create('support_tickets', function (Blueprint $t) {
            $t->id();
            $t->foreignId('local_id')->nullable()->constrained('locales')->nullOnDelete();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('asunto', 200);
            $t->string('categoria', 40)->default('otro'); // bug | pago | feature | otro
            $t->string('prioridad', 10)->default('normal'); // baja | normal | alta
            $t->string('estado', 20)->default('abierto'); // abierto | respondido | cerrado
            $t->timestamp('cerrado_at')->nullable();
            $t->timestamps();
            $t->index(['estado', 'created_at']);
        });

        Schema::create('support_messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->text('mensaje');
            $t->boolean('from_super')->default(false);
            $t->timestamp('created_at')->useCurrent();
        });

        Schema::create('email_templates', function (Blueprint $t) {
            $t->id();
            $t->string('slug', 60)->unique(); // pedido_confirmado | trial_d3 | carrito_abandonado | resumen_semanal
            $t->string('subject', 200);
            $t->text('body_html');
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
        Schema::dropIfExists('support_messages');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('cupones_globales');
        Schema::dropIfExists('newsletter_blasts');
        Schema::dropIfExists('anuncios_globales');
    }
};
