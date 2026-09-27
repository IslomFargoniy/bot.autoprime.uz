<?php

namespace App\Http\Controllers\Api\Desktop;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Topic;
use App\Services\DesktopStudentResolver;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class DesktopAuthController extends Controller
{
    private const OTP_CACHE_PREFIX = 'desktop_otp_';

    private const OTP_TTL_SECONDS = 120;

    private const OTP_RESEND_COOLDOWN_SECONDS = 60;

    private const OTP_MAX_ATTEMPTS = 5;

    /**
     * Check current desktop app version and available updates.
     */
    public function versionCheck(): JsonResponse
    {
        $versionFilePath = public_path('downloads/desktop/version.json');

        if (File::exists($versionFilePath)) {
            $data = json_decode(File::get($versionFilePath), true);
            if (is_array($data)) {
                return response()->json([
                    'success' => true,
                    'data' => $data,
                ]);
            }
        }

        $appUrl = config('app.url');
        if (! str_starts_with($appUrl, 'https://')) {
            $appUrl = preg_replace('/^http:/i', 'https:', $appUrl);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'version' => '1.0.0',
                'build_number' => 1,
                'release_date' => date('Y-m-d'),
                'is_mandatory' => false,
                'download_url_windows' => $appUrl.'/downloads/desktop/AutoPrime-Setup-1.0.0.exe',
                'download_url_macos' => $appUrl.'/downloads/desktop/AutoPrime-Setup-1.0.0.dmg',
                'file_size_mb' => 25.0,
                'changelog_uz' => "AutoPrime LMS Desktop birinchi rasmiy relizi.\n• Telegram OTP orqali xavfsiz kirish\n• 130 ta Biletlar va Ichki Nazorat Imtihoni\n• Tezkor klaviatura boshqaruvi (F1-F4)",
                'changelog_ru' => "Первый официальный релиз AutoPrime LMS Desktop.\n• Безопасный вход через Telegram OTP\n• 130 Билетов и Внутренний Контрольный Экзамен\n• Быстрое управление с клавиатуры (F1-F4)",
            ],
        ]);
    }

    /**
     * Send 6-digit OTP to student's Telegram for Desktop Login.
     *
     * The answer is the same whether or not the phone belongs to a student, so
     * the endpoint cannot be used to discover registered numbers, and each
     * phone gets at most one code per cooldown window.
     */
    public function sendOtp(Request $request, TelegramService $telegramService): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|min:7|max:25',
        ]);

        $phone = Student::normalizePhone($request->input('phone'));
        if (! $phone) {
            return $this->otpSentResponse();
        }

        if (! Cache::add(self::OTP_CACHE_PREFIX.'cooldown_'.$phone, true, now()->addSeconds(self::OTP_RESEND_COOLDOWN_SECONDS))) {
            return response()->json([
                'success' => false,
                'message' => 'Kod yaqinda yuborilgan. Iltimos, '.self::OTP_RESEND_COOLDOWN_SECONDS.' soniyadan keyin qayta urinib ko\'ring.',
            ], 429);
        }

        $student = $this->findStudentByPhone($phone);

        if (! $student || ! $student->is_active || ! $student->telegram_id) {
            return $this->otpSentResponse();
        }

        $otp = (string) random_int(100000, 999999);
        Cache::put(self::OTP_CACHE_PREFIX.$student->id, $otp, now()->addSeconds(self::OTP_TTL_SECONDS));
        Cache::forget(self::OTP_CACHE_PREFIX.'attempts_'.$student->id);

        if (! $telegramService->sendDesktopLoginOtp($student, $otp)) {
            Cache::forget(self::OTP_CACHE_PREFIX.$student->id);

            return response()->json([
                'success' => false,
                'message' => 'Telegram botga kod yuborishda xatolik yuz berdi. Iltimos, bot faolligini tekshiring yoki qayta urinib ko\'ring.',
            ], 500);
        }

        return $this->otpSentResponse();
    }

    /**
     * Verify OTP and establish a single active Desktop session.
     *
     * A code allows only a few wrong guesses before it is discarded, so it
     * cannot be brute-forced within its lifetime.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|max:25',
            'otp' => 'required|string|min:4|max:10',
            'device_uuid' => 'required|string|max:255',
            'device_name' => 'nullable|string|max:255',
        ]);

        $phone = Student::normalizePhone($request->input('phone'));
        $student = $phone ? $this->findStudentByPhone($phone) : null;

        $otpKey = $student ? self::OTP_CACHE_PREFIX.$student->id : null;
        $cachedOtp = $otpKey ? Cache::get($otpKey) : null;

        if (! $student || ! $student->is_active || ! is_string($cachedOtp)) {
            return $this->invalidOtpResponse();
        }

        if (! hash_equals($cachedOtp, trim((string) $request->input('otp')))) {
            $attemptsKey = self::OTP_CACHE_PREFIX.'attempts_'.$student->id;
            Cache::add($attemptsKey, 0, now()->addSeconds(self::OTP_TTL_SECONDS));

            if (Cache::increment($attemptsKey) >= self::OTP_MAX_ATTEMPTS) {
                Cache::forget($otpKey);
                Cache::forget($attemptsKey);
            }

            return $this->invalidOtpResponse();
        }

        // Invalidate OTP
        Cache::forget($otpKey);
        Cache::forget(self::OTP_CACHE_PREFIX.'attempts_'.$student->id);
        // Generate Single Active Desktop Session and Secret Token
        $sessionId = (string) Str::uuid();
        $rawToken = Str::random(60);
        $tokenHash = hash('sha256', $rawToken);

        $student->update([
            'current_desktop_session_id' => $sessionId,
            'current_desktop_device_uuid' => $request->input('device_uuid'),
            'desktop_auth_token' => $tokenHash,
            'desktop_token_expires_at' => now()->addDays(30),
        ]);

        $student->loadMissing(['branch', 'group.teacher', 'activeContract.contractType']);

        return response()->json([
            'success' => true,
            'message' => 'Tizimga muvaffaqiyatli kirildi.',
            'token' => $student->id.'|'.$rawToken,
            'session_id' => $sessionId,
            'student' => [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'phone' => $student->phone,
                'photo_url' => $student->photo_url,
                'branch' => $student->branch ? ['id' => $student->branch->id, 'name' => $student->branch->name] : null,
                'group' => $student->group ? [
                    'id' => $student->group->id,
                    'name' => $student->group->name,
                    'category' => $student->group->category,
                    'start_time' => $student->group->start_time,
                    'end_time' => $student->group->end_time,
                    'room' => $student->group->room,
                    'teacher' => $student->group->teacher ? [
                        'name' => $student->group->teacher->name,
                        'phone' => $student->group->teacher->phone,
                    ] : null,
                ] : null,
            ],
        ]);
    }

    /**
     * Get complete Student LMS & ERP Portal payload for Desktop.
     */
    public function dashboard(Request $request): JsonResponse
    {
        [$student, $errType, $errMsg] = DesktopStudentResolver::resolve($request);

        if (! $student) {
            return response()->json([
                'success' => false,
                'code' => $errType,
                'message' => $errMsg,
            ], 401);
        }

        $student->loadMissing(['branch', 'group.teacher', 'activeContract.contractType']);

        $contract = $student->activeContract;
        $group = $student->group;

        $topics = [];
        if ($group && $group->course_id) {
            $topics = Topic::where('course_id', $group->course_id)
                ->where('is_active', true)
                ->with('lessonMaterials')
                ->orderBy('order_number')
                ->get();
        } elseif ($contract && $contract->has_lms) {
            $topics = Topic::where('is_active', true)
                ->with('lessonMaterials')
                ->orderBy('order_number')
                ->take(30)
                ->get();
        }

        $drivings = $student->drivings()
            ->with(['instructor:id,name,phone', 'vehicle', 'autodrome', 'review'])
            ->orderBy('start_time', 'desc')
            ->take(15)
            ->get();

        $attendances = $student->attendances()
            ->with('session')
            ->orderBy('scanned_at', 'desc')
            ->take(20)
            ->get();

        return response()->json([
            'success' => true,
            'student' => [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'phone' => $student->phone,
                'photo_url' => $student->photo_url,
                'branch' => $student->branch ? ['id' => $student->branch->id, 'name' => $student->branch->name] : null,
            ],
            'contract' => $contract,
            'group' => $group ? [
                'id' => $group->id,
                'name' => $group->name,
                'category' => $group->category,
                'days_of_week' => $group->days_of_week,
                'start_time' => $group->start_time,
                'end_time' => $group->end_time,
                'room' => $group->room,
                'teacher' => $group->teacher ? [
                    'id' => $group->teacher->id,
                    'name' => $group->teacher->name,
                    'phone' => $group->teacher->phone,
                ] : null,
            ] : null,
            'topics' => $topics,
            'drivings' => $drivings,
            'attendances' => $attendances,
        ]);
    }

    /**
     * Find a student by a normalized phone, also matching numbers stored
     * before phone normalization was introduced.
     */
    private function findStudentByPhone(string $normalizedPhone): ?Student
    {
        $digits = ltrim($normalizedPhone, '+');
        $candidates = [$normalizedPhone, $digits];
        if (str_starts_with($digits, '998')) {
            $candidates[] = substr($digits, 3);
        }

        return Student::whereIn('phone', $candidates)->first();
    }

    private function otpSentResponse(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Agar raqam ro\'yxatdan o\'tgan va Telegram botimizga ulangan bo\'lsa, 6 xonali tasdiqlash kodi Telegram botingizga yuborildi. Kod kelmasa, @LmsAutoprimeBot boti orqali /start bosing va telefon raqamingizni tasdiqlang.',
            'expires_in_seconds' => self::OTP_TTL_SECONDS,
        ]);
    }

    private function invalidOtpResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Tasdiqlash kodi noto\'g\'ri yoki muddati o\'tgan. Iltimos, qayta kod so\'rang.',
        ], 422);
    }
}
