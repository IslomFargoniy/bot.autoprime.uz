<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\LessonSession;
use App\Models\Student;
use App\Models\Topic;
use App\Services\MiniAppStudentResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MiniAppController extends Controller
{
    protected function resolveStudent(Request $request): ?Student
    {
        $student = MiniAppStudentResolver::resolve($request);

        return $student?->load(['branch', 'group.teacher', 'activeContract.contractType']);
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
            'student' => $student ? [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'phone' => $student->phone,
                'photo_url' => $student->photo_url,
                'branch' => $student->branch ? ['name' => $student->branch->name] : null,
            ] : null,
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
        if (! $contract) {
            return response()->json([
                'success' => false,
                'message' => 'Faol shartnomangiz topilmadi. Iltimos, administratorga murojaat qiling.',
            ], 403);
        }

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
