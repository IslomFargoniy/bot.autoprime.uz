<?php

namespace App\Services;

use App\Models\Student;
use Illuminate\Http\Request;

class MiniAppStudentResolver
{
    /**
     * Session key holding the id of the student verified through signed initData.
     */
    public const SESSION_KEY = 'mini_app_student_id';

    /**
     * Resolve the student using the Mini App.
     *
     * Identity is only trusted when it comes from Telegram-signed initData
     * (header, body or `_auth` query). Once verified, the student id is kept in
     * the session so follow-up requests from the same webview need no initData.
     * Request-supplied ids such as `student_id` are never trusted.
     */
    public static function resolve(Request $request): ?Student
    {
        $initData = $request->header('X-Telegram-Init-Data')
            ?: $request->input('initData')
            ?: $request->query('_auth');

        if ($initData) {
            $telegramId = TelegramInitDataValidator::telegramUserId((string) $initData);
            $student = $telegramId ? Student::where('telegram_id', $telegramId)->first() : null;

            if ($student) {
                $request->session()->put(self::SESSION_KEY, $student->id);

                return $student;
            }
        }

        $sessionStudentId = $request->session()->get(self::SESSION_KEY);
        if ($sessionStudentId) {
            return Student::find($sessionStudentId);
        }

        if (app()->environment('local') && $request->query('test_telegram_id')) {
            return Student::where('telegram_id', (string) $request->query('test_telegram_id'))->first();
        }

        return null;
    }
}
