<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use App\Services\BranchSessionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class VehicleController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = Vehicle::with(['branch', 'defaultInstructor', 'maintenances.cashRegister'])
            ->orderBy('created_at', 'desc');

        if ($targetBranchId) {
            $query->where('branch_id', $targetBranchId);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('plate_number', 'like', "%{$s}%")
                    ->orWhere('model', 'like', "%{$s}%");
            });
        }

        $vehicles = $query->paginate(20)->withQueryString();

        $instructors = User::where('role', 'instructor')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->get();

        $branches = Branch::where('status', 'active')->get();

        $cashRegisters = CashRegister::with('type')
            ->where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where(function ($sub) use ($targetBranchId) {
                    $sub->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
                });
            })
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Vehicles/Index', [
            'vehicles' => $vehicles,
            'instructors' => $instructors,
            'branches' => $branches,
            'cashRegisters' => $cashRegisters,
            'filters' => [
                'search' => $request->search,
                'branch_id' => $targetBranchId,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'default_instructor_id' => 'nullable|exists:users,id',
            'plate_number' => 'required|string|max:50|unique:vehicles,plate_number',
            'model' => 'required|string|max:100',
            'year' => 'nullable|integer|min:1990|max:'.(date('Y') + 1),
            'fuel_type' => 'required|in:petrol,gas_methane,gas_propane,diesel,electric,methane,propane',
            'status' => 'required|in:active,maintenance,out_of_service,retired',
            'notes' => 'nullable|string',
        ]);

        $branchId = $validated['branch_id'] ?? BranchSessionService::getActiveBranchId($request) ?? $request->user()->branch_id ?? Branch::first()?->id ?? 1;

        $fuelType = $validated['fuel_type'];
        if ($fuelType === 'methane') {
            $fuelType = 'gas_methane';
        } elseif ($fuelType === 'propane') {
            $fuelType = 'gas_propane';
        }

        $status = $validated['status'] === 'retired' ? 'out_of_service' : $validated['status'];

        Vehicle::create([
            'branch_id' => $branchId,
            'instructor_id' => $validated['default_instructor_id'] ?? null,
            'plate_number' => strtoupper($validated['plate_number']),
            'make_model' => $validated['model'],
            'fuel_type' => $fuelType,
            'status' => $status,
        ]);

        return redirect()->back()->with('success', __('vehicles.created_success', [], $request->getPreferredLanguage() ?? 'uz'));
    }

    public function update(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'default_instructor_id' => 'nullable|exists:users,id',
            'plate_number' => 'required|string|max:50|unique:vehicles,plate_number,'.$vehicle->id,
            'model' => 'required|string|max:100',
            'year' => 'nullable|integer|min:1990|max:'.(date('Y') + 1),
            'fuel_type' => 'required|in:petrol,gas_methane,gas_propane,diesel,electric,methane,propane',
            'status' => 'required|in:active,maintenance,out_of_service,retired',
            'notes' => 'nullable|string',
        ]);

        $fuelType = $validated['fuel_type'];
        if ($fuelType === 'methane') {
            $fuelType = 'gas_methane';
        } elseif ($fuelType === 'propane') {
            $fuelType = 'gas_propane';
        }

        $status = $validated['status'] === 'retired' ? 'out_of_service' : $validated['status'];

        $vehicle->update([
            'branch_id' => $validated['branch_id'] ?? $vehicle->branch_id,
            'instructor_id' => $validated['default_instructor_id'] ?? null,
            'plate_number' => strtoupper($validated['plate_number']),
            'make_model' => $validated['model'],
            'fuel_type' => $fuelType,
            'status' => $status,
        ]);

        return redirect()->back()->with('success', __('vehicles.updated_success', [], $request->getPreferredLanguage() ?? 'uz'));
    }

    public function destroy(Vehicle $vehicle): RedirectResponse
    {
        $vehicle->delete();

        return redirect()->back()->with('success', __('vehicles.deleted_success', [], app()->getLocale()));
    }

    public function storeMaintenance(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $validated = $request->validate([
            'maintenance_type' => 'required|string|max:100',
            'cost' => 'required|numeric|min:0',
            'performed_date' => 'required|date',
            'next_due_date' => 'nullable|date',
            'odometer' => 'nullable|numeric|min:0',
            'cash_register_id' => 'nullable|exists:cash_registers,id',
            'notes' => 'nullable|string',
        ]);

        if (! empty($validated['cash_register_id']) && (float) $validated['cost'] > 0) {
            $cashRegister = CashRegister::find($validated['cash_register_id']);
            if ($cashRegister && (float) $cashRegister->balance < (float) $validated['cost']) {
                return redirect()->back()->withErrors([
                    'cash_register_id' => "Tanlangan kassada mablag' yetarli emas. Joriy balans: ".number_format((float) $cashRegister->balance, 0, '', ' ').' UZS',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $vehicle, $request) {
            $expenseId = null;
            if (! empty($validated['cash_register_id']) && (float) $validated['cost'] > 0) {
                $lockedRegister = CashRegister::where('id', $validated['cash_register_id'])->lockForUpdate()->first();
                if ($lockedRegister && (float) $lockedRegister->balance >= (float) $validated['cost']) {
                    $category = ExpenseCategory::firstOrCreate(
                        ['name' => "Avtomobil ta'miri va ehtiyot qismlar"],
                        ['is_active' => true]
                    );

                    $expense = Expense::create([
                        'branch_id' => $vehicle->branch_id ?? $lockedRegister->branch_id ?? Branch::first()?->id ?? 1,
                        'cash_register_id' => $lockedRegister->id,
                        'expense_category_id' => $category->id,
                        'user_id' => $request->user()->id,
                        'amount' => $validated['cost'],
                        'recipient' => "Avtomobil: {$vehicle->plate_number} ({$vehicle->make_model})",
                        'description' => "Texnik xizmat: {$validated['maintenance_type']}".(! empty($validated['notes']) ? " ({$validated['notes']})" : ''),
                        'spent_at' => $validated['performed_date'],
                    ]);

                    $lockedRegister->decrement('balance', (float) $validated['cost']);
                    $expenseId = $expense->id;
                }
            }

            $mileage = ! empty($validated['odometer']) ? (int) $validated['odometer'] : ($vehicle->current_mileage ?? 0);

            VehicleMaintenance::create([
                'vehicle_id' => $vehicle->id,
                'cash_register_id' => $validated['cash_register_id'] ?? null,
                'expense_id' => $expenseId,
                'maintenance_type' => $validated['maintenance_type'],
                'cost' => $validated['cost'],
                'performed_at' => $validated['performed_date'],
                'next_due_date' => $validated['next_due_date'] ?? null,
                'mileage' => $mileage,
                'description' => $validated['notes'] ?? null,
            ]);

            if (! empty($validated['odometer']) && (int) $validated['odometer'] > (int) $vehicle->current_mileage) {
                $vehicle->update(['current_mileage' => (int) $validated['odometer']]);
            }
        });

        return redirect()->back()->with('success', __('vehicles.maintenance_success', [], app()->getLocale()));
    }

    public function destroyMaintenance(Vehicle $vehicle, VehicleMaintenance $maintenance): RedirectResponse
    {
        DB::transaction(function () use ($maintenance) {
            if ($maintenance->expense_id) {
                $expense = Expense::find($maintenance->expense_id);
                if ($expense && $expense->cash_register_id) {
                    CashRegister::where('id', $expense->cash_register_id)->increment('balance', (float) $expense->amount);
                    $expense->delete();
                }
            }
            $maintenance->delete();
        });

        return redirect()->back()->with('success', __('vehicles.maintenance_deleted', [], app()->getLocale()) ?: 'Texnik xizmat yozuvi muvaffaqiyatli o\'chirildi.');
    }
}
