<?php

namespace App\Services;

use App\Models\Student;
use Illuminate\Http\Request;

class DesktopStudentResolver
{
    /**
     * Resolve and authenticate the student making the desktop request.
     * Returns array [ ?Student $student, ?string $errorType, ?string $errorMessage ]
     *
     * @return array{0: ?Student, 1: ?string, 2: ?string}
     */
    public static function resolve(Request $request): array
    {
        $authHeader = $request->header('Authorization');
        if (! $authHeader || ! str_starts_with($authHeader, 'Bearer ')) {
            return [null, 'UNAUTHORIZED', 'Avtorizatsiya tokeni topilmadi.'];
        }

        $bearerToken = trim(substr($authHeader, 7));
        if (! str_contains($bearerToken, '|')) {
            return [null, 'INVALID_TOKEN', 'Token formati noto\'g\'ri.'];
        }

        [$studentId, $rawSecret] = explode('|', $bearerToken, 2);

        $student = Student::find((int) $studentId);
        if (! $student) {
            return [null, 'NOT_FOUND', 'O\'quvchi hisobi topilmadi.'];
        }

        if (! $student->is_active) {
            return [null, 'INACTIVE', 'O\'quvchi hisobi faol emas.'];
        }

        if (! $student->desktop_auth_token || ! $student->desktop_token_expires_at || $student->desktop_token_expires_at->isPast()) {
            return [null, 'EXPIRED_TOKEN', 'Kirish sessiyasi muddati tugagan. Iltimos, qayta kiring.'];
        }

        $sessionHeader = $request->header('X-Desktop-Session-Id');
        if ($sessionHeader && $student->current_desktop_session_id !== $sessionHeader) {
            return [
                null,
                'SESSION_SUPERSEDED',
                'Hisobingizga boshqa kompyuterdan kirilgani sababli ushbu desktop sessiyasi to\'xtatildi.',
            ];
        }

        if ($student->desktop_auth_token !== hash('sha256', $rawSecret)) {
            return [
                null,
                'SESSION_SUPERSEDED',
                'Hisobingizga boshqa kompyuterdan kirilgani sababli ushbu desktop sessiyasi to\'xtatildi.',
            ];
        }

        return [$student, null, null];
    }
}
