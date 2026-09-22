<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use App\Services\BranchSessionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VehicleController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = Vehicle::with(['branch', 'defaultInstructor', 'maintenances'])
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

        return Inertia::render('Admin/Vehicles/Index', [
            'vehicles' => $vehicles,
            'instructors' => $instructors,
            'branches' => $branches,
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
            'fuel_type' => 'required|in:petrol,methane,propane,diesel,electric',
            'status' => 'required|in:active,maintenance,retired',
            'notes' => 'nullable|string',
        ]);

        $branchId = $validated['branch_id'] ?? BranchSessionService::getActiveBranchId($request) ?? $request->user()->branch_id;

        Vehicle::create([
            'branch_id' => $branchId,
            'default_instructor_id' => $validated['default_instructor_id'] ?? null,
            'plate_number' => strtoupper($validated['plate_number']),
            'model' => $validated['model'],
            'year' => $validated['year'] ?? null,
            'fuel_type' => $validated['fuel_type'],
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Avtomobil muvaffaqiyatli qo\'shildi.');
    }

    public function update(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'default_instructor_id' => 'nullable|exists:users,id',
            'plate_number' => 'required|string|max:50|unique:vehicles,plate_number,'.$vehicle->id,
            'model' => 'required|string|max:100',
            'year' => 'nullable|integer|min:1990|max:'.(date('Y') + 1),
            'fuel_type' => 'required|in:petrol,methane,propane,diesel,electric',
            'status' => 'required|in:active,maintenance,retired',
            'notes' => 'nullable|string',
        ]);

        $vehicle->update($validated);

        return redirect()->back()->with('success', 'Avtomobil ma\'lumotlari yangilandi.');
    }

    public function destroy(Vehicle $vehicle): RedirectResponse
    {
        $vehicle->delete();

        return redirect()->back()->with('success', 'Avtomobil o\'chirildi.');
    }

    public function storeMaintenance(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $validated = $request->validate([
            'maintenance_type' => 'required|string|max:100',
            'cost' => 'required|numeric|min:0',
            'performed_date' => 'required|date',
            'next_due_date' => 'nullable|date|after_or_equal:performed_date',
            'odometer' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        VehicleMaintenance::create([
            'vehicle_id' => $vehicle->id,
            'maintenance_type' => $validated['maintenance_type'],
            'cost' => $validated['cost'],
            'performed_date' => $validated['performed_date'],
            'next_due_date' => $validated['next_due_date'] ?? null,
            'odometer' => $validated['odometer'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Texnik xizmat yozuvi kiritildi.');
    }
}
