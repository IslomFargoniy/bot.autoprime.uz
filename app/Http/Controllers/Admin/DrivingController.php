<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\BranchScopedValidationRules;
use App\Exports\DrivingsExport;
use App\Http\Controllers\Controller;
use App\Jobs\SendDrivingCreatedNotificationJob;
use App\Models\Autodrome;
use App\Models\Branch;
use App\Models\Driving;
use App\Models\Group;
use App\Models\Student;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\BranchSessionService;
use App\Services\DrivingScheduler;
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class DrivingController extends Controller
{
    use BranchScopedValidationRules;

    public function export(Request $request)
    {
        $filters = $request->all();
        $user = $request->user();
        if ($user->isInstructor()) {
            $filters['instructor_id'] = $user->id;
        } else {
            $targetBranchId = BranchSessionService::getActiveBranchId($request);
            if ($targetBranchId) {
                $filters['branch_id'] = $targetBranchId;
            }
        }

        return Excel::download(new DrivingsExport($filters), 'mashgulotlar.xlsx');
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $isInstructor = $user->isInstructor();

        $query = Driving::with(['instructor', 'student', 'group', 'review', 'autodrome', 'branch'])
            ->orderBy('start_time', 'desc');

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->where('branch_id', $targetBranchId);
        }

        if ($isInstructor) {
            $query->where('instructor_id', $user->id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $from = $request->input('from', Carbon::now()->startOfMonth()->format('d-m-Y'));
        $to = $request->input('to', Carbon::now()->format('d-m-Y'));

        if ($request->filled('instructor_id') && ! $isInstructor) {
            $query->where('instructor_id', $request->instructor_id);
        }

        if ($from) {
            try {
                $fromDate = preg_match('/^\d{2}-\d{2}-\d{4}$/', $from)
                    ? Carbon::createFromFormat('d-m-Y', $from)->startOfDay()
                    : Carbon::parse($from)->startOfDay();
                $query->where('start_time', '>=', $fromDate);
            } catch (\Exception $e) {
            }
        }

        if ($to) {
            try {
                $toDate = preg_match('/^\d{2}-\d{2}-\d{4}$/', $to)
                    ? Carbon::createFromFormat('d-m-Y', $to)->endOfDay()
                    : Carbon::parse($to)->endOfDay();
                $query->where('start_time', '<=', $toDate);
            } catch (\Exception $e) {
            }
        }

        $perPage = $this->perPage($request, fn () => $query->count());

        $drivings = $query->paginate($perPage)->withQueryString();

        $instructors = User::where('role', 'instructor')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->when($isInstructor, function ($q) use ($user) {
                $q->where('id', $user->id);
            })
            ->get();

        $studentsQuery = Student::with('group')->orderBy('full_name');
        $groupsQuery = Group::orderBy('name');
        $autodromesQuery = Autodrome::orderBy('name');

        if ($targetBranchId) {
            $studentsQuery->where('branch_id', $targetBranchId);
            $groupsQuery->where('branch_id', $targetBranchId);
            $autodromesQuery->where(function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
            });
        }

        if ($isInstructor) {
            $groupsQuery->where('instructor_id', $user->id);
            $studentsQuery->whereHas('group', function ($q) use ($user) {
                $q->where('instructor_id', $user->id);
            });
        }

        $students = $studentsQuery->get();
        $groups = $groupsQuery->get();
        $autodromes = $autodromesQuery->get();
        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Drivings/Index', [
            'drivings' => $drivings,
            'instructors' => $instructors,
            'students' => $students,
            'groups' => $groups,
            'autodromes' => $autodromes,
            'branches' => $branches,
            'filters' => [
                'search' => $request->search,
                'status' => $request->status,
                'instructor_id' => $request->instructor_id,
                'branch_id' => $targetBranchId,
                'from' => $from,
                'to' => $to,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'instructor_id' => ['required', $this->existsInUserBranch($request, 'users')],
            'student_ids' => 'required|array',
            'student_ids.*' => [$this->existsInUserBranch($request, 'students')],
            'group_id' => ['nullable', $this->existsInUserBranch($request, 'groups')],
            'autodrome_id' => ['nullable', $this->existsInUserBranch($request, 'autodromes')],
            'vehicle_id' => ['nullable', $this->existsInUserBranch($request, 'vehicles')],
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        if (! User::find($validated['instructor_id'])?->isInstructor()) {
            return redirect()->back()->withErrors(['instructor_id' => 'Tanlangan xodim instruktor emas.']);
        }

        $scheduler = app(DrivingScheduler::class);

        // Auto-detect or validate vehicle
        $vehicle = ! empty($validated['vehicle_id'])
            ? Vehicle::find($validated['vehicle_id'])
            : Vehicle::where('instructor_id', $validated['instructor_id'])->where('status', 'active')->first();

        $conflict = $scheduler->conflictMessage(
            (int) $validated['instructor_id'],
            $vehicle,
            $validated['student_ids'],
            $validated['start_time'],
            $validated['end_time'],
        );
        if ($conflict) {
            return redirect()->back()->withErrors(['start_time' => $conflict]);
        }

        // Validate every student before creating anything so a later failure
        // cannot leave the earlier students booked and notified.
        $students = Student::with('activeContract.contractType')->whereIn('id', $validated['student_ids'])->get();
        foreach ($students as $student) {
            $restriction = $scheduler->studentRestrictionMessage($student, $validated['start_time']);
            if ($restriction) {
                return redirect()->back()->withErrors(['student_ids' => $restriction]);
            }
        }

        $drivings = DB::transaction(fn () => $students->map(fn (Student $student) => Driving::create([
            'branch_id' => $student->branch_id ?: $request->user()->branch_id,
            'instructor_id' => $validated['instructor_id'],
            'student_id' => $student->id,
            'group_id' => $student->group_id ?: ($validated['group_id'] ?? null),
            'contract_id' => $student->activeContract?->id,
            'vehicle_id' => $vehicle?->id,
            'autodrome_id' => $validated['autodrome_id'] ?? null,
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'status' => 'scheduled',
        ])));

        foreach ($drivings as $driving) {
            SendDrivingCreatedNotificationJob::dispatch($driving);
        }

        return redirect()->back();
    }

    public function update(Request $request, Driving $driving)
    {
        if (in_array($driving->status, ['completed', 'cancelled'])) {
            return redirect()->back()->withErrors([
                'update' => 'Tugallangan yoki bekor qilingan mashg\'ulotni o\'zgartirish mumkin emas.',
            ]);
        }

        $validated = $request->validate([
            'autodrome_id' => ['nullable', $this->existsInUserBranch($request, 'autodromes')],
            'start_time' => 'sometimes|required|date',
            'end_time' => 'sometimes|required|date',
            'status' => 'sometimes|required|in:scheduled,completed,cancelled',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        // Compare against the stored value when only one end of the slot changes.
        $newStart = Carbon::parse($validated['start_time'] ?? $driving->start_time);
        $newEnd = Carbon::parse($validated['end_time'] ?? $driving->end_time);
        if ($newEnd->lte($newStart)) {
            return redirect()->back()->withErrors(['end_time' => 'Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak.']);
        }

        $isRescheduled = ! $newStart->equalTo($driving->start_time) || ! $newEnd->equalTo($driving->end_time);
        if ($isRescheduled && ($validated['status'] ?? $driving->status) === 'scheduled') {
            $conflict = app(DrivingScheduler::class)->conflictMessage(
                (int) $driving->instructor_id,
                $driving->vehicle,
                [$driving->student_id],
                $newStart,
                $newEnd,
                $driving->id,
            );
            if ($conflict) {
                return redirect()->back()->withErrors(['start_time' => $conflict]);
            }
        }

        $oldStatus = $driving->status;
        $oldStartTime = $driving->start_time;
        $oldEndTime = $driving->end_time;
        $oldAutodromeId = $driving->autodrome_id;

        $driving->update($validated);

        if (! $driving->start_time->equalTo($oldStartTime)) {
            $driving->update([
                'reminded_24h_at' => null,
                'reminded_2h_at' => null,
            ]);
        }

        $newStatus = $validated['status'] ?? $driving->status;

        if ($oldStatus !== $newStatus) {
            if ($newStatus === 'completed') {
                app(TelegramService::class)->sendLessonRatingPrompt($driving);
            } elseif ($newStatus === 'cancelled') {
                app(TelegramService::class)->sendDrivingCancelledNotification($driving);
            }
        } elseif ($newStatus === 'scheduled' && (
            ! $driving->start_time->equalTo($oldStartTime) ||
            ! $driving->end_time->equalTo($oldEndTime) ||
            (int) $oldAutodromeId !== (int) $driving->autodrome_id
        )) {
            app(TelegramService::class)->sendDrivingUpdatedNotification($driving);
        }

        return redirect()->back();
    }

    public function destroy(Driving $driving)
    {
        if (in_array($driving->status, ['completed', 'cancelled']) || $driving->review()->exists()) {
            return redirect()->back()->withErrors([
                'delete' => 'Tugallangan yoki bekor qilingan mashg\'ulotni o\'chirish mumkin emas.',
            ]);
        }

        app(TelegramService::class)->sendDrivingCancelledNotification($driving);
        $driving->delete();

        return redirect()->back();
    }
}
