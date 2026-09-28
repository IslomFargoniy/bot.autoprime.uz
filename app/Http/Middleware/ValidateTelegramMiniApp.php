<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\TelegramInitDataValidator;
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
            if (! $request->user()->canSignIn()) {
                return $this->rejectInactiveUser($request);
            }

            return $next($request);
        }

        // Allow passing initData via header or query parameter for flexibility
        $initData = $request->header('X-Telegram-Init-Data') ?? $request->query('_auth');

        if (! $initData) {
            if (app()->environment('local') && $request->has('test_telegram_id')) {
                $user = User::where('telegram_id', $request->query('test_telegram_id'))->first();
                if ($user && $user->canSignIn()) {
                    Auth::login($user);

                    return $next($request);
                }
            }

            if ($request->wantsJson()) {
                return response()->json(['error' => 'Unauthorized. Missing Init Data.'], 401);
            }

            return redirect()->route('login');
        }

        $telegramId = TelegramInitDataValidator::telegramUserId($initData);

        if (! $telegramId) {
            return response()->json(['error' => 'Unauthorized. Invalid or expired signature.'], 401);
        }

        $user = User::where('telegram_id', $telegramId)->first();

        if (! $user) {
            return response()->json(['error' => 'Unauthorized. User not found.'], 401);
        }

        if (! $user->canSignIn()) {
            return response()->json(['error' => 'Account is deactivated or not assigned to a branch.'], 403);
        }

        Auth::login($user);

        return $next($request);
    }

    private function rejectInactiveUser(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->wantsJson()) {
            return response()->json(['error' => 'Account is deactivated or not assigned to a branch.'], 403);
        }

        return redirect()->route('login')->withErrors(['phone' => 'Hisobingiz faolsizlantirilgan yoki filialga biriktirilmagan.']);
    }
}
