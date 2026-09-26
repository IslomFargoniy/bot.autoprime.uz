<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransaction;
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
        $registersQuery = CashRegister::with(['branch', 'type'])->orderBy('branch_id')->orderBy('name');
        if ($targetBranchId) {
            $registersQuery->where(function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
            });
        }
        $cashRegisters = $registersQuery->get();

        // 2. Superadmin / Central Registers (one for each type)
        $registerTypes = CashRegisterType::where('is_active', true)->get();
        foreach ($registerTypes as $type) {
            CashRegister::getSuperadminRegisterForType($type->id);
        }
        $superadminRegisters = CashRegister::whereNull('branch_id')
            ->with(['type'])
            ->orderBy('name')
            ->get();

        // 3. Recent Payments
        $paymentsQuery = Payment::with(['student', 'contract', 'cashRegister', 'receivedBy'])
            ->orderBy('created_at', 'desc');
        if ($targetBranchId) {
            $paymentsQuery->where('branch_id', $targetBranchId);
        }
        $payments = $paymentsQuery->paginate(20, ['*'], 'payments_page')->withQueryString();

        // 4. Recent Expenses
        $expensesQuery = Expense::with(['cashRegister', 'category', 'user'])
            ->orderBy('created_at', 'desc');
        if ($targetBranchId) {
            $expensesQuery->where('branch_id', $targetBranchId);
        }
        $expenses = $expensesQuery->paginate(20, ['*'], 'expenses_page')->withQueryString();

        // 5. Cash Transactions (Kassa tarixi / Ledger with Running Balance)
        $transactionsQuery = CashTransaction::with(['cashRegister.branch', 'cashRegister.type', 'user'])
            ->orderBy('transacted_at', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('history_register_id')) {
            $transactionsQuery->where('cash_register_id', $request->input('history_register_id'));
        } elseif ($targetBranchId) {
            $transactionsQuery->whereHas('cashRegister', function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
            });
        }

        if ($request->filled('history_category')) {
            $transactionsQuery->where('category', $request->input('history_category'));
        }

        if ($request->filled('history_from')) {
            $transactionsQuery->whereDate('transacted_at', '>=', $request->input('history_from'));
        }

        if ($request->filled('history_to')) {
            $transactionsQuery->whereDate('transacted_at', '<=', $request->input('history_to'));
        }

        $transactions = $transactionsQuery->paginate(25, ['*'], 'transactions_page')->withQueryString();

        // 6. Cash Transfers
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
            'superadminRegisters' => $superadminRegisters,
            'payments' => $payments,
            'expenses' => $expenses,
            'transactions' => $transactions,
            'transfers' => $transfers,
            'branches' => $branches,
            'expenseCategories' => $expenseCategories,
            'registerTypes' => $registerTypes,
            'students' => $students,
            'contracts' => $activeContracts,
            'filters' => [
                'branch_id' => $targetBranchId,
                'history_register_id' => $request->input('history_register_id'),
                'history_category' => $request->input('history_category'),
                'history_from' => $request->input('history_from'),
                'history_to' => $request->input('history_to'),
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

            $balBefore = (float) $lockedRegister->balance;
            $balAfter = $balBefore + (float) $validated['amount'];

            // Increase register balance
            $lockedRegister->increment('balance', (float) $validated['amount']);

            // Record transaction ledger with running balance
            $lockedRegister->recordTransaction(
                type: 'in',
                category: 'payment',
                amount: (float) $validated['amount'],
                balanceBefore: $balBefore,
                balanceAfter: $balAfter,
                description: "To'lov qabul qilindi: {$contract->student?->full_name} (#{$receiptNumber})",
                reference: $payment,
                userId: $request->user()->id
            );

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

            $expense = Expense::create([
                'branch_id' => $lockedRegister->branch_id ?? Branch::first()?->id ?? 1,
                'cash_register_id' => $lockedRegister->id,
                'expense_category_id' => $validated['expense_category_id'],
                'user_id' => $request->user()->id,
                'amount' => $validated['amount'],
                'description' => $validated['description'],
                'spent_at' => now(),
            ]);

            $balBefore = (float) $lockedRegister->balance;
            $balAfter = $balBefore - (float) $validated['amount'];
            $lockedRegister->decrement('balance', (float) $validated['amount']);

            $cat = ExpenseCategory::find($validated['expense_category_id']);
            $catName = $cat ? $cat->name : 'Xarajat';

            $lockedRegister->recordTransaction(
                type: 'out',
                category: 'expense',
                amount: (float) $validated['amount'],
                balanceBefore: $balBefore,
                balanceAfter: $balAfter,
                description: "Xarajat: {$catName} - {$validated['description']}",
                reference: $expense,
                userId: $request->user()->id
            );
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

            $fromBalBefore = (float) $fromReg->balance;
            $fromBalAfter = $fromBalBefore - (float) $transfer->amount;
            $toBalBefore = (float) $toReg->balance;
            $toBalAfter = $toBalBefore + (float) $transfer->amount;

            $fromReg->decrement('balance', (float) $transfer->amount);
            $toReg->increment('balance', (float) $transfer->amount);

            $transfer->update([
                'status' => 'approved',
                'approved_by_user_id' => $request->user()->id,
            ]);

            $fromReg->recordTransaction(
                type: 'out',
                category: 'transfer_out',
                amount: (float) $transfer->amount,
                balanceBefore: $fromBalBefore,
                balanceAfter: $fromBalAfter,
                description: "Transfer chiqim: {$toReg->name} ga",
                reference: $transfer,
                userId: $request->user()->id
            );

            $toReg->recordTransaction(
                type: 'in',
                category: 'transfer_in',
                amount: (float) $transfer->amount,
                balanceBefore: $toBalBefore,
                balanceAfter: $toBalAfter,
                description: "Transfer kirim: {$fromReg->name} dan",
                reference: $transfer,
                userId: $request->user()->id
            );
        });

        return redirect()->back()->with('success', 'Transfer tasdiqlandi va mablag\' o\'tkazildi.');
    }

    /**
     * Sweep / Empty cash registers to their corresponding Superadmin register by type.
     */
    public function sweepRegisters(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'registers' => 'nullable|array',
            'registers.*.cash_register_id' => 'required|exists:cash_registers,id',
            'registers.*.amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:500',
        ]);

        $items = $validated['registers'] ?? [];

        // If no registers array provided, default to all branch registers with balance > 0
        if (empty($items)) {
            $registersWithBalance = CashRegister::whereNotNull('branch_id')
                ->where('balance', '>', 0)
                ->get();

            foreach ($registersWithBalance as $reg) {
                $items[] = [
                    'cash_register_id' => $reg->id,
                    'amount' => (float) $reg->balance,
                ];
            }
        }

        if (empty($items)) {
            return redirect()->back()->withErrors([
                'sweep' => "Bo'shatish uchun ijobiy balansga ega kassalar topilmadi.",
            ]);
        }

        $transferredCount = 0;
        $totalSweptAmount = 0.0;

        DB::transaction(function () use ($items, $request, &$transferredCount, &$totalSweptAmount) {
            foreach ($items as $item) {
                $amount = (float) $item['amount'];
                if ($amount <= 0) {
                    continue;
                }

                $branchRegister = CashRegister::where('id', $item['cash_register_id'])
                    ->lockForUpdate()
                    ->first();

                if (! $branchRegister) {
                    continue;
                }

                // If it is already a superadmin register, skip
                if ($branchRegister->branch_id === null) {
                    continue;
                }

                $amountToTransfer = min((float) $branchRegister->balance, $amount);
                if ($amountToTransfer <= 0) {
                    continue;
                }

                $superadminRegister = CashRegister::getSuperadminRegisterForType($branchRegister->cash_register_type_id);
                $lockedSuperadmin = CashRegister::where('id', $superadminRegister->id)
                    ->lockForUpdate()
                    ->first();

                $branchBalBefore = (float) $branchRegister->balance;
                $branchBalAfter = $branchBalBefore - $amountToTransfer;

                $superBalBefore = (float) $lockedSuperadmin->balance;
                $superBalAfter = $superBalBefore + $amountToTransfer;

                $branchRegister->update(['balance' => $branchBalAfter]);
                $lockedSuperadmin->update(['balance' => $superBalAfter]);

                $transfer = CashTransfer::create([
                    'from_cash_register_id' => $branchRegister->id,
                    'to_cash_register_id' => $lockedSuperadmin->id,
                    'amount' => $amountToTransfer,
                    'sent_by_user_id' => $request->user()->id,
                    'approved_by_user_id' => $request->user()->id,
                    'status' => 'approved',
                    'notes' => $request->input('notes') ?: "Kassani bo'shatish (Superadmin transferi)",
                ]);

                $branchRegister->recordTransaction(
                    type: 'out',
                    category: 'sweep_out',
                    amount: $amountToTransfer,
                    balanceBefore: $branchBalBefore,
                    balanceAfter: $branchBalAfter,
                    description: "Kassani bo'shatish: {$lockedSuperadmin->name} ga o'tkazildi",
                    reference: $transfer,
                    userId: $request->user()->id
                );

                $lockedSuperadmin->recordTransaction(
                    type: 'in',
                    category: 'sweep_in',
                    amount: $amountToTransfer,
                    balanceBefore: $superBalBefore,
                    balanceAfter: $superBalAfter,
                    description: "Kassa bo'shatishdan qabul: {$branchRegister->name} dan",
                    reference: $transfer,
                    userId: $request->user()->id
                );

                $transferredCount++;
                $totalSweptAmount += $amountToTransfer;
            }
        });

        if ($transferredCount === 0) {
            return redirect()->back()->withErrors([
                'sweep' => "Mablag' o'tkazilmadi. Kassalarda yetarli balans mavjud emas.",
            ]);
        }

        $formattedSum = number_format($totalSweptAmount, 0, '', ' ');
        return redirect()->back()->with('success', "Kassalar muvaffaqiyatli bo'shatildi! Jami {$formattedSum} UZS Superadmin kassalariga o'tkazildi.");
    }

    /**
     * Legacy toggleShift stub (no-op redirect).
     */
    public function toggleShift(): RedirectResponse
    {
        return redirect()->back()->with('success', 'Smenalar tizimi bekor qilingan.');
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
                    $balBefore = (float) $lockedRegister->balance;
                    $balAfter = $balBefore + (float) $expense->amount;
                    $lockedRegister->increment('balance', (float) $expense->amount);
                    $lockedRegister->recordTransaction(
                        type: 'in',
                        category: 'refund',
                        amount: (float) $expense->amount,
                        balanceBefore: $balBefore,
                        balanceAfter: $balAfter,
                        description: "O'chirilgan xarajat qaytarildi: {$expense->description}",
                        reference: $expense,
                        userId: auth()->id()
                    );
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
                        $balBefore = (float) $lockedRegister->balance;
                        $balAfter = $balBefore + (float) $payment->amount;
                        $lockedRegister->increment('balance', (float) $payment->amount);
                        $lockedRegister->recordTransaction(
                            type: 'in',
                            category: 'refund',
                            amount: (float) $payment->amount,
                            balanceBefore: $balBefore,
                            balanceAfter: $balAfter,
                            description: "Qaytarilgan to'lov (#{$payment->receipt_number})",
                            reference: $payment,
                            userId: auth()->id()
                        );
                    }
                    Expense::where('description', 'like', "%{$payment->receipt_number}%")->delete();
                } else {
                    // Deleting an income payment deducts the money from the register
                    if ($lockedRegister) {
                        if ((float) $lockedRegister->balance < (float) $payment->amount) {
                            throw new \Exception("Kassada yetarli mablag' mavjud emas. To'lovni bekor qilish uchun kamida ".number_format((float) $payment->amount, 0, '', ' ')." UZS bo'lishi kerak.");
                        }
                        $balBefore = (float) $lockedRegister->balance;
                        $balAfter = $balBefore - (float) $payment->amount;
                        $lockedRegister->decrement('balance', (float) $payment->amount);
                        $lockedRegister->recordTransaction(
                            type: 'out',
                            category: 'refund',
                            amount: (float) $payment->amount,
                            balanceBefore: $balBefore,
                            balanceAfter: $balAfter,
                            description: "Bekor qilingan to'lov (#{$payment->receipt_number})",
                            reference: $payment,
                            userId: auth()->id()
                        );
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
