<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\LessonSession;
use App\Models\Student;
use App\Models\Topic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MiniAppController extends Controller
{
    /**
     * Resolve student from Telegram initData, session, or request param.
     */
    protected function resolveStudent(Request $request): ?Student
    {
        $telegramId = null;

        // 1. Check initData header, query or post body
        $initData = $request->header('X-Telegram-Init-Data')
            ?? $request->input('initData')
            ?? $request->query('_auth')
            ?? $request->session()->get('tg_init_data');

        if ($initData) {
            parse_str($initData, $parsedData);
            if (isset($parsedData['user'])) {
                $tgUser = json_decode($parsedData['user'], true);
                $telegramId = $tgUser['id'] ?? null;
            }
        }

        // 2. Check query param for local dev
        if (! $telegramId && (app()->environment('local') || config('app.debug'))) {
            $telegramId = $request->query('test_telegram_id');
        }

        // 3. Fallback to auth user if linked
        if (! $telegramId && $request->user()) {
            $telegramId = $request->user()->telegram_id;
        }

        if (! $telegramId) {
            return null;
        }

        return Student::where('telegram_id', (string) $telegramId)
            ->with(['branch', 'group.teacher', 'activeContract.contractType'])
            ->first();
    }

    /**
     * Display the Student Mini App portal.
     */
    public function index(Request $request): Response
    {
        $student = $this->resolveStudent($request);

        $contract = $student?->activeContract;
        $group = $student?->group;

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
                ->take(15)
                ->get();
        }

        $drivings = [];
        if ($student) {
            $drivings = $student->drivings()
                ->with(['instructor', 'vehicle', 'autodrome', 'review'])
                ->orderBy('start_time', 'desc')
                ->take(10)
                ->get();
        }

        $recentAttendances = [];
        if ($student) {
            $recentAttendances = $student->attendances()
                ->with('session')
                ->orderBy('scanned_at', 'desc')
                ->take(10)
                ->get();
        }

        return Inertia::render('Student/MiniApp', [
            'student' => $student,
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
            'attendances' => $recentAttendances,
        ]);
    }

    /**
     * Process dynamic QR scan for attendance.
     */
    public function scanQr(Request $request): JsonResponse
    {
        $request->validate([
            'qr_token' => 'required|string',
            'initData' => 'nullable|string',
        ]);

        $qrToken = $request->input('qr_token');
        $session = LessonSession::validateQrToken($qrToken);

        if (! $session) {
            return response()->json([
                'success' => false,
                'message' => 'Yaroqsiz yoki muddati o\'tgan QR kod. Iltimos, doskadagi yangi kodni qayta skanerlang.',
            ], 422);
        }

        if ($session->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Ushbu dars sessiyasi faol emas yoki yakunlangan.',
            ], 422);
        }

        $student = $this->resolveStudent($request);

        // Fallback for direct student_id if authorized in test or web
        if (! $student && $request->filled('student_id')) {
            $student = Student::find($request->input('student_id'));
        }

        if (! $student) {
            return response()->json([
                'success' => false,
                'message' => 'O\'quvchi profili topilmadi. Iltimos, Telegram bot orqali kiring.',
            ], 403);
        }

        // Verify group membership
        if ($session->group_id && $student->group_id !== $session->group_id) {
            return response()->json([
                'success' => false,
                'message' => 'Siz ushbu guruhga biriktirilmagansiz.',
            ], 403);
        }

        // Verify 30% theory payment rule
        $contract = $student->activeContract;
        if ($contract) {
            if (! $contract->has_theory) {
                return response()->json([
                    'success' => false,
                    'message' => 'Shartnomangizda nazariy ta\'lim moduli mavjud emas.',
                ], 403);
            }

            if (! $contract->canAccessTheory()) {
                $minPercent = (float) ($contract->contractType ? $contract->contractType->min_theory_payment_percent : 30.0);

                return response()->json([
                    'success' => false,
                    'message' => "Darsga kirish uchun to'lov foizi kamida {$minPercent}% bo'lishi shart. Sizning hozirgi to'lovingiz: {$contract->payment_percentage}%.",
                ], 403);
            }
        }

        // Check if attendance already recorded today for this session
        $existing = Attendance::where('lesson_session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Sizning davomatingiz allaqachon belgilangan.',
                'already_recorded' => true,
                'attendance' => $existing,
            ]);
        }

        $attendance = Attendance::create([
            'lesson_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'present',
            'is_manual' => false,
            'scanned_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Davomat muvaffaqiyatli belgilandi! Darsga xush kelibsiz.',
            'attendance' => $attendance,
            'student_name' => $student->full_name,
        ]);
    }
}
