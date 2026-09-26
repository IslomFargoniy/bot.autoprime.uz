<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class StaffController extends Controller
{
    private function checkAccess(Request $request): void
    {
        $user = $request->user();
        if ($user->role === 'instructor') {
            abort(403, 'Instruktorlar ushbu bo\'limdan foydalana olmaydi.');
        }
    }

    public function index(Request $request): Response
    {
        $this->checkAccess($request);

        $currentUser = $request->user();
        $isSuperAdmin = $currentUser->role === 'superadmin' || $currentUser->id === 1;

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($currentUser->role === 'admin' && $currentUser->branch_id) {
            $targetBranchId = $currentUser->branch_id;
        }

        $query = User::with('branch')
            ->orderBy('id', 'desc');

        if (! $isSuperAdmin) {
            $query->where('role', '!=', 'superadmin');
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

        // Role counts for tabs
        $countsQuery = User::query();
        if (! $isSuperAdmin) {
            $countsQuery->where('role', '!=', 'superadmin');
            if ($currentUser->branch_id) {
                $countsQuery->where('branch_id', $currentUser->branch_id);
            }
        } elseif ($targetBranchId) {
            $countsQuery->where('branch_id', $targetBranchId);
        }

        $roleCounts = [
            'all' => (clone $countsQuery)->count(),
            'instructor' => (clone $countsQuery)->where('role', 'instructor')->count(),
            'teacher' => (clone $countsQuery)->where('role', 'teacher')->count(),
            'admin' => (clone $countsQuery)->where('role', 'admin')->count(),
            'reception' => (clone $countsQuery)->where('role', 'reception')->count(),
            'accountant' => (clone $countsQuery)->where('role', 'accountant')->count(),
            'kassir' => (clone $countsQuery)->where('role', 'kassir')->count(),
            'superadmin' => $isSuperAdmin ? (clone $countsQuery)->where('role', 'superadmin')->count() : 0,
        ];

        $totalBaseSalary = (float) (clone $countsQuery)->sum('base_salary');
        $activeCount = (clone $countsQuery)->where('status', 'active')->count();

        $perPage = $request->get('per_page', 25);
        if ($perPage === 'all') {
            $perPage = max($query->count(), 1);
        }

        $staff = $query->paginate($perPage)->withQueryString();

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Staff/Index', [
            'staff' => $staff,
            'branches' => $branches,
            'roleCounts' => $roleCounts,
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
                'per_page' => $request->per_page ?? '25',
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->checkAccess($request);

        $currentUser = $request->user();
        $isSuperAdmin = $currentUser->role === 'superadmin' || $currentUser->id === 1;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:users,phone',
            'telegram_id' => 'nullable|string|max:50|unique:users,telegram_id',
            'role' => 'required|string|in:instructor,teacher,admin,reception,accountant,kassir,superadmin',
            'branch_id' => 'nullable|exists:branches,id',
            'status' => 'nullable|in:active,inactive',
            'base_salary' => 'nullable|numeric|min:0',
            'driving_hourly_rate' => 'nullable|numeric|min:0',
            'lesson_rate' => 'nullable|numeric|min:0',
            'car_name' => 'nullable|string|max:255',
            'photo' => 'nullable|image|max:5120',
            'password' => 'required|string|min:6',
        ]);

        if ($validated['role'] === 'superadmin' && ! $isSuperAdmin) {
            abort(403, 'Faqat Bosh Admin superadmin qo\'sha oladi.');
        }

        $branchId = ($currentUser->role === 'admin' && $currentUser->branch_id)
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

        try {
            Role::firstOrCreate(['name' => $validated['role'], 'guard_name' => 'web']);
            $user->syncRoles([$validated['role']]);
        } catch (\Exception $e) {
        }

        return redirect()->back()->with('success', 'Xodim muvaffaqiyatli qo\'shildi.');
    }

    public function update(Request $request, User $staff)
    {
        $this->checkAccess($request);

        $currentUser = $request->user();
        $isSuperAdmin = $currentUser->role === 'superadmin' || $currentUser->id === 1;

        if ($staff->role === 'superadmin' && ! $isSuperAdmin) {
            abort(403, 'Bosh admin hisobini faqat Superadmin tahrirlay oladi.');
        }

        if ($currentUser->role === 'admin' && $currentUser->branch_id && $staff->branch_id !== $currentUser->branch_id) {
            abort(403, 'Boshqa filial xodimini tahrirlash huquqingiz yo\'q.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:users,phone,'.$staff->id,
            'telegram_id' => 'nullable|string|max:50|unique:users,telegram_id,'.$staff->id,
            'role' => 'required|string|in:instructor,teacher,admin,reception,accountant,kassir,superadmin',
            'branch_id' => 'nullable|exists:branches,id',
            'status' => 'nullable|in:active,inactive',
            'base_salary' => 'nullable|numeric|min:0',
            'driving_hourly_rate' => 'nullable|numeric|min:0',
            'lesson_rate' => 'nullable|numeric|min:0',
            'car_name' => 'nullable|string|max:255',
            'photo' => 'nullable|image|max:5120',
            'password' => 'nullable|string|min:6',
        ]);

        if ($validated['role'] === 'superadmin' && ! $isSuperAdmin) {
            abort(403, 'Faqat Bosh Admin superadmin rolini biriktira oladi.');
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

        $oldRole = $staff->role;
        $staff->update($validated);

        if ($oldRole !== $validated['role']) {
            try {
                Role::firstOrCreate(['name' => $validated['role'], 'guard_name' => 'web']);
                $staff->syncRoles([$validated['role']]);
            } catch (\Exception $e) {
            }
        }

        return redirect()->back()->with('success', 'Xodim ma\'lumotlari yangilandi.');
    }

    public function show(User $staff, Request $request)
    {
        $this->checkAccess($request);

        $staff->load(['branch', 'salaries' => function ($q) {
            $q->orderBy('created_at', 'desc')->take(12);
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
        $this->checkAccess($request);

        $currentUser = $request->user();
        $isSuperAdmin = $currentUser->role === 'superadmin' || $currentUser->id === 1;

        if ($currentUser->id === $staff->id) {
            return redirect()->back()->withErrors(['message' => 'O\'z hisobingizni o\'chira olmaysiz.']);
        }

        if ($staff->id === 1 || ($staff->role === 'superadmin' && ! $isSuperAdmin)) {
            abort(403, 'Bosh admin hisobini o\'chirish taqiqlangan.');
        }

        if ($staff->photo_path) {
            Storage::disk('public')->delete($staff->photo_path);
        }

        $staff->delete();

        return redirect()->back()->with('success', 'Xodim o\'chirildi.');
    }
}
