<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Student;
use App\Models\Topic;
use App\Services\BranchSessionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = Attendance::with(['student.group', 'session.teacher', 'markedBy'])
            ->orderBy('scanned_at', 'desc')
            ->orderBy('created_at', 'desc');

        if ($request->filled('group_id')) {
            $query->whereHas('student', function ($q) use ($request) {
                $q->where('group_id', $request->group_id);
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('scanned_at', $request->date);
        }

        if ($targetBranchId) {
            $query->whereHas('student', function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            });
        }

        $attendances = $query->paginate(30)->withQueryString();

        $activeSessions = LessonSession::with(['group', 'teacher'])
            ->where('status', 'active')
            ->orderBy('started_at', 'desc')
            ->get();

        $groups = Group::where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->get();

        $students = Student::where('status', 'active')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->select(['id', 'full_name', 'phone', 'group_id'])
            ->get();

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Attendance/Index', [
            'attendances' => $attendances,
            'activeSessions' => $activeSessions,
            'groups' => $groups,
            'students' => $students,
            'branches' => $branches,
            'filters' => [
                'group_id' => $request->group_id,
                'date' => $request->date,
                'branch_id' => $targetBranchId,
            ],
        ]);
    }

    /**
     * Start a new LessonSession for a group.
     */
    public function startSession(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'group_id' => 'required|exists:groups,id',
            'topic_id' => 'nullable|exists:topics,id',
        ]);

        $group = Group::findOrFail($validated['group_id']);

        $topicTitle = 'Nazariy dars';
        if (! empty($validated['topic_id'])) {
            $topic = Topic::find($validated['topic_id']);
            if ($topic) {
                $topicTitle = $topic->title_uz ?? $topic->title ?? $topicTitle;
            }
        }

        $session = LessonSession::create([
            'branch_id' => $group->branch_id,
            'group_id' => $group->id,
            'teacher_id' => $request->user()->id,
            'topic' => $topicTitle,
            'qr_secret_salt' => bin2hex(random_bytes(16)),
            'started_at' => now(),
            'status' => 'active',
        ]);

        return redirect()->route('admin.attendance.screen', $session->id);
    }

    /**
     * Large TV / Projector presentation screen displaying dynamic HMAC QR code.
     */
    public function sessionScreen(LessonSession $session): Response
    {
        $session->load(['group', 'teacher', 'topic', 'attendances.student']);

        $qrToken = $session->generateQrToken();

        return Inertia::render('Admin/Attendance/Screen', [
            'session' => $session,
            'qrToken' => $qrToken,
            'studentsCount' => $session->group ? $session->group->students()->count() : 0,
            'attendances' => $session->attendances,
        ]);
    }

    /**
     * JSON polling endpoint for rotating QR token every 15-20 seconds.
     */
    public function getRotatingQr(LessonSession $session): JsonResponse
    {
        if ($session->status !== 'active') {
            return response()->json(['error' => 'Session not active'], 400);
        }

        $session->load('attendances.student');

        return response()->json([
            'qrToken' => $session->generateQrToken(),
            'attendances' => $session->attendances,
            'presentCount' => $session->attendances()->count(),
        ]);
    }

    /**
     * Mark attendance manually for a student without smartphone.
     */
    public function markManual(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'session_id' => 'nullable|exists:lesson_sessions,id',
            'student_id' => 'required|exists:students,id',
            'date' => 'nullable|date',
            'status' => 'required|in:present,late,absent',
            'manual_reason' => 'required|string|max:255',
        ]);

        Attendance::updateOrCreate(
            [
                'lesson_session_id' => $validated['session_id'] ?? null,
                'student_id' => $validated['student_id'],
            ],
            [
                'scanned_at' => ! empty($validated['date']) ? Carbon::parse($validated['date']) : now(),
                'status' => $validated['status'],
                'is_manual' => true,
                'manual_reason' => $validated['manual_reason'],
                'marked_by_user_id' => $request->user()->id,
            ]
        );

        return redirect()->back()->with('success', 'Davomat qo\'lda belgilandi.');
    }

    /**
     * Finish a LessonSession.
     */
    public function finishSession(LessonSession $session): RedirectResponse
    {
        $session->update([
            'status' => 'finished',
            'ended_at' => now(),
        ]);

        return redirect()->route('admin.attendance.index')->with('success', 'Dars sessiyasi yakunlandi.');
    }
}
