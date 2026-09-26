<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashShift;
use App\Models\CashTransfer;
use App\Models\Contract;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Payment;
use App\Models\Student;
use App\Models\VehicleMaintenance;
use App\Services\BranchSessionService;
use App\Services\TelegramService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        // 1. Cash Registers
        $registersQuery = CashRegister::with(['branch', 'type', 'openShift.openedBy'])->orderBy('name');
        if ($targetBranchId) {
            $registersQuery->where(function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
            });
        }
        $cashRegisters = $registersQuery->get();

        // 2. Recent Payments
        $paymentsQuery = Payment::with(['student', 'contract', 'cashRegister', 'receivedBy'])
            ->orderBy('created_at', 'desc');
        if ($targetBranchId) {
            $paymentsQuery->where('branch_id', $targetBranchId);
        }
        $payments = $paymentsQuery->paginate(20, ['*'], 'payments_page')->withQueryString();

        // 3. Recent Expenses
        $expensesQuery = Expense::with(['cashRegister', 'category', 'user'])
            ->orderBy('created_at', 'desc');
        if ($targetBranchId) {
            $expensesQuery->where('branch_id', $targetBranchId);
        }
        $expenses = $expensesQuery->paginate(20, ['*'], 'expenses_page')->withQueryString();

        // 4. Cash Shifts
        $shiftsQuery = CashShift::with(['cashRegister', 'openedBy', 'closedBy'])
            ->orderBy('created_at', 'desc');
        if ($targetBranchId) {
            $shiftsQuery->whereHas('cashRegister', function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            });
        }
        $shifts = $shiftsQuery->paginate(15, ['*'], 'shifts_page')->withQueryString();

        // 5. Cash Transfers
        $transfersQuery = CashTransfer::with(['fromCashRegister', 'toCashRegister', 'transferredBy', 'approvedBy'])
            ->orderBy('created_at', 'desc');
        if ($targetBranchId) {
            $transfersQuery->where(function ($q) use ($targetBranchId) {
                $q->whereHas('fromCashRegister', function ($sub) use ($targetBranchId) {
                    $sub->where('branch_id', $targetBranchId);
                })->orWhereHas('toCashRegister', function ($sub) use ($targetBranchId) {
                    $sub->where('branch_id', $targetBranchId);
                });
            });
        }
        $transfers = $transfersQuery->paginate(15, ['*'], 'transfers_page')->withQueryString();

        // Select lists
        $branches = Branch::where('status', 'active')->get();
        $expenseCategories = ExpenseCategory::where('is_active', true)->get();
        $registerTypes = CashRegisterType::where('is_active', true)->get();

        $students = Student::orderBy('full_name')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->select(['id', 'full_name', 'phone'])
            ->get();

        $activeContracts = Contract::where('status', 'active')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->select(['id', 'student_id', 'contract_number', 'final_amount', 'paid_amount', 'debt_amount'])
            ->get();

        return Inertia::render('Admin/Finance/Index', [
            'cashRegisters' => $cashRegisters,
            'payments' => $payments,
            'expenses' => $expenses,
            'shifts' => $shifts,
            'transfers' => $transfers,
            'branches' => $branches,
            'expenseCategories' => $expenseCategories,
            'registerTypes' => $registerTypes,
            'students' => $students,
            'contracts' => $activeContracts,
            'filters' => [
                'branch_id' => $targetBranchId,
            ],
        ]);
    }

    /**
     * Store new payment with strict register type validation.
     */
    public function storePayment(Request $request, TelegramService $telegramService): RedirectResponse
    {
        $validated = $request->validate([
            'contract_id' => 'required|exists:contracts,id',
            'cash_register_id' => 'required|exists:cash_registers,id',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|in:cash,card_click,bank_transfer',
            'notes' => 'nullable|string',
        ]);

        $cashRegister = CashRegister::with('type')->findOrFail($validated['cash_register_id']);

        // Strict register-type matching
        $registerTypeCode = $cashRegister->type?->code;
        if ($registerTypeCode && $registerTypeCode !== $validated['payment_method']) {
            return redirect()->back()->withErrors([
                'cash_register_id' => "Tanlangan kassa turi ({$registerTypeCode}) to'lov usuliga ({$validated['payment_method']}) mos emas.",
            ]);
        }

        $contract = Contract::with('student')->findOrFail($validated['contract_id']);
        $payment = null;

        DB::transaction(function () use ($validated, $cashRegister, $contract, $request, &$payment) {
            $lockedRegister = CashRegister::where('id', $cashRegister->id)->lockForUpdate()->first();

            $receiptNumber = 'REC-'.date('Ymd').'-'.str_pad((string) (Payment::count() + 1), 4, '0', STR_PAD_LEFT);

            $payment = Payment::create([
                'branch_id' => $contract->branch_id ?? $lockedRegister->branch_id ?? Branch::first()?->id ?? 1,
                'contract_id' => $contract->id,
                'student_id' => $contract->student_id,
                'cash_register_id' => $lockedRegister->id,
                'received_by_user_id' => $request->user()->id,
                'amount' => $validated['amount'],
                'payment_type' => 'contract_tuition',
                'payment_method' => $validated['payment_method'],
                'receipt_number' => $receiptNumber,
                'paid_at' => now(),
                'comment' => $validated['notes'] ?? null,
            ]);

            // Increase register balance
            $lockedRegister->increment('balance', (float) $validated['amount']);

            // Recalculate contract finances
            $contract->recalculateFinances();
        });

        if ($payment) {
            $telegramService->sendPaymentReceiptNotification($payment);
        }

        return redirect()->back()->with('success', "To'lov qabul qilindi. Chek: #{$payment?->receipt_number}");
    }

    /**
     * Store new expense from cash register.
     */
    public function storeExpense(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:1',
            'description' => 'required|string|max:500',
        ]);

        $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);

        if ((float) $cashRegister->balance < (float) $validated['amount']) {
            return redirect()->back()->withErrors([
                'amount' => "Kassada mablag' yetarli emas. Hozirgi balans: {$cashRegister->balance} UZS",
            ]);
        }

        DB::transaction(function () use ($validated, $cashRegister, $request) {
            $lockedRegister = CashRegister::where('id', $cashRegister->id)->lockForUpdate()->first();

            Expense::create([
                'branch_id' => $lockedRegister->branch_id ?? Branch::first()?->id ?? 1,
                'cash_register_id' => $lockedRegister->id,
                'expense_category_id' => $validated['expense_category_id'],
                'user_id' => $request->user()->id,
                'amount' => $validated['amount'],
                'description' => $validated['description'],
                'spent_at' => now(),
            ]);

            $lockedRegister->decrement('balance', (float) $validated['amount']);
        });

        return redirect()->back()->with('success', 'Xarajat muvaffaqiyatli saqlandi.');
    }

    /**
     * Create cash transfer from one register to another.
     */
    public function createTransfer(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'from_cash_register_id' => 'required|exists:cash_registers,id|different:to_cash_register_id',
            'to_cash_register_id' => 'required|exists:cash_registers,id',
            'amount' => 'required|numeric|min:1',
            'notes' => 'nullable|string',
        ]);

        $fromRegister = CashRegister::findOrFail($validated['from_cash_register_id']);
        if ((float) $fromRegister->balance < (float) $validated['amount']) {
            return redirect()->back()->withErrors([
                'amount' => "Chiqim kassasida mablag' yetarli emas (Mavjud: {$fromRegister->balance} UZS).",
            ]);
        }

        CashTransfer::create([
            'from_cash_register_id' => $validated['from_cash_register_id'],
            'to_cash_register_id' => $validated['to_cash_register_id'],
            'sent_by_user_id' => $request->user()->id,
            'amount' => $validated['amount'],
            'status' => 'pending',
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Transfer so\'rovi yuborildi. Tasdiqlanishi kutilmoqda.');
    }

    /**
     * Approve cash transfer.
     */
    public function approveTransfer(Request $request, CashTransfer $transfer): RedirectResponse
    {
        if ($transfer->status !== 'pending') {
            return redirect()->back()->withErrors(['transfer' => 'Ushbu transfer allaqachon ko\'rib chiqilgan.']);
        }

        DB::transaction(function () use ($transfer, $request) {
            $fromReg = CashRegister::where('id', $transfer->from_cash_register_id)->lockForUpdate()->first();
            $toReg = CashRegister::where('id', $transfer->to_cash_register_id)->lockForUpdate()->first();

            if ((float) $fromReg->balance < (float) $transfer->amount) {
                throw new \Exception("Chiqim kassasida yetarli mablag' mavjud emas.");
            }

            $fromReg->decrement('balance', (float) $transfer->amount);
            $toReg->increment('balance', (float) $transfer->amount);

            $transfer->update([
                'status' => 'approved',
                'approved_by_user_id' => $request->user()->id,
            ]);
        });

        return redirect()->back()->with('success', 'Transfer tasdiqlandi va mablag\' o\'tkazildi.');
    }

    /**
     * Open or close a CashShift for cash registers.
     */
    public function toggleShift(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'action' => 'required|in:open,close',
            'opening_balance' => 'nullable|numeric|min:0',
            'closing_balance' => 'nullable|numeric|min:0',
            'note' => 'nullable|string|max:500',
        ]);

        $reg = CashRegister::findOrFail($validated['cash_register_id']);

        if ($validated['action'] === 'open') {
            $existingShift = CashShift::where('cash_register_id', $reg->id)->where('status', 'open')->first();
            if ($existingShift) {
                return redirect()->back()->withErrors([
                    'shift' => 'Ushbu kassa uchun smena allaqachon ochilgan. Yangi smena ochishdan oldin amaldagi smenani yoping.',
                ]);
            }

            CashShift::create([
                'cash_register_id' => $reg->id,
                'user_id' => $request->user()->id,
                'opening_balance' => $validated['opening_balance'] ?? $reg->balance,
                'opened_at' => now(),
                'status' => 'open',
                'note' => $validated['note'] ?? null,
            ]);

            return redirect()->back()->with('success', 'Kassa smenasi muvaffaqiyatli ochildi.');
        }

        // Close
        $openShift = CashShift::where('cash_register_id', $reg->id)->where('status', 'open')->latest()->first();
        if (! $openShift) {
            return redirect()->back()->withErrors([
                'shift' => 'Ushbu kassa uchun ochiq smena topilmadi. Avval smenani oching.',
            ]);
        }

        $totalIncome = Payment::where('cash_register_id', $reg->id)
            ->where('created_at', '>=', $openShift->opened_at)
            ->sum('amount');

        $totalExpense = Expense::where('cash_register_id', $reg->id)
            ->where('created_at', '>=', $openShift->opened_at)
            ->sum('amount');

        $openShift->update([
            'closing_balance' => $validated['closing_balance'] ?? $reg->balance,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'closed_at' => now(),
            'status' => 'closed',
            'note' => $validated['note'] ?? $openShift->note,
        ]);

        return redirect()->back()->with('success', 'Kassa smenasi muvaffaqiyatli yopildi.');
    }

    /**
     * Delete an expense and refund the money back to the cash register.
     */
    public function destroyExpense(Expense $expense): RedirectResponse
    {
        DB::transaction(function () use ($expense) {
            if ($expense->cash_register_id) {
                $lockedRegister = CashRegister::where('id', $expense->cash_register_id)->lockForUpdate()->first();
                if ($lockedRegister) {
                    $lockedRegister->increment('balance', (float) $expense->amount);
                }
            }

            // If this expense is attached to vehicle maintenance, reset expense_id on maintenance
            VehicleMaintenance::where('expense_id', $expense->id)->update(['expense_id' => null]);

            $expense->delete();
        });

        return redirect()->back()->with('success', "Xarajat o'chirildi va mablag' kassaga qaytarildi.");
    }

    /**
     * Delete a payment, adjust the cash register balance, and recalculate contract finances.
     */
    public function destroyPayment(Payment $payment): RedirectResponse
    {
        try {
            DB::transaction(function () use ($payment) {
                $lockedRegister = $payment->cash_register_id
                    ? CashRegister::where('id', $payment->cash_register_id)->lockForUpdate()->first()
                    : null;

                if ($payment->payment_type === 'refund') {
                    // Deleting a refund payment returns the money to the register
                    if ($lockedRegister) {
                        $lockedRegister->increment('balance', (float) $payment->amount);
                    }
                    Expense::where('description', 'like', "%{$payment->receipt_number}%")->delete();
                } else {
                    // Deleting an income payment deducts the money from the register
                    if ($lockedRegister) {
                        if ((float) $lockedRegister->balance < (float) $payment->amount) {
                            throw new \Exception("Kassada yetarli mablag' mavjud emas. To'lovni bekor qilish uchun kamida ".number_format((float) $payment->amount, 0, '', ' ')." UZS bo'lishi kerak.");
                        }
                        $lockedRegister->decrement('balance', (float) $payment->amount);
                    }
                }

                $contract = $payment->contract;
                $payment->delete();

                if ($contract) {
                    $contract->recalculateFinances();
                }
            });
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['payment' => $e->getMessage()]);
        }

        return redirect()->back()->with('success', "To'lov o'chirildi, kassa va shartnoma hisoblari qayta yangilandi.");
    }
}
