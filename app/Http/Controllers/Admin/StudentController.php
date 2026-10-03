<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\BranchScopedValidationRules;
use App\Concerns\PersonalDataRules;
use App\Exports\StudentsExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Group;
use App\Models\Student;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class StudentController extends Controller
{
    use BranchScopedValidationRules, PersonalDataRules;

    /**
     * Instructors and teachers may only put students into their own groups,
     * otherwise the student would leave their reach or land in a colleague's group.
     */
    private function ensureAssignableGroup(Request $request, int|string|null $groupId): void
    {
        $user = $request->user();

        if ($user->worksOnOwnRecordsOnly() && ! $user->ownsGroup($groupId ? Group::find($groupId) : null)) {
            throw ValidationException::withMessages(['group_id' => 'O\'quvchini faqat o\'z guruhingizga biriktira olasiz.']);
        }
    }

    public function export(Request $request)
    {
        $filters = $request->all();
        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $filters['branch_id'] = $targetBranchId;
        }

        return Excel::download(new StudentsExport($filters, $request->user()), 'oquvchilar.xlsx');
    }

    public function searchApi(Request $request)
    {
        $user = $request->user();
        $ownRecordsOnly = $user->worksOnOwnRecordsOnly();

        $query = Student::with(['group', 'branch'])->orderBy('full_name', 'asc');

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->inBranch($targetBranchId);
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
            $query->where(function ($q) use ($ownRecordsOnly, $user) {
                $q->whereNull('group_id');
                if ($ownRecordsOnly) {
                    $q->orWhereHas('group', function ($gQ) use ($user) {
                        $gQ->where(fn ($o) => $o->whereNull('teacher_id')->orWhere('teacher_id', '!=', $user->id))
                            ->where(fn ($o) => $o->whereNull('instructor_id')->orWhere('instructor_id', '!=', $user->id));
                    });
                } else {
                    $q->orWhereNotNull('group_id');
                }
            });
        } elseif ($request->filled('group_id')) {
            $query->where('group_id', $request->group_id)->visibleTo($user);
        } else {
            $query->visibleTo($user);
        }

        $limit = min((int) $request->get('limit', 30), 100);

        return response()->json($query->limit($limit)->get());
    }

    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Student::with(['group', 'branch'])
            ->visibleTo($user)
            ->withCount(['drivings as completed_drivings_count' => function ($q) {
                $q->where('status', 'completed');
            }])
            ->orderBy('id', 'desc');

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->inBranch($targetBranchId);
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

        $perPage = $this->perPage($request, fn () => $query->count());

        $students = $query->paginate($perPage)->withQueryString();

        $groups = Group::when($targetBranchId, function ($q) use ($targetBranchId) {
            $q->where('branch_id', $targetBranchId);
        })
            ->visibleTo($user)
            ->get();

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
        // Normalize before the unique check so +998/no-prefix variants are one number.
        $this->normalizePersonalInput($request);

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => array_merge($this->phoneRules(), ['unique:students,phone']),
            'telegram_id' => array_merge($this->telegramIdRules(), ['unique:students,telegram_id']),
            'group_id' => ['nullable', $this->activeGroupInUserBranch($request)],
            'branch_id' => 'nullable|exists:branches,id',
        ], $this->personalDataMessages());

        $this->ensureAssignableGroup($request, $validated['group_id'] ?? null);
        $this->ensureGroupHasRoom($validated['group_id'] ?? null);

        $user = $request->user();
        if ($user->isBranchRestricted()) {
            $validated['branch_id'] = $user->branch_id;
        } elseif (empty($validated['branch_id'])) {
            $validated['branch_id'] = $user->branch_id;
        }

        Student::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Student $student)
    {
        abort_unless($request->user()->canSeeStudent($student), 403, 'Siz faqat o\'z o\'quvchilaringizni tahrirlay olasiz.');

        $this->normalizePersonalInput($request);

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => $this->rulesUnlessUnchanged(array_merge($this->phoneRules(), ['unique:students,phone,'.$student->id]), $request, $student, 'phone'),
            'telegram_id' => $this->rulesUnlessUnchanged(array_merge($this->telegramIdRules(), ['unique:students,telegram_id,'.$student->id]), $request, $student, 'telegram_id'),
            'group_id' => ['nullable', $this->activeGroupInUserBranch($request, $student->group_id)],
            'branch_id' => 'nullable|exists:branches,id',
            'status' => 'sometimes|in:active,dropped,graduated',
        ], $this->personalDataMessages());

        // The form always sends the current status back, so an unchanged value is fine;
        // `graduated` is only ever set by issuing a certificate and is final.
        if (isset($validated['status']) && $validated['status'] !== $student->status) {
            if ($student->status === 'graduated') {
                throw ValidationException::withMessages(['status' => 'Bitirgan o\'quvchining holatini o\'zgartirib bo\'lmaydi.']);
            }

            if ($validated['status'] === 'graduated') {
                throw ValidationException::withMessages(['status' => '"Bitirgan" holati guvohnoma berilganda qo\'yiladi.']);
            }
        }

        $this->ensureAssignableGroup($request, $validated['group_id'] ?? null);

        if ((int) ($validated['group_id'] ?? 0) !== (int) $student->group_id) {
            $this->ensureGroupHasRoom($validated['group_id'] ?? null);
        }

        $student->update($validated);

        return redirect()->back();
    }

    public function show(Student $student, Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->canSeeStudent($student), 403, 'Siz faqat o\'z o\'quvchilaringizni ko\'ra olasiz.');

        $student->load('group.instructor');

        $drivingsQuery = $student->drivings()
            ->with(['instructor', 'group', 'review'])
            ->orderBy('start_time', 'desc');

        if ($request->filled('status')) {
            $drivingsQuery->where('status', $request->status);
        }

        $perPage = $this->perPage($request, fn () => $drivingsQuery->count());

        $drivings = $drivingsQuery->paginate($perPage)->withQueryString();

        $drivingCounts = $student->drivings()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $avgRating = (float) ($student->drivings()
            ->join('reviews', 'reviews.driving_id', '=', 'drivings.id')
            ->avg('reviews.rating') ?? 0);
        $avgRating = round($avgRating, 1);

        $stats = [
            'total_drivings' => array_sum($drivingCounts),
            'completed_drivings' => $drivingCounts['completed'] ?? 0,
            'scheduled_drivings' => $drivingCounts['scheduled'] ?? 0,
            'cancelled_drivings' => $drivingCounts['cancelled'] ?? 0,
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
        abort_unless($request->user()->canSeeStudent($student), 403, 'Siz faqat o\'z o\'quvchilaringizni o\'chira olasiz.');

        if ($student->hasHistory()) {
            return redirect()->back()->withErrors([
                'delete' => 'Bu o\'quvchining shartnoma, to\'lov yoki dars tarixi bor. O\'chirish o\'rniga holatini o\'zgartiring.',
            ]);
        }

        $student->delete();

        return redirect()->back();
    }
}
