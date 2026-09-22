<?php

namespace App\Http\Controllers\Admin;

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
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class DrivingController extends Controller
{
    public function export(Request $request)
    {
        $filters = $request->all();
        $user = $request->user();
        if ($user->role === 'instructor') {
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
        $isInstructor = $user->role === 'instructor';

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

        $perPage = $request->get('per_page', 25);
        if ($perPage === 'all') {
            $perPage = max($query->count(), 1); // Avoid 0 per page
        }

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
            'instructor_id' => 'required|exists:users,id',
            'student_ids' => 'required|array',
            'student_ids.*' => 'exists:students,id',
            'group_id' => 'nullable|exists:groups,id',
            'autodrome_id' => 'nullable|exists:autodromes,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        // 1. Collision check for instructor
        $instructorCollision = Driving::where('instructor_id', $validated['instructor_id'])
            ->where('status', 'scheduled')
            ->where(function ($q) use ($validated) {
                $q->where(function ($q2) use ($validated) {
                    $q2->where('start_time', '<', $validated['end_time'])
                        ->where('end_time', '>', $validated['start_time']);
                });
            })
            ->exists();

        if ($instructorCollision) {
            return redirect()->back()->withErrors([
                'start_time' => 'Instruktor ushbu vaqt oralig\'ida boshqa darsga band (vaqt kesishuvi aniqlandi).',
            ]);
        }

        // 2. Auto-detect or validate vehicle
        $vehicle = null;
        if (! empty($validated['vehicle_id'])) {
            $vehicle = Vehicle::find($validated['vehicle_id']);
        } else {
            $vehicle = Vehicle::where('default_instructor_id', $validated['instructor_id'])->where('status', 'active')->first();
        }

        if ($vehicle) {
            $vehicleCollision = Driving::where('vehicle_id', $vehicle->id)
                ->where('status', 'scheduled')
                ->where(function ($q) use ($validated) {
                    $q->where(function ($q2) use ($validated) {
                        $q2->where('start_time', '<', $validated['end_time'])
                            ->where('end_time', '>', $validated['start_time']);
                    });
                })
                ->exists();

            if ($vehicleCollision) {
                return redirect()->back()->withErrors([
                    'start_time' => "Avtomobil ({$vehicle->plate_number}) ushbu vaqt oralig'ida boshqa darsga band.",
                ]);
            }
        }

        // 3. Check 75% payment rule for students
        foreach ($validated['student_ids'] as $studentId) {
            $student = Student::with('activeContract.contractType')->find($studentId);
            if (! $student) {
                continue;
            }

            $activeContract = $student->activeContract;
            if ($activeContract && $activeContract->has_driving && ! $activeContract->canAccessDriving()) {
                return redirect()->back()->withErrors([
                    'student_ids' => "{$student->full_name} talabasi amaliy haydash uchun kamida 75% to'lov qilishi shart (Hozirgi to'lov: {$activeContract->payment_percentage}%).",
                ]);
            }

            $groupId = $student->group_id ?: ($validated['group_id'] ?? null);
            $branchId = $student->branch_id ?: $request->user()->branch_id;

            $driving = Driving::create([
                'branch_id' => $branchId,
                'instructor_id' => $validated['instructor_id'],
                'student_id' => $studentId,
                'group_id' => $groupId,
                'contract_id' => $activeContract?->id,
                'vehicle_id' => $vehicle?->id,
                'autodrome_id' => $validated['autodrome_id'] ?? null,
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'status' => 'scheduled',
            ]);

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
            'autodrome_id' => 'nullable|exists:autodromes,id',
            'start_time' => 'sometimes|required|date',
            'end_time' => 'sometimes|required|date|after:start_time',
            'status' => 'sometimes|required|in:scheduled,completed,cancelled',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $oldStatus = $driving->status;
        $oldStartTime = $driving->start_time;
        $oldEndTime = $driving->end_time;
        $oldAutodromeId = $driving->autodrome_id;

        $driving->update($validated);

        if ($oldStartTime != $driving->start_time) {
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
            $oldStartTime !== $driving->start_time ||
            $oldEndTime !== $driving->end_time ||
            $oldAutodromeId !== $driving->autodrome_id
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
