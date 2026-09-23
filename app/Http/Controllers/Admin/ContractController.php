<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Group;
use App\Models\Student;
use App\Services\BranchSessionService;
use App\Services\TelegramService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContractController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = Contract::with(['student', 'contractType', 'group', 'branch', 'payments'])
            ->orderBy('created_at', 'desc');

        if ($targetBranchId) {
            $query->where('branch_id', $targetBranchId);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->boolean('has_debt')) {
            $query->where('debt_amount', '>', 0);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('contract_number', 'like', "%{$s}%")
                    ->orWhereHas('student', function ($sub) use ($s) {
                        $sub->where('full_name', 'like', "%{$s}%")
                            ->orWhere('phone', 'like', "%{$s}%");
                    });
            });
        }

        $contracts = $query->paginate(20)->withQueryString();

        $students = Student::orderBy('full_name')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->select(['id', 'full_name', 'phone', 'group_id'])
            ->get();

        $contractTypes = ContractType::where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where(function ($sub) use ($targetBranchId) {
                    $sub->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
                });
            })
            ->get();

        $groups = Group::where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->get();

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Contracts/Index', [
            'contracts' => $contracts,
            'students' => $students,
            'contractTypes' => $contractTypes,
            'groups' => $groups,
            'branches' => $branches,
            'filters' => [
                'search' => $request->search,
                'status' => $request->status,
                'payment_status' => $request->payment_status,
                'has_debt' => $request->boolean('has_debt'),
                'branch_id' => $targetBranchId,
            ],
        ]);
    }

    public function store(Request $request, TelegramService $telegramService): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'contract_type_id' => 'required|exists:contract_types,id',
            'group_id' => 'nullable|exists:groups,id',
            'branch_id' => 'nullable|exists:branches,id',
            'discount_amount' => 'nullable|numeric|min:0',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'terms' => 'nullable|string',
        ]);

        $contractType = ContractType::findOrFail($validated['contract_type_id']);
        $student = Student::findOrFail($validated['student_id']);
        $branchId = $validated['branch_id'] ?? $student->branch_id ?? BranchSessionService::getActiveBranchId($request) ?? $request->user()->branch_id;
        $discount = (float) ($validated['discount_amount'] ?? 0);
        $total = (float) $contractType->price;
        $final = max(0, $total - $discount);

        $contractCount = Contract::count() + 1;
        $contractNumber = 'AP-'.date('Y').'-'.str_pad((string) $contractCount, 4, '0', STR_PAD_LEFT);

        $contract = Contract::create([
            'branch_id' => $branchId,
            'student_id' => $student->id,
            'contract_type_id' => $contractType->id,
            'group_id' => $validated['group_id'] ?? $student->group_id,
            'created_by_user_id' => $request->user()->id,
            'contract_number' => $contractNumber,
            'contract_date' => now()->toDateString(),
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'has_theory' => $contractType->has_theory,
            'has_driving' => $contractType->has_driving,
            'has_lms' => $contractType->has_lms,
            'required_driving_lessons' => $contractType->required_driving_lessons,
            'required_theory_lessons' => $contractType->required_theory_lessons,
            'total_amount' => $total,
            'discount_amount' => $discount,
            'final_amount' => $final,
            'paid_amount' => 0,
            'debt_amount' => $final,
            'overpaid_amount' => 0,
            'status' => 'active',
            'payment_status' => 'unpaid',
            'terms' => $validated['terms'] ?? null,
        ]);

        if ($validated['group_id'] && ! $student->group_id) {
            $student->update(['group_id' => $validated['group_id']]);
        }

        $telegramService->sendContractSignedNotification($contract);

        return redirect()->back()->with('success', "Shartnoma tuzildi: #{$contract->contract_number}");
    }

    public function downloadPdf(Contract $contract)
    {
        $contract->load(['student', 'contractType', 'group', 'branch', 'payments']);

        $pdf = Pdf::loadView('pdf.contract', [
            'contract' => $contract,
            'student' => $contract->student,
            'branch' => $contract->branch,
            'contractType' => $contract->contractType,
        ]);

        return $pdf->download("Shartnoma_{$contract->contract_number}.pdf");
    }

    public function update(Request $request, Contract $contract): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|required|in:draft,active,completed,cancelled',
            'terms' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $contract->update($validated);

        return redirect()->back()->with('success', 'Shartnoma yangilandi.');
    }

    public function destroy(Contract $contract): RedirectResponse
    {
        if ($contract->payments()->exists()) {
            return redirect()->back()->withErrors([
                'delete' => 'Ushbu shartnoma bo\'yicha to\'lovlar qabul qilingan. Uni o\'chirish mumkin emas.',
            ]);
        }

        $contract->delete();

        return redirect()->back()->with('success', 'Shartnoma o\'chirildi.');
    }
}
