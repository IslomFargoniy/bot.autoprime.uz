<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\BranchScopedValidationRules;
use App\Exports\GroupStudentsExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Course;
use App\Models\Group;
use App\Models\User;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class GroupController extends Controller
{
    use BranchScopedValidationRules;

    /**
     * Instructors and teachers may only work with groups they drive or teach.
     */
    private function ensureGroupAccess(User $user, Group $group): void
    {
        if ($user->worksOnOwnRecordsOnly() && ! $user->ownsGroup($group)) {
            abort(403, 'Siz faqat o\'zingizga biriktirilgan guruhlar bilan ishlay olasiz.');
        }
    }

    /**
     * An instructor or teacher managing groups must remain the group's
     * instructor or teacher, otherwise they would lose access to it.
     *
     * @param  array<string, mixed>  $validated
     */
    private function ensureStaysOwner(User $user, array $validated): void
    {
        if (! $user->worksOnOwnRecordsOnly()) {
            return;
        }

        $isOwner = (int) ($validated['teacher_id'] ?? 0) === $user->id
            || (int) ($validated['instructor_id'] ?? 0) === $user->id;

        if (! $isOwner) {
            throw ValidationException::withMessages(['teacher_id' => 'Guruhga o\'zingizni o\'qituvchi yoki instruktor sifatida biriktiring.']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function groupRules(Request $request): array
    {
        return [
            'name' => 'required|string|max:100',
            'instructor_id' => ['nullable', $this->existsInUserBranch($request, 'users'), $this->userWithCapability('drivings.conduct', 'Tanlangan xodim instruktor emas.')],
            'teacher_id' => ['nullable', $this->existsInUserBranch($request, 'users'), $this->userWithCapability('lessons.teach', 'Tanlangan xodim o\'qituvchi emas.')],
            'branch_id' => 'nullable|exists:branches,id',
            'course_id' => 'nullable|exists:courses,id',
            'is_active' => 'sometimes|boolean',
        ];
    }

    /**
     * Keep the legacy `status` column in step with `is_active`.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function withStatus(array $validated): array
    {
        if (array_key_exists('is_active', $validated)) {
            $validated['status'] = $validated['is_active'] ? 'active' : 'inactive';
        }

        return $validated;
    }

    public function exportStudents(Request $request, Group $group)
    {
        $this->ensureGroupAccess($request->user(), $group);

        $filename = "guruh_{$group->name}_oquvchilar.xlsx";

        return Excel::download(new GroupStudentsExport($group, $request->all()), $filename);
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $ownRecordsOnly = $user->worksOnOwnRecordsOnly();

        $query = Group::with(['instructor', 'teacher', 'branch', 'course'])->visibleTo($user)->orderBy('id', 'desc');

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->where('branch_id', $targetBranchId);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->filled('instructor_id') && ! $ownRecordsOnly) {
            $query->where('instructor_id', $request->instructor_id);
        }

        $perPage = $this->perPage($request, fn () => $query->count());

        $groups = $query->paginate($perPage)->withQueryString();

        $staffWith = fn (string $capability) => User::permission($capability)
            ->where('status', 'active')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->when($ownRecordsOnly, function ($q) use ($user) {
                $q->where('id', $user->id);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'branch_id']);

        $instructors = $staffWith('drivings.conduct');
        $teachers = $staffWith('lessons.teach');

        $branches = Branch::where('status', 'active')->get();
        $courses = Course::where('is_active', true)->select(['id', 'name', 'category'])->get();

        return Inertia::render('Admin/Groups/Index', [
            'groups' => $groups,
            'instructors' => $instructors,
            'teachers' => $teachers,
            'branches' => $branches,
            'courses' => $courses,
            'filters' => [
                'search' => $request->search,
                'instructor_id' => $request->instructor_id,
                'branch_id' => $targetBranchId,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->groupRules($request));
        $this->ensureStaysOwner($request->user(), $validated);

        $user = $request->user();
        if ($user->isBranchRestricted()) {
            $validated['branch_id'] = $user->branch_id;
        } elseif (empty($validated['branch_id'])) {
            $validated['branch_id'] = $user->branch_id;
        }

        Group::create($this->withStatus($validated));

        return redirect()->back();
    }

    public function update(Request $request, Group $group)
    {
        $this->ensureGroupAccess($request->user(), $group);

        $validated = $request->validate($this->groupRules($request));
        $this->ensureStaysOwner($request->user(), $validated);

        $group->update($this->withStatus($validated));

        return redirect()->back();
    }

    public function destroy(Group $group, Request $request)
    {
        $this->ensureGroupAccess($request->user(), $group);

        // Sessions, attendance and lessons cascade with the group, which would erase
        // the history that graduation and payroll depend on.
        if ($group->students()->exists()
            || $group->lessonSessions()->exists()
            || $group->contracts()->exists()
            || $group->drivings()->exists()) {
            return redirect()->back()->withErrors([
                'delete' => 'Guruhda o\'quvchi, dars yoki shartnoma tarixi bor. O\'chirish o\'rniga guruhni nofaol qiling.',
            ]);
        }

        $group->delete();

        return redirect()->route('groups.index');
    }

    public function show(Request $request, Group $group): Response
    {
        $this->ensureGroupAccess($request->user(), $group);

        $group->load(['instructor', 'teacher', 'course', 'branch']);

        $students = $group->students()
            ->withCount(['drivings as completed_drivings_count' => function ($q) {
                $q->where('status', 'completed');
            }])
            ->orderBy('full_name')
            ->get();

        return Inertia::render('Admin/Groups/Show', [
            'group' => $group,
            'students' => $students,
        ]);
    }
}
