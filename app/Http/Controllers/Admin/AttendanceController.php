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
use Illuminate\Support\Facades\DB;
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
        $session->load(['group', 'teacher', 'attendances.student']);

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
     * Get attendance roster for a group on a specific date.
     */
    public function getGroupAttendances(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'group_id' => 'required|exists:groups,id',
            'date' => 'nullable|date',
        ]);

        $groupId = (int) $validated['group_id'];
        $date = ! empty($validated['date']) ? Carbon::parse($validated['date'])->toDateString() : now()->toDateString();

        $group = Group::findOrFail($groupId);

        $students = Student::where('group_id', $groupId)
            ->where('status', 'active')
            ->orderBy('full_name')
            ->select(['id', 'full_name', 'phone', 'group_id'])
            ->get();

        $session = LessonSession::where('group_id', $groupId)
            ->whereDate('started_at', $date)
            ->first();

        $attendances = collect();
        if ($session) {
            $attendances = Attendance::where('lesson_session_id', $session->id)->get()->keyBy('student_id');
        }

        $roster = $students->map(function ($student) use ($attendances) {
            $att = $attendances->get($student->id);

            return [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'phone' => $student->phone,
                'status' => $att ? $att->status : 'present',
                'is_attended' => $att ? ($att->status === 'present' || $att->status === 'late') : true,
                'is_manual' => $att ? (bool) $att->is_manual : true,
                'manual_reason' => $att ? $att->manual_reason : null,
                'already_recorded' => $att !== null,
            ];
        });

        return response()->json([
            'group' => [
                'id' => $group->id,
                'name' => $group->name,
            ],
            'date' => $date,
            'session' => $session ? [
                'id' => $session->id,
                'topic' => $session->topic,
                'status' => $session->status,
            ] : null,
            'students' => $roster,
        ]);
    }

    /**
     * Mark group attendance roster in bulk.
     */
    public function markGroup(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'group_id' => 'required|exists:groups,id',
            'date' => 'required|date',
            'topic' => 'nullable|string|max:255',
            'attendances' => 'required|array',
            'attendances.*.student_id' => 'required|exists:students,id',
            'attendances.*.status' => 'required|in:present,late,absent',
            'attendances.*.manual_reason' => 'nullable|string|max:255',
        ]);

        $group = Group::findOrFail($validated['group_id']);
        $date = Carbon::parse($validated['date'])->toDateString();

        DB::transaction(function () use ($validated, $group, $date, $request) {
            $session = LessonSession::where('group_id', $group->id)
                ->whereDate('started_at', $date)
                ->first();

            if (! $session) {
                $session = LessonSession::create([
                    'branch_id' => $group->branch_id,
                    'group_id' => $group->id,
                    'teacher_id' => $request->user()->id,
                    'topic' => ! empty($validated['topic']) ? $validated['topic'] : 'Nazariy dars (Guruh jurnali)',
                    'room_number' => $group->room ?? '101-xona',
                    'started_at' => Carbon::parse($date)->setTime(9, 0),
                    'ended_at' => Carbon::parse($date)->setTime(10, 30),
                    'status' => 'finished',
                    'qr_secret_salt' => bin2hex(random_bytes(16)),
                ]);
            } elseif (! empty($validated['topic']) && $session->topic !== $validated['topic']) {
                $session->update(['topic' => $validated['topic']]);
            }

            foreach ($validated['attendances'] as $item) {
                $status = $item['status'];
                $reason = $item['manual_reason'] ?? null;

                $existing = Attendance::where('lesson_session_id', $session->id)
                    ->where('student_id', $item['student_id'])
                    ->first();

                if ($existing) {
                    $isManual = ($existing->status !== $status) ? true : $existing->is_manual;
                    $existing->update([
                        'status' => $status,
                        'is_manual' => $isManual,
                        'manual_reason' => $reason ?? $existing->manual_reason,
                        'marked_by_user_id' => $request->user()->id,
                    ]);
                } else {
                    Attendance::create([
                        'lesson_session_id' => $session->id,
                        'student_id' => $item['student_id'],
                        'scanned_at' => Carbon::parse($date)->setTimeFrom(now()),
                        'status' => $status,
                        'is_manual' => true,
                        'manual_reason' => $reason ?? ($status === 'present' ? 'Guruh jurnali orqali' : 'Kelmagan'),
                        'marked_by_user_id' => $request->user()->id,
                    ]);
                }
            }
        });

        return redirect()->back()->with('success', 'Guruh davomati muvaffaqiyatli saqlandi.');
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

        $student = Student::findOrFail($validated['student_id']);
        $date = ! empty($validated['date']) ? Carbon::parse($validated['date'])->toDateString() : now()->toDateString();

        $sessionId = $validated['session_id'] ?? null;
        if (! $sessionId && $student->group_id) {
            $session = LessonSession::where('group_id', $student->group_id)
                ->whereDate('started_at', $date)
                ->first();

            if (! $session) {
                $session = LessonSession::create([
                    'branch_id' => $student->branch_id ?? ($student->group ? $student->group->branch_id : 1),
                    'group_id' => $student->group_id,
                    'teacher_id' => $request->user()->id,
                    'topic' => 'Nazariy dars (Qo\'lda belgilash)',
                    'started_at' => Carbon::parse($date)->setTime(9, 0),
                    'ended_at' => Carbon::parse($date)->setTime(10, 30),
                    'status' => 'finished',
                    'qr_secret_salt' => bin2hex(random_bytes(16)),
                ]);
            }
            $sessionId = $session->id;
        }

        if (! $sessionId) {
            return redirect()->back()->withErrors(['student_id' => 'Talaba biror guruhga biriktirilmagan.']);
        }

        Attendance::updateOrCreate(
            [
                'lesson_session_id' => $sessionId,
                'student_id' => $student->id,
            ],
            [
                'scanned_at' => Carbon::parse($date)->setTimeFrom(now()),
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
