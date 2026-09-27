<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Autodrome;
use App\Models\Branch;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AutodromeController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $query = Autodrome::with('branch')->withCount(['drivings as completed_drivings_count' => function ($q) {
            $q->where('status', 'completed');
        }]);

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->where(function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
            });
        }

        $perPage = $request->get('per_page', '15');
        $autodromes = $query->orderBy('name')->paginate($perPage === 'all' ? max($query->count(), 1) : (int) $perPage)->withQueryString();
        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Autodromes/Index', [
            'autodromes' => $autodromes,
            'branches' => $branches,
            'filters' => [
                'branch_id' => $targetBranchId,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    public function store(Request $request)
    {
        if ($request->user()->isInstructor()) {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius_meters' => 'required|integer|min:10',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $user = $request->user();
        if ($user->isBranchRestricted()) {
            $validated['branch_id'] = $user->branch_id;
        }

        Autodrome::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Autodrome $autodrome)
    {
        if ($request->user()->isInstructor()) {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius_meters' => 'required|integer|min:10',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $autodrome->update($validated);

        return redirect()->back();
    }

    public function destroy(Autodrome $autodrome, Request $request)
    {
        if ($request->user()->isInstructor()) {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $autodrome->delete();

        return redirect()->back();
    }
}
