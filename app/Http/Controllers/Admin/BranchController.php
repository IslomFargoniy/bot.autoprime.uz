<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    public function selectBranch(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->route('login');
        }

        $isSuperAdmin = $user->isSuperAdmin();

        if (! $isSuperAdmin) {
            abort(403, 'Filialni faqat Asosiy Admin almashtira oladi.');
        }

        BranchSessionService::setActiveBranchId($user, $request->input('branch_id'));

        return redirect()->back(fallback: route('admin.dashboard'));
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user->isSuperAdmin()) {
            abort(403, 'Ushbu bo\'lim faqat SuperAdmin uchun ochiq.');
        }

        $query = Branch::withCount(['users', 'groups', 'students', 'drivings']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $perPage = $this->perPage($request, fn () => $query->count());

        $branches = $query->orderBy('id', 'desc')->paginate($perPage)->withQueryString();

        return Inertia::render('Admin/Branches/Index', [
            'branches' => $branches,
            'filters' => [
                'search' => $request->search,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (! $user->isSuperAdmin()) {
            abort(403, 'Ruxsat berilmagan.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:branches,code',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        Branch::create($validated);

        return redirect()->back()->with('success', 'Filial muvaffaqiyatli yaratildi.');
    }

    public function update(Request $request, Branch $branch)
    {
        $user = $request->user();
        if (! $user->isSuperAdmin()) {
            abort(403, 'Ruxsat berilmagan.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:branches,code,'.$branch->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        $branch->update($validated);

        return redirect()->back()->with('success', 'Filial ma\'lumotlari yangilandi.');
    }

    public function destroy(Request $request, Branch $branch)
    {
        $user = $request->user();
        if (! $user->isSuperAdmin()) {
            abort(403, 'Ruxsat berilmagan.');
        }

        if ($branch->code === 'main' || $branch->id === 1) {
            return redirect()->back()->with('error', 'Asosiy filialni o\'chirib bo\'lmaydi.');
        }

        if ($branch->hasDependentRecords()) {
            return redirect()->back()->withErrors([
                'delete' => 'Filialda xodim, o\'quvchi, guruh yoki moliyaviy yozuvlar mavjud. O\'chirish o\'rniga filialni nofaol qiling.',
            ]);
        }

        $branch->delete();

        return redirect()->back()->with('success', 'Filial o\'chirildi.');
    }
}
