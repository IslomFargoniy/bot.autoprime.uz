<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Group;
use App\Models\Payment;
use App\Models\Student;
use App\Services\BranchSessionService;
use App\Services\TelegramService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ContractController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = Contract::with(['student', 'contractType', 'group', 'branch', 'payments.cashRegister', 'payments.receivedBy'])
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

        $cashRegisters = CashRegister::with('type')
            ->where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where(function ($sub) use ($targetBranchId) {
                    $sub->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
                });
            })
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Contracts/Index', [
            'contracts' => $contracts,
            'students' => $students,
            'contractTypes' => $contractTypes,
            'groups' => $groups,
            'branches' => $branches,
            'cashRegisters' => $cashRegisters,
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
        $branchId = $validated['branch_id'] ?? $student->branch_id ?? BranchSessionService::getActiveBranchId($request) ?? $request->user()->branch_id ?? Branch::first()?->id ?? 1;
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

    public function refund(Request $request, Contract $contract): RedirectResponse
    {
        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|in:cash,card_click,bank_transfer',
            'cancel_contract' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $maxRefund = (float) $contract->paid_amount;
        if ((float) $validated['amount'] > $maxRefund) {
            return redirect()->back()->withErrors([
                'amount' => "Qaytariladigan summa to'langan summadan (".number_format($maxRefund, 0, '', ' ')." UZS) ko'p bo'lishi mumkin emas.",
            ]);
        }

        $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);
        if ((float) $cashRegister->balance < (float) $validated['amount']) {
            return redirect()->back()->withErrors([
                'cash_register_id' => "Tanlangan kassada yetarli mablag' mavjud emas (Mavjud: ".number_format((float) $cashRegister->balance, 0, '', ' ').' UZS).',
            ]);
        }

        DB::transaction(function () use ($contract, $cashRegister, $validated, $request) {
            $lockedRegister = CashRegister::where('id', $cashRegister->id)->lockForUpdate()->first();
            $lockedContract = Contract::with('student')->where('id', $contract->id)->lockForUpdate()->first();

            $receiptNumber = 'REF-'.date('Ymd').'-'.str_pad((string) (Payment::where('payment_type', 'refund')->count() + 1), 4, '0', STR_PAD_LEFT);

            // 1. Create refund payment
            Payment::create([
                'branch_id' => $lockedContract->branch_id ?? $lockedRegister->branch_id ?? 1,
                'contract_id' => $lockedContract->id,
                'student_id' => $lockedContract->student_id,
                'cash_register_id' => $lockedRegister->id,
                'received_by_user_id' => $request->user()->id,
                'amount' => $validated['amount'],
                'payment_type' => 'refund',
                'payment_method' => $validated['payment_method'],
                'receipt_number' => $receiptNumber,
                'paid_at' => now(),
                'comment' => $validated['notes'] ?? 'Shartnoma to\'lovini qaytarish',
            ]);

            // 2. Create expense record in Finance
            $category = ExpenseCategory::firstOrCreate(
                ['name' => "Talaba to'lovini qaytarish (Refund)"],
                ['is_active' => true]
            );

            Expense::create([
                'branch_id' => $lockedContract->branch_id ?? $lockedRegister->branch_id ?? 1,
                'cash_register_id' => $lockedRegister->id,
                'expense_category_id' => $category->id,
                'user_id' => $request->user()->id,
                'amount' => $validated['amount'],
                'recipient' => "Talaba: {$lockedContract->student?->full_name} (#{$lockedContract->contract_number})",
                'description' => "To'lovni qaytarish (Chek: #{$receiptNumber})".(! empty($validated['notes']) ? ": {$validated['notes']}" : ''),
                'spent_at' => now(),
            ]);

            // 3. Decrement cash register balance
            $lockedRegister->decrement('balance', (float) $validated['amount']);

            // 4. Recalculate contract finances
            $lockedContract->recalculateFinances();

            // 5. If cancel_contract is true, set status = cancelled
            if (! empty($validated['cancel_contract'])) {
                $lockedContract->update(['status' => 'cancelled']);
            }
        });

        return redirect()->back()->with('success', "To'lov muvaffaqiyatli qaytarildi va kassadan yechildi.");
    }
}
