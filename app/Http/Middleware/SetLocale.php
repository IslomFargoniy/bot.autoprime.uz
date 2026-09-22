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
        $locale = $request->cookie('locale') ?? $request->header('X-Locale') ?? config('app.locale', 'uz');

        if (in_array($locale, ['uz', 'ru', 'en', 'krill'], true)) {
            App::setLocale($locale);
        }

        return $next($request);
    }
}
