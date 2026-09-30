<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->cookie('locale')
            ?? $request->cookie('i18next')
            ?? $request->cookie('i18nextLng')
            ?? ($request->hasSession() ? $request->session()->get('locale') : null)
            ?? $request->header('X-Locale')
            ?? config('app.locale', 'uz');

        if (is_string($locale)) {
            $short = strtolower(explode('-', $locale)[0]);
            if (in_array($short, ['uz', 'ru', 'en', 'krill'], true)) {
                App::setLocale($short);
            }
        }

        return $next($request);
    }
}
