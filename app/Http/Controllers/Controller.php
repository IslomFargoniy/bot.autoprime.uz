<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    public const DEFAULT_PER_PAGE = 15;

    public const MAX_PER_PAGE = 100;

    /**
     * Page size from the `per_page` query value: "all" returns every row, a
     * number is clamped to 1..MAX_PER_PAGE, anything else falls back to the default.
     *
     * @param  callable(): int  $countAll  total row count, only called for "all"
     */
    protected function perPage(Request $request, callable $countAll): int
    {
        $perPage = $request->query('per_page');

        if ($perPage === 'all') {
            return max((int) $countAll(), 1);
        }

        if (! is_numeric($perPage) || (int) $perPage < 1) {
            return self::DEFAULT_PER_PAGE;
        }

        return min((int) $perPage, self::MAX_PER_PAGE);
    }
}
