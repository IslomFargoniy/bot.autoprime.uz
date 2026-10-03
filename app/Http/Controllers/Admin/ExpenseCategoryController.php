<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

class ExpenseCategoryController extends Controller
{
    /**
     * A name is unique among the categories of the same branch (or among the shared ones).
     */
    private function uniqueName(?int $branchId, ?int $ignoreId = null): Unique
    {
        return Rule::unique('expense_categories', 'name')
            ->where(fn ($q) => $branchId === null ? $q->whereNull('branch_id') : $q->where('branch_id', $branchId))
            ->ignore($ignoreId);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        // A branch admin always creates for their own branch; the superadmin may pick a
        // branch or leave it empty for a category shared by all branches.
        if ($user->isBranchRestricted()) {
            $request->merge(['branch_id' => $user->branch_id]);
        }

        $validated = $request->validate([
            'branch_id' => ['nullable', Rule::exists('branches', 'id')],
            'name' => ['required', 'string', 'max:255', $this->uniqueName($request->integer('branch_id') ?: null)],
            'is_active' => 'sometimes|boolean',
        ], [
            'name.unique' => 'Bunday xarajat turi allaqachon bor.',
        ]);

        ExpenseCategory::create([
            'branch_id' => $validated['branch_id'] ?? null,
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', 'Xarajat turi qo\'shildi.');
    }

    public function update(Request $request, ExpenseCategory $expenseCategory): RedirectResponse
    {
        abort_unless($expenseCategory->isEditableBy($request->user()), 403, 'Bu xarajat turini o\'zgartirishga ruxsatingiz yo\'q.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', $this->uniqueName($expenseCategory->branch_id, $expenseCategory->id)],
            'is_active' => 'sometimes|boolean',
        ], [
            'name.unique' => 'Bunday xarajat turi allaqachon bor.',
        ]);

        if ($expenseCategory->isSystem() && array_key_exists('is_active', $validated) && ! $validated['is_active']) {
            return redirect()->back()->withErrors(['is_active' => 'Tizim xarajat turini o\'chirib bo\'lmaydi, faqat nomini o\'zgartirish mumkin.']);
        }

        $expenseCategory->update($validated);

        return redirect()->back()->with('success', 'Xarajat turi yangilandi.');
    }

    public function destroy(Request $request, ExpenseCategory $expenseCategory): RedirectResponse
    {
        abort_unless($expenseCategory->isEditableBy($request->user()), 403, 'Bu xarajat turini o\'chirishga ruxsatingiz yo\'q.');

        if ($expenseCategory->isSystem()) {
            return redirect()->back()->withErrors(['delete' => 'Tizim xarajat turini o\'chirib bo\'lmaydi, faqat nomini o\'zgartirish mumkin.']);
        }

        if ($expenseCategory->expenses()->exists()) {
            return redirect()->back()->withErrors(['delete' => 'Bu turda xarajatlar bor. O\'chirish o\'rniga uni nofaol qiling.']);
        }

        $expenseCategory->delete();

        return redirect()->back()->with('success', 'Xarajat turi o\'chirildi.');
    }
}
