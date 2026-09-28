<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    /**
     * The staff page only manages staff roles (admins live on the superadmin-only
     * admins page), and branch-restricted users only their own branch.
     */
    private function ensureCanAccessStaff(User $currentUser, User $staff): void
    {
        if (! in_array($staff->role, config('roles.staff_roles'), true)) {
            abort(403, 'Adminlar faqat Superadmin tomonidan "Adminlar" bo\'limida boshqariladi.');
        }

        if ($currentUser->isBranchRestricted() && $staff->branch_id !== $currentUser->branch_id) {
            abort(403, 'Boshqa filial xodimi ustida amal bajarish huquqingiz yo\'q.');
        }
    }

    public function index(Request $request): Response
    {
        $currentUser = $request->user();
        $isSuperAdmin = $currentUser->isSuperAdmin();

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($currentUser->isBranchRestricted()) {
            $targetBranchId = $currentUser->branch_id;
        }

        $query = User::with(['branch', 'permissions:id,name'])
            ->whereIn('role', config('roles.staff_roles'))
            ->orderBy('id', 'desc');

        if (! $isSuperAdmin) {
            if ($currentUser->branch_id) {
                $query->where('branch_id', $currentUser->branch_id);
            }
        } elseif ($targetBranchId) {
            $query->where(function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)
                    ->orWhereNull('branch_id');
            });
        }

        // Role filter
        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('telegram_id', 'like', "%{$search}%")
                    ->orWhere('car_name', 'like', "%{$search}%");
            });
        }

        // Role counts for tabs (single aggregated query)
        $countsQuery = User::query()->whereIn('role', config('roles.staff_roles'));
        if (! $isSuperAdmin) {
            if ($currentUser->branch_id) {
                $countsQuery->where('branch_id', $currentUser->branch_id);
            }
        } elseif ($targetBranchId) {
            $countsQuery->where('branch_id', $targetBranchId);
        }

        $groupedCounts = (clone $countsQuery)
            ->selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role')
            ->all();

        $roleCounts = [
            'all' => array_sum($groupedCounts),
            'instructor' => $groupedCounts['instructor'] ?? 0,
            'teacher' => $groupedCounts['teacher'] ?? 0,
            'reception' => $groupedCounts['reception'] ?? 0,
            'accountant' => $groupedCounts['accountant'] ?? 0,
            'kassir' => $groupedCounts['kassir'] ?? 0,
        ];

        $totalBaseSalary = (float) (clone $countsQuery)->sum('base_salary');
        $activeCount = (clone $countsQuery)->where('status', 'active')->count();

        $perPage = $this->perPage($request, fn () => $query->count());

        $staff = $query->paginate($perPage)->withQueryString();

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Staff/Index', [
            'staff' => $staff,
            'branches' => $branches,
            'roleCounts' => $roleCounts,
            'permissionCatalog' => $this->permissionCatalog($currentUser),
            'stats' => [
                'total_count' => $roleCounts['all'],
                'active_count' => $activeCount,
                'total_base_salary' => $totalBaseSalary,
            ],
            'filters' => [
                'search' => $request->search,
                'role' => $request->role ?? 'all',
                'status' => $request->status ?? 'all',
                'branch_id' => $targetBranchId,
                'per_page' => $request->per_page ?? '15',
            ],
        ]);
    }

    public function store(Request $request)
    {
        $currentUser = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:users,phone',
            'telegram_id' => 'nullable|string|max:50|unique:users,telegram_id',
            'role' => ['required', 'string', Rule::in(config('roles.staff_roles'))],
            'branch_id' => [Rule::requiredIf(! $currentUser->isBranchRestricted()), 'nullable', 'exists:branches,id'],
            'status' => 'nullable|in:active,inactive',
            'base_salary' => 'nullable|numeric|min:0',
            'driving_hourly_rate' => 'nullable|numeric|min:0',
            'lesson_rate' => 'nullable|numeric|min:0',
            'car_name' => 'nullable|string|max:255',
            'photo' => 'nullable|image|max:5120',
            'password' => 'required|string|min:6',
        ]);

        $branchId = $currentUser->isBranchRestricted()
            ? $currentUser->branch_id
            : ($validated['branch_id'] ?? null);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('staff', 'public');
        }

        $user = User::create([
            'branch_id' => $branchId,
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'telegram_id' => $validated['telegram_id'] ?? null,
            'car_name' => $validated['car_name'] ?? null,
            'photo_path' => $photoPath,
            'role' => $validated['role'],
            'status' => $validated['status'] ?? 'active',
            'password' => Hash::make($validated['password']),
            'base_salary' => $validated['base_salary'] ?? 0,
            'driving_hourly_rate' => $validated['driving_hourly_rate'] ?? 0,
            'lesson_rate' => $validated['lesson_rate'] ?? 0,
            'salary_balance' => 0,
        ]);

        return redirect()->back()->with('success', 'Xodim muvaffaqiyatli qo\'shildi.');
    }

    public function update(Request $request, User $staff)
    {
        $currentUser = $request->user();

        $this->ensureCanAccessStaff($currentUser, $staff);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:users,phone,'.$staff->id,
            'telegram_id' => 'nullable|string|max:50|unique:users,telegram_id,'.$staff->id,
            'role' => ['required', 'string', Rule::in(config('roles.staff_roles'))],
            'branch_id' => [Rule::requiredIf(! $currentUser->isBranchRestricted()), 'nullable', 'exists:branches,id'],
            'status' => 'nullable|in:active,inactive',
            'base_salary' => 'nullable|numeric|min:0',
            'driving_hourly_rate' => 'nullable|numeric|min:0',
            'lesson_rate' => 'nullable|numeric|min:0',
            'car_name' => 'nullable|string|max:255',
            'photo' => 'nullable|image|max:5120',
            'password' => 'nullable|string|min:6',
        ]);

        if ($currentUser->isBranchRestricted()) {
            $validated['branch_id'] = $currentUser->branch_id;
        }

        if ($request->hasFile('photo')) {
            if ($staff->photo_path) {
                Storage::disk('public')->delete($staff->photo_path);
            }
            $validated['photo_path'] = $request->file('photo')->store('staff', 'public');
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $staff->update($validated);

        return redirect()->back()->with('success', 'Xodim ma\'lumotlari yangilandi.');
    }

    /**
     * Grant a staff member permissions of other staff roles on top of their own
     * role (e.g. a receptionist who also works as a cashier). The role's own
     * permissions always stay; only the extras are stored as direct permissions.
     */
    public function updatePermissions(Request $request, User $staff)
    {
        $currentUser = $request->user();
        $this->ensureCanAccessStaff($currentUser, $staff);

        if ($staff->is($currentUser)) {
            abort(403, 'O\'zingizga ruxsat bera olmaysiz.');
        }

        $validated = $request->validate([
            'permissions' => 'present|array',
            'permissions.*' => ['string', Rule::in($this->grantablePermissions())],
        ]);

        $rolePermissions = config("roles.roles.{$staff->role}", []);
        $requested = array_values(array_diff(array_unique($validated['permissions']), $rolePermissions));
        $current = $staff->permissions()->pluck('name')->all();

        // Only the permissions being added or removed must be ones the actor may hand out.
        $changed = array_merge(array_diff($requested, $current), array_diff($current, $requested));
        $notAllowed = array_diff($changed, $this->permissionsGrantableBy($currentUser));
        if ($notAllowed !== []) {
            return redirect()->back()->withErrors(['permissions' => 'Sizda o\'zingizda bo\'lmagan ruxsatni bera olmaysiz: '.implode(', ', $notAllowed)]);
        }

        $staff->syncPermissions($requested);

        return redirect()->back()->with('success', 'Xodim ruxsatlari yangilandi.');
    }

    /**
     * Every permission that belongs to some staff role, i.e. may be granted as an extra.
     *
     * @return list<string>
     */
    private function grantablePermissions(): array
    {
        return array_values(array_unique(array_merge(...array_map(
            fn (string $role) => config("roles.roles.{$role}", []),
            config('roles.staff_roles'),
        ))));
    }

    /**
     * Grantable permissions the actor may hand out: those they hold themselves,
     * plus the instructor / teacher capabilities (a job, not an access right).
     *
     * @return list<string>
     */
    private function permissionsGrantableBy(User $actor): array
    {
        return array_values(array_filter(
            $this->grantablePermissions(),
            fn (string $permission) => $actor->isSuperAdmin()
                || in_array($permission, config('roles.capabilities'), true)
                || $actor->checkPermissionTo($permission),
        ));
    }

    /**
     * Staff permissions grouped by role for the permission dialog.
     *
     * @return array{groups: list<array{role: string, label: string, permissions: list<array{name: string, label: string}>}>, role_permissions: array<string, list<string>>, grantable: list<string>}
     */
    private function permissionCatalog(User $actor): array
    {
        $labels = config('roles.labels');

        return [
            'groups' => array_map(fn (string $role) => [
                'role' => $role,
                'label' => config("roles.role_labels.{$role}", $role),
                'permissions' => array_map(
                    fn (string $permission) => ['name' => $permission, 'label' => $labels[$permission] ?? $permission],
                    config("roles.roles.{$role}", []),
                ),
            ], config('roles.staff_roles')),
            'role_permissions' => array_map(
                fn (string $role) => config("roles.roles.{$role}", []),
                array_combine(config('roles.staff_roles'), config('roles.staff_roles')),
            ),
            'grantable' => $this->permissionsGrantableBy($actor),
        ];
    }

    public function show(User $staff, Request $request)
    {
        $this->ensureCanAccessStaff($request->user(), $staff);

        $staff->load(['branch', 'salaries' => function ($q) {
            $q->with('payments')->orderBy('created_at', 'desc')->take(12);
        }, 'salaryPayments' => function ($q) {
            $q->with('cashRegister')->orderBy('paid_at', 'desc')->take(20);
        }]);

        $financialHistories = $staff->financialHistories()
            ->with(['performedBy'])
            ->take(50)
            ->get();

        return response()->json([
            'staff' => $staff,
            'financialHistories' => $financialHistories,
        ]);
    }

    public function destroy(User $staff, Request $request)
    {
        $currentUser = $request->user();

        if ($currentUser->id === $staff->id) {
            return redirect()->back()->withErrors(['message' => 'O\'z hisobingizni o\'chira olmaysiz.']);
        }

        $this->ensureCanAccessStaff($currentUser, $staff);

        if ($staff->hasWorkHistory()) {
            return redirect()->back()->withErrors(['delete' => 'Bu xodimning oylik yoki dars tarixi bor. O\'chirish o\'rniga holatini "nofaol" qiling.']);
        }

        if ($staff->photo_path) {
            Storage::disk('public')->delete($staff->photo_path);
        }

        $staff->delete();

        return redirect()->back()->with('success', 'Xodim o\'chirildi.');
    }
}
