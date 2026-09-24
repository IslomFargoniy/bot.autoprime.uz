<?php

namespace App\Http\Controllers\Admin;

use App\Exports\GroupStudentsExport;
use App\Http\Controllers\Controller;
use App\Imports\StudentsImport;
use App\Models\Branch;
use App\Models\Course;
use App\Models\Group;
use App\Models\User;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Facades\Excel;

class GroupController extends Controller
{
    public function exportStudents(Request $request, Group $group)
    {
        $filename = "guruh_{$group->name}_oquvchilar.xlsx";

        return Excel::download(new GroupStudentsExport($group, $request->all()), $filename);
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $isInstructor = $user->role === 'instructor';

        $query = Group::with(['instructor', 'branch', 'course'])->orderBy('id', 'desc');

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->where('branch_id', $targetBranchId);
        }

        if ($isInstructor) {
            $query->where('instructor_id', $user->id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->filled('instructor_id') && ! $isInstructor) {
            $query->where('instructor_id', $request->instructor_id);
        }

        $perPage = $request->get('per_page', 25);
        if ($perPage === 'all') {
            $perPage = max($query->count(), 1);
        }

        $groups = $query->paginate($perPage)->withQueryString();

        $instructors = User::where('role', 'instructor')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->when($isInstructor, function ($q) use ($user) {
                $q->where('id', $user->id);
            })
            ->get();

        $branches = Branch::where('status', 'active')->get();
        $courses = Course::where('is_active', true)->select(['id', 'name', 'category'])->get();

        return Inertia::render('Admin/Groups/Index', [
            'groups' => $groups,
            'instructors' => $instructors,
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
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'instructor_id' => 'nullable|exists:users,id',
            'branch_id' => 'nullable|exists:branches,id',
            'course_id' => 'nullable|exists:courses,id',
        ]);

        $user = $request->user();
        if ($user->role === 'admin' && $user->branch_id) {
            $validated['branch_id'] = $user->branch_id;
        } elseif (empty($validated['branch_id'])) {
            $validated['branch_id'] = $user->branch_id;
        }

        Group::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Group $group)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'instructor_id' => 'nullable|exists:users,id',
            'branch_id' => 'nullable|exists:branches,id',
            'course_id' => 'nullable|exists:courses,id',
        ]);

        $group->update($validated);

        return redirect()->back();
    }

    public function destroy(Group $group, Request $request)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $group->delete();

        return redirect()->route('groups.index');
    }

    public function show(Request $request, Group $group): Response
    {
        $user = $request->user();
        if ($user->role === 'instructor' && $group->instructor_id !== $user->id) {
            abort(403, 'Siz faqat o\'zingizga biriktirilgan guruhlarni ko\'rishingiz mumkin.');
        }

        $group->load(['instructor', 'course', 'branch']);

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

    public function downloadTemplate()
    {
        $export = new class implements FromArray
        {
            public function array(): array
            {
                return [
                    ['full_name', 'phone'],
                    ['Eshmatov Toshmat', '+998901234567'],
                    ['Toshmatova Eshmatxon', '+998901234568'],
                ];
            }
        };

        return Excel::download($export, 'talabalar_shabloni.xlsx');
    }

    public function importStudents(Request $request, Group $group)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $request->validate([
            'file' => 'required|file|mimes:xlsx,csv,xls',
        ]);

        $branchId = $group->branch_id ?? $request->user()->branch_id;
        $import = new StudentsImport($group->id, $branchId);
        Excel::import($import, $request->file('file'));

        return redirect()->back()->with('success', "{$import->importedCount} ta o'quvchi muvaffaqiyatli yuklandi");
    }
}
