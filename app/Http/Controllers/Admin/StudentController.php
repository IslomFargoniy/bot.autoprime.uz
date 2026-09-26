<?php

namespace App\Http\Controllers\Admin;

use App\Exports\StudentsExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Group;
use App\Models\Student;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class StudentController extends Controller
{
    public function export(Request $request)
    {
        $filters = $request->all();
        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $filters['branch_id'] = $targetBranchId;
        }

        return Excel::download(new StudentsExport($filters), 'oquvchilar.xlsx');
    }

    public function searchApi(Request $request)
    {
        $user = $request->user();
        $isInstructor = $user->role === 'instructor';

        $query = Student::with(['group', 'branch'])->orderBy('full_name', 'asc');

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->where(function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)
                    ->orWhereHas('group', function ($gQ) use ($targetBranchId) {
                        $gQ->where('branch_id', $targetBranchId);
                    });
            });
        }

        $search = $request->get('q');
        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('group', function ($gQ) use ($search) {
                        $gQ->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $otherStudents = filter_var($request->get('other_students'), FILTER_VALIDATE_BOOLEAN);

        if ($otherStudents) {
            $query->where(function ($q) use ($isInstructor, $user) {
                $q->whereNull('group_id');
                if ($isInstructor) {
                    $q->orWhereHas('group', function ($gQ) use ($user) {
                        $gQ->where('instructor_id', '!=', $user->id);
                    });
                } else {
                    $q->orWhereNotNull('group_id');
                }
            });
        } elseif ($request->filled('group_id')) {
            $query->where('group_id', $request->group_id);
        } elseif ($isInstructor) {
            $query->whereHas('group', function ($q) use ($user) {
                $q->where('instructor_id', $user->id);
            });
        }

        $limit = min((int) $request->get('limit', 30), 100);

        return response()->json($query->limit($limit)->get());
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $isInstructor = $user->role === 'instructor';

        $query = Student::with(['group', 'branch'])
            ->withCount(['drivings as completed_drivings_count' => function ($q) {
                $q->where('status', 'completed');
            }])
            ->orderBy('id', 'desc');

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->where(function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)
                    ->orWhereHas('group', function ($gQ) use ($targetBranchId) {
                        $gQ->where('branch_id', $targetBranchId);
                    });
            });
        }

        if ($isInstructor) {
            $query->whereHas('group', function ($q) use ($user) {
                $q->where('instructor_id', $user->id);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('group_id')) {
            $query->where('group_id', $request->group_id);
        }

        $perPage = $request->get('per_page', 25);
        if ($perPage === 'all') {
            $perPage = max($query->count(), 1);
        }

        $students = $query->paginate($perPage)->withQueryString();

        $groups = Group::when($targetBranchId, function ($q) use ($targetBranchId) {
            $q->where('branch_id', $targetBranchId);
        })
            ->when($isInstructor, function ($q) use ($user) {
                $q->where('instructor_id', $user->id);
            })->get();

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Students/Index', [
            'students' => $students,
            'groups' => $groups,
            'branches' => $branches,
            'filters' => [
                'search' => $request->search,
                'group_id' => $request->group_id,
                'branch_id' => $targetBranchId,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    public function store(Request $request)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:students',
            'telegram_id' => 'nullable|string|unique:students',
            'group_id' => 'nullable|exists:groups,id',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $user = $request->user();
        if ($user->role === 'admin' && $user->branch_id) {
            $validated['branch_id'] = $user->branch_id;
        } elseif (empty($validated['branch_id'])) {
            $validated['branch_id'] = $user->branch_id;
        }

        Student::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Student $student)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:students,phone,'.$student->id,
            'telegram_id' => 'nullable|string|unique:students,telegram_id,'.$student->id,
            'group_id' => 'nullable|exists:groups,id',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $student->update($validated);

        return redirect()->back();
    }

    public function show(Student $student, Request $request): Response
    {
        $student->load('group.instructor');

        $drivingsQuery = $student->drivings()
            ->with(['instructor', 'group', 'review'])
            ->orderBy('start_time', 'desc');

        if ($request->filled('status')) {
            $drivingsQuery->where('status', $request->status);
        }

        $perPage = $request->get('per_page', 25);
        if ($perPage === 'all') {
            $perPage = max($drivingsQuery->count(), 1);
        }

        $drivings = $drivingsQuery->paginate($perPage)->withQueryString();

        $reviews = $student->drivings()->has('review')->with('review')->get()->pluck('review');
        $avgRating = $reviews->count() > 0 ? round($reviews->avg('rating'), 1) : 0;

        $stats = [
            'total_drivings' => $student->drivings()->count(),
            'completed_drivings' => $student->drivings()->where('status', 'completed')->count(),
            'scheduled_drivings' => $student->drivings()->where('status', 'scheduled')->count(),
            'cancelled_drivings' => $student->drivings()->where('status', 'cancelled')->count(),
            'average_rating' => $avgRating,
        ];

        $student->load(['group.instructor', 'branch', 'contracts.contractType', 'contracts.payments.cashRegister']);

        $financialHistories = $student->financialHistories()
            ->with(['performedBy'])
            ->take(50)
            ->get();

        return Inertia::render('Admin/Students/Show', [
            'student' => $student,
            'drivings' => $drivings,
            'stats' => $stats,
            'contracts' => $student->contracts,
            'financialHistories' => $financialHistories,
            'filters' => [
                'status' => $request->status,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    public function destroy(Student $student, Request $request)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $student->delete();

        return redirect()->back();
    }
}
