<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\ContractType;
use App\Services\BranchSessionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContractTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = ContractType::with('branch')->orderBy('name');

        if ($targetBranchId) {
            $query->where(function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
            });
        }

        $contractTypes = $query->paginate(20)->withQueryString();
        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/ContractTypes/Index', [
            'contractTypes' => $contractTypes,
            'branches' => $branches,
            'filters' => [
                'branch_id' => $targetBranchId,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'name' => 'required|string|max:255',
            'category' => 'required|string|in:A,B,C,BC,D,E',
            'price' => 'required|numeric|min:0',
            'has_theory' => 'boolean',
            'has_driving' => 'boolean',
            'has_lms' => 'boolean',
            'required_driving_lessons' => 'integer|min:0',
            'required_theory_lessons' => 'integer|min:0',
            'min_theory_payment_percent' => 'numeric|min:0|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        ContractType::create([
            'branch_id' => $validated['branch_id'] ?? null,
            'name' => $validated['name'],
            'category' => $validated['category'],
            'price' => $validated['price'],
            'has_theory' => $validated['has_theory'] ?? true,
            'has_driving' => $validated['has_driving'] ?? true,
            'has_lms' => $validated['has_lms'] ?? true,
            'required_driving_lessons' => $validated['required_driving_lessons'] ?? 10,
            'required_theory_lessons' => $validated['required_theory_lessons'] ?? 24,
            'min_theory_payment_percent' => $validated['min_theory_payment_percent'] ?? 30.0,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', 'Shartnoma tarifi yaratildi.');
    }

    public function update(Request $request, ContractType $contractType): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'name' => 'required|string|max:255',
            'category' => 'required|string|in:A,B,C,BC,D,E',
            'price' => 'required|numeric|min:0',
            'has_theory' => 'boolean',
            'has_driving' => 'boolean',
            'has_lms' => 'boolean',
            'required_driving_lessons' => 'integer|min:0',
            'required_theory_lessons' => 'integer|min:0',
            'min_theory_payment_percent' => 'numeric|min:0|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $contractType->update($validated);

        return redirect()->back()->with('success', 'Shartnoma tarifi yangilandi.');
    }

    public function destroy(ContractType $contractType): RedirectResponse
    {
        if ($contractType->contracts()->exists()) {
            return redirect()->back()->withErrors([
                'delete' => 'Ushbu tarif bo\'yicha tuzilgan shartnomalar mavjudligi sababli uni o\'chirib bo\'lmaydi.',
            ]);
        }

        $contractType->delete();

        return redirect()->back()->with('success', 'Tarif o\'chirildi.');
    }
}
