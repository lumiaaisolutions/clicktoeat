<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UploadImageTest extends TestCase
{
    use RefreshDatabase;

    private Local $local;
    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->local = Local::factory()->create();
        $this->owner = User::factory()->owner($this->local)->create();
    }

    /** @test */
    public function owner_sube_imagen_png_y_obtiene_url_y_public_id(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->postJson('/api/v1/uploads/image', [
            'image'  => UploadedFile::fake()->image('producto.png', 800, 600),
            'folder' => 'productos',
        ])->assertCreated();

        $resp->assertJsonStructure(['data' => ['url', 'public_id', 'width', 'height', 'bytes']]);
        $this->assertStringContainsString('uploads/productos/', $resp->json('data.public_id'));
        $this->assertStringContainsString('producto-', $resp->json('data.public_id'));
        $this->assertStringEndsWith('.png', $resp->json('data.public_id'));

        Storage::disk('public')->assertExists($resp->json('data.public_id'));
    }

    /** @test */
    public function default_folder_es_productos(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->postJson('/api/v1/uploads/image', [
            'image' => UploadedFile::fake()->image('x.png'),
        ])->assertCreated();

        $this->assertStringStartsWith('uploads/productos/', $resp->json('data.public_id'));
    }

    /** @test */
    public function rechaza_folder_no_permitido(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/uploads/image', [
            'image'  => UploadedFile::fake()->image('x.png'),
            'folder' => 'malicious-path',
        ])->assertStatus(422)->assertJsonValidationErrors('folder');
    }

    /** @test */
    public function rechaza_archivo_no_imagen(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/uploads/image', [
            'image' => UploadedFile::fake()->create('malo.txt', 100, 'text/plain'),
        ])->assertStatus(422)->assertJsonValidationErrors('image');
    }

    /** @test */
    public function rechaza_mimetype_no_permitido(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        // gif no está en la allowlist (jpeg|png|webp|avif)
        $this->postJson('/api/v1/uploads/image', [
            'image' => UploadedFile::fake()->image('x.gif'),
        ])->assertStatus(422)->assertJsonValidationErrors('image');
    }

    /** @test */
    public function rechaza_imagen_que_excede_5_MB(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        // 6 MB en KB
        $big = UploadedFile::fake()->create('big.png', 6 * 1024, 'image/png');

        $this->postJson('/api/v1/uploads/image', [
            'image' => $big,
        ])->assertStatus(422)->assertJsonValidationErrors('image');
    }

    /** @test */
    public function staff_no_puede_subir_imagen(): void
    {
        $staff = User::factory()->staff($this->local)->create();
        Sanctum::actingAs($staff, ['*']);

        $this->postJson('/api/v1/uploads/image', [
            'image' => UploadedFile::fake()->image('x.png'),
        ])->assertStatus(403);
    }

    /** @test */
    public function user_sin_token_es_rechazado(): void
    {
        $this->postJson('/api/v1/uploads/image', [
            'image' => UploadedFile::fake()->image('x.png'),
        ])->assertStatus(401);
    }

    /** @test */
    public function el_nombre_random_evita_colisiones(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $r1 = $this->postJson('/api/v1/uploads/image', [
            'image' => UploadedFile::fake()->image('mismo.png'),
        ])->assertCreated();

        $r2 = $this->postJson('/api/v1/uploads/image', [
            'image' => UploadedFile::fake()->image('mismo.png'),
        ])->assertCreated();

        $this->assertNotEquals($r1->json('data.public_id'), $r2->json('data.public_id'));
    }
}
