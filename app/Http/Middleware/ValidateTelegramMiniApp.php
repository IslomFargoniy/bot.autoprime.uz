<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ValidateTelegramMiniApp
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // If already authenticated via session, allow the request to proceed.
        // This is necessary for Inertia AJAX requests to work without sending the token every time.
        if (Auth::check()) {
            return $next($request);
        }

        // Allow passing initData via header or query parameter for flexibility
        $initData = $request->header('X-Telegram-Init-Data') ?? $request->query('_auth');

        if (! $initData) {
            // For local development without Telegram, we might want to bypass or mock,
            // but for now, we enforce it if the middleware is applied.
            if (app()->environment('local') && $request->has('test_telegram_id')) {
                $user = User::where('telegram_id', $request->query('test_telegram_id'))->first();
                if ($user) {
                    Auth::login($user);

                    return $next($request);
                }
            }

            if ($request->wantsJson()) {
                return response()->json(['error' => 'Unauthorized. Missing Init Data.'], 401);
            }

            return redirect()->route('login');
        }

        $botToken = (string) (config('services.telegram.bot_token') ?? config('nutgram.token', ''));

        if (! $this->validateInitData($initData, $botToken)) {
            return response()->json(['error' => 'Unauthorized. Invalid Signature.'], 401);
        }

        // Parse user data from initData
        parse_str($initData, $parsedData);
        if (! isset($parsedData['user'])) {
            return response()->json(['error' => 'Unauthorized. No user data.'], 401);
        }

        $tgUser = json_decode($parsedData['user'], true);
        $telegramId = $tgUser['id'] ?? null;

        if (! $telegramId) {
            return response()->json(['error' => 'Unauthorized. Invalid user data.'], 401);
        }

        $user = User::where('telegram_id', $telegramId)->first();

        if (! $user) {
            return response()->json(['error' => 'Unauthorized. User not found.'], 401);
        }

        Auth::login($user);

        return $next($request);
    }

    private function validateInitData(string $initData, string $botToken): bool
    {
        if (empty($botToken)) {
            return false;
        }

        // Parse the query string into an array
        parse_str($initData, $parsedData);

        if (! isset($parsedData['hash'])) {
            return false;
        }

        $hash = $parsedData['hash'];
        unset($parsedData['hash']);

        // Sort keys alphabetically
        ksort($parsedData);

        // Build data-check-string
        $dataCheckArr = [];
        foreach ($parsedData as $key => $value) {
            $dataCheckArr[] = $key.'='.$value;
        }
        $dataCheckString = implode("\n", $dataCheckArr);

        // Calculate HMAC-SHA256 signature
        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $calculatedHash = bin2hex(hash_hmac('sha256', $dataCheckString, $secretKey, true));

        return hash_equals($hash, $calculatedHash);
    }
}
