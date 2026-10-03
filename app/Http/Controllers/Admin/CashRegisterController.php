<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashTransfer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CashRegisterController extends Controller
{
    /**
     * Central (branch-less) registers belong to the superadmin; everyone else only
     * reaches the registers of their own branch.
     */
    private function ensureCanManage(Request $request, CashRegister $register): void
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return;
        }

        abort_unless($register->branch_id !== null && $register->branch_id === $user->branch_id, 403, 'Bu kassani boshqarishga ruxsatingiz yo\'q.');
    }

    private function hasPendingTransfers(CashRegister $register): bool
    {
        return CashTransfer::where('status', 'pending')
            ->where(fn ($q) => $q->where('from_cash_register_id', $register->id)->orWhere('to_cash_register_id', $register->id))
            ->exists();
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isBranchRestricted()) {
            $request->merge(['branch_id' => $user->branch_id]);
        }

        $validated = $request->validate([
            'branch_id' => ['required', Rule::exists(Branch::class, 'id')->where('status', 'active')],
            'cash_register_type_id' => ['required', Rule::exists('cash_register_types', 'id')->where('is_active', true)],
            'name' => [
                'required', 'string', 'max:100',
                Rule::unique('cash_registers', 'name')->where('branch_id', $request->input('branch_id')),
            ],
            'is_active' => 'sometimes|boolean',
        ], [
            'name.unique' => 'Bu filialda shu nomli kassa allaqachon bor.',
        ]);

        CashRegister::create([
            'branch_id' => $validated['branch_id'],
            'cash_register_type_id' => $validated['cash_register_type_id'],
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
            'balance' => 0,
        ]);

        return redirect()->back()->with('success', 'Kassa yaratildi.');
    }

    public function update(Request $request, CashRegister $cashRegister): RedirectResponse
    {
        $this->ensureCanManage($request, $cashRegister);

        $isCentral = $cashRegister->branch_id === null;

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:100',
                Rule::unique('cash_registers', 'name')->where('branch_id', $cashRegister->branch_id)->ignore($cashRegister->id),
            ],
            'cash_register_type_id' => ['sometimes', Rule::exists('cash_register_types', 'id')->where(
                fn ($q) => $q->where('is_active', true)->orWhere('id', $cashRegister->cash_register_type_id)
            )],
            'is_active' => 'sometimes|boolean',
        ], [
            'name.unique' => 'Bu filialda shu nomli kassa allaqachon bor.',
        ]);

        // A central register may only be renamed: its type and state hold the whole system together.
        if ($isCentral) {
            $cashRegister->update(['name' => $validated['name']]);

            return redirect()->back()->with('success', 'Kassa yangilandi.');
        }

        $changes = ['name' => $validated['name']];

        if (isset($validated['cash_register_type_id']) && (int) $validated['cash_register_type_id'] !== (int) $cashRegister->cash_register_type_id) {
            if ($cashRegister->hasHistory()) {
                return redirect()->back()->withErrors(['cash_register_type_id' => 'Kassada harakat bo\'lgan, turini o\'zgartirib bo\'lmaydi.']);
            }

            $changes['cash_register_type_id'] = $validated['cash_register_type_id'];
        }

        if (isset($validated['is_active']) && (bool) $validated['is_active'] !== $cashRegister->is_active) {
            if (! $validated['is_active']) {
                if ((float) $cashRegister->balance !== 0.0) {
                    return redirect()->back()->withErrors(['is_active' => 'Kassada qoldiq bor, avval boshqa kassaga o\'tkazing.']);
                }

                if ($this->hasPendingTransfers($cashRegister)) {
                    return redirect()->back()->withErrors(['is_active' => 'Kassada tasdiqlanmagan o\'tkazma bor, avval uni yakunlang.']);
                }
            }

            $changes['is_active'] = (bool) $validated['is_active'];
        }

        $cashRegister->update($changes);

        return redirect()->back()->with('success', 'Kassa yangilandi.');
    }

    public function destroy(Request $request, CashRegister $cashRegister): RedirectResponse
    {
        $this->ensureCanManage($request, $cashRegister);

        if ($cashRegister->branch_id === null) {
            return redirect()->back()->withErrors(['delete' => 'Markaziy kassani o\'chirib bo\'lmaydi.']);
        }

        if ((float) $cashRegister->balance !== 0.0 || $cashRegister->hasHistory()) {
            return redirect()->back()->withErrors(['delete' => 'Kassada qoldiq yoki harakatlar tarixi bor. O\'chirish o\'rniga kassani nofaol qiling.']);
        }

        $cashRegister->delete();

        return redirect()->back()->with('success', 'Kassa o\'chirildi.');
    }
}
