<?php

namespace App\Http\Controllers;

use App\Models\Student;
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

    /**
     * Instructors and teachers only work with their own students, even when
     * granted extra permissions (contracts, payments, certificates...).
     */
    protected function ensureCanSeeStudent(Request $request, ?Student $student): void
    {
        $user = $request->user();

        if ($user->worksOnOwnRecordsOnly() && ($student === null || ! $user->canSeeStudent($student))) {
            abort(403, 'Siz faqat o\'z o\'quvchilaringiz bilan ishlay olasiz.');
        }
    }
}
