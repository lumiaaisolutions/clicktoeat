<?php

namespace Tests\Feature\Clicky;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClickyGatingTest extends TestCase
{
    use RefreshDatabase;

    public function test_essential_no_accede_a_clicky(): void
    {
        $local = Local::factory()->withPlan('essential')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/clicky/ask', ['message' => '¿Cómo agrego un producto?'])
            ->assertStatus(402)
            ->assertJsonPath('code', 'FEATURE_LOCKED')
            ->assertJsonPath('required_feature', 'clicky_assistant');
    }

    public function test_professional_accede_a_clicky(): void
    {
        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/clicky/ask', ['message' => '¿Cómo agrego un producto?'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['reply']]);
    }

    public function test_premium_accede_a_clicky(): void
    {
        $local = Local::factory()->withPlan('premium')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/clicky/ask', ['message' => '¿Cómo agrego un producto?'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['reply']]);
    }

    public function test_mensaje_vacio_es_rechazado(): void
    {
        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/clicky/ask', ['message' => ''])
            ->assertStatus(422);
    }

    public function test_sin_api_key_responde_fallback_sin_romper(): void
    {
        // Sin GEMINI_API_KEY, debe caer al fallback propio de Clicky en
        // vez de fallar o de devolver el mock genérico de LLMClient.
        config(['services.ai.gemini_api_key' => null]);

        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/clicky/ask', ['message' => 'hola'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['reply']])
            ->assertJsonPath('data.reply', 'No puedo ayudarte con eso justo ahora 🙈 Prueba con una de las dudas rápidas de arriba, o si sigue sin funcionar escríbenos a soporte.');
    }

    public function test_provider_ollama_responde_sin_api_key(): void
    {
        // Ollama es self-hosted: debe funcionar aunque no haya ninguna
        // API key configurada (a diferencia de gemini).
        config([
            'services.ai.clicky_provider' => 'ollama',
            'services.ai.gemini_api_key' => null,
            'services.ai.ollama_url' => 'http://localhost:11434',
            'services.ai.ollama_model' => 'llama3.1',
        ]);

        Http::fake([
            'localhost:11434/*' => Http::response([
                'message' => ['content' => 'Ve a Productos y pulsa "Nuevo producto".'],
            ]),
        ]);

        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/clicky/ask', ['message' => '¿Cómo agrego un producto?'])
            ->assertOk()
            ->assertJsonPath('data.reply', 'Ve a Productos y pulsa "Nuevo producto".');

        Http::assertSent(function ($req) {
            return str_contains($req->url(), '/api/chat')
                && $req['model'] === 'llama3.1'
                && $req['messages'][0]['role'] === 'system'
                && $req['messages'][1]['role'] === 'user';
        });
    }

    public function test_provider_ollama_caido_cae_al_fallback(): void
    {
        config([
            'services.ai.clicky_provider' => 'ollama',
            'services.ai.gemini_api_key' => null,
        ]);

        Http::fake(['*' => Http::response('unavailable', 503)]);

        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/clicky/ask', ['message' => 'hola'])
            ->assertOk()
            ->assertJsonPath('data.reply', 'No puedo ayudarte con eso justo ahora 🙈 Prueba con una de las dudas rápidas de arriba, o si sigue sin funcionar escríbenos a soporte.');
    }

    public function test_fallback_nunca_filtra_detalles_de_configuracion(): void
    {
        config(['services.ai.gemini_api_key' => null]);

        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $reply = $this->postJson('/api/v1/clicky/ask', ['message' => 'hola'])
            ->assertOk()
            ->json('data.reply');

        $this->assertStringNotContainsStringIgnoringCase('API_KEY', $reply);
        $this->assertStringNotContainsStringIgnoringCase('provider', $reply);
        $this->assertStringNotContainsStringIgnoringCase('mock', $reply);
    }
}
