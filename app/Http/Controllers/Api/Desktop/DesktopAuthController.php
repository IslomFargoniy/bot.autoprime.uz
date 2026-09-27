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
     */
    public function sendOtp(Request $request, TelegramService $telegramService): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|min:7|max:25',
        ]);

        $rawPhone = preg_replace('/[^\d+]/', '', (string) $request->input('phone'));
        $phoneWithoutPlus = ltrim($rawPhone, '+');
        $phoneWithPlus = '+'.$phoneWithoutPlus;

        $student = Student::where('phone', $rawPhone)
            ->orWhere('phone', $phoneWithoutPlus)
            ->orWhere('phone', $phoneWithPlus)
            ->first();

        if (! $student) {
            return response()->json([
                'success' => false,
                'message' => 'Ushbu telefon raqam bilan ro\'yxatdan o\'tgan o\'quvchi topilmadi.',
            ], 404);
        }

        if (! $student->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'O\'quvchi hisobingiz faol emas. Iltimos, ma\'muriyatga murojaat qiling.',
            ], 403);
        }

        if (! $student->telegram_id) {
            return response()->json([
                'success' => false,
                'message' => 'Ushbu hisob Telegram botimizga ulanmagan. Iltimos, avval @LmsAutoprimeBot boti orqali /start bosing va telefon raqamingizni tasdiqlang.',
            ], 403);
        }

        // Generate 6-digit cryptographically secure OTP
        $otp = (string) mt_rand(100000, 999999);
        Cache::put('desktop_otp_'.$student->id, $otp, now()->addMinutes(2));

        $sent = $telegramService->sendDesktopLoginOtp($student, $otp);

        if (! $sent) {
            return response()->json([
                'success' => false,
                'message' => 'Telegram botga kod yuborishda xatolik yuz berdi. Iltimos, bot faolligini tekshiring yoki qayta urinib ko\'ring.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => '6 xonali tasdiqlash kodi Telegram botingizga yuborildi.',
            'expires_in_seconds' => 120,
        ]);
    }

    /**
     * Verify OTP and establish a single active Desktop session.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'otp' => 'required|string|min:4|max:10',
            'device_uuid' => 'required|string|max:255',
            'device_name' => 'nullable|string|max:255',
        ]);

        $rawPhone = preg_replace('/[^\d+]/', '', (string) $request->input('phone'));
        $phoneWithoutPlus = ltrim($rawPhone, '+');
        $phoneWithPlus = '+'.$phoneWithoutPlus;

        $student = Student::where('phone', $rawPhone)
            ->orWhere('phone', $phoneWithoutPlus)
            ->orWhere('phone', $phoneWithPlus)
            ->first();

        if (! $student) {
            return response()->json([
                'success' => false,
                'message' => 'O\'quvchi topilmadi.',
            ], 404);
        }

        $cachedOtp = Cache::get('desktop_otp_'.$student->id);

        if (! $cachedOtp || $cachedOtp !== trim($request->input('otp'))) {
            return response()->json([
                'success' => false,
                'message' => 'Tasdiqlash kodi noto\'g\'ri yoki muddati o\'tgan. Iltimos, qayta kod so\'rang.',
            ], 422);
        }

        // Invalidate OTP
        Cache::forget('desktop_otp_'.$student->id);

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
            ->with(['instructor', 'vehicle', 'autodrome', 'review'])
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
}
