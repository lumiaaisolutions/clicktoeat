<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * 2FA TOTP (Google Authenticator, 1Password, Authy...). El secreto se guarda
 * cifrado en la BD. El flujo es:
 *   1. POST /auth/2fa/setup     → genera secret, devuelve secret base32 y otpauth URL
 *   2. POST /auth/2fa/confirm   → verifica un código y marca two_factor_confirmed_at
 *   3. POST /auth/2fa/disable   → requiere password + opcionalmente otp
 *
 * El login luego pide `otp` en el payload si el user tiene 2FA confirmado.
 */
class TwoFactorController extends Controller
{
    public function setup(Request $req): JsonResponse
    {
        $user = $req->user();
        if (! $user) abort(401);

        $g2fa  = new Google2FA();
        $secret = $g2fa->generateSecretKey();

        $user->two_factor_secret = Crypt::encryptString($secret);
        $user->two_factor_confirmed_at = null;
        $user->save();

        $issuer = (string) config('app.name', 'ClickToEat');
        $otpauthUrl = $g2fa->getQRCodeUrl($issuer, $user->email, $secret);

        return response()->json([
            'secret'      => $secret,           // mostrar al usuario una sola vez
            'otpauth_url' => $otpauthUrl,       // base para QR generado en el frontend
        ]);
    }

    public function confirm(Request $req): JsonResponse
    {
        $user = $req->user();
        if (! $user) abort(401);

        Validator::make($req->all(), [
            'code' => ['required', 'string', 'size:6'],
        ])->validate();

        if (! $user->two_factor_secret) {
            return response()->json(['message' => 'Primero setup.'], 422);
        }

        $secret = Crypt::decryptString($user->two_factor_secret);
        $valid  = (new Google2FA())->verifyKey($secret, (string) $req->input('code'));
        if (! $valid) {
            return response()->json(['message' => 'Código incorrecto'], 422);
        }

        // Genera 8 recovery codes (one-time use)
        $codes = collect(range(1, 8))
            ->map(fn () => Str::upper(Str::random(5).'-'.Str::random(5)))
            ->all();

        $user->two_factor_confirmed_at = now();
        $user->two_factor_recovery_codes = Crypt::encryptString(json_encode($codes));
        $user->save();

        return response()->json([
            'enabled'        => true,
            'recovery_codes' => $codes, // mostrar UNA SOLA VEZ
        ]);
    }

    public function disable(Request $req): JsonResponse
    {
        $user = $req->user();
        if (! $user) abort(401);

        Validator::make($req->all(), [
            'password' => ['required', 'string'],
        ])->validate();

        if (! Hash::check($req->input('password'), $user->password)) {
            return response()->json(['message' => 'Contraseña incorrecta.'], 422);
        }

        $user->two_factor_secret = null;
        $user->two_factor_confirmed_at = null;
        $user->two_factor_recovery_codes = null;
        $user->save();

        return response()->json(['enabled' => false]);
    }

    public function status(Request $req): JsonResponse
    {
        $user = $req->user();
        if (! $user) abort(401);
        return response()->json([
            'enabled' => $user->hasTwoFactorEnabled(),
        ]);
    }
}
