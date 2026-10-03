<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\BranchScopedValidationRules;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransaction;
use App\Models\CashTransfer;
use App\Models\Contract;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FinancialHistory;
use App\Models\Payment;
use App\Models\Student;
use App\Models\VehicleMaintenance;
use App\Services\BranchSessionService;
use App\Services\DocumentNumberService;
use App\Services\TelegramService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class FinanceController extends Controller
{
    use BranchScopedValidationRules;

    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        $isBranchRestricted = $request->user()->isBranchRestricted();

        // 1. Cash Registers (branch staff only see their own branch registers)
        $registersQuery = CashRegister::with(['branch', 'type'])->orderBy('branch_id')->orderBy('name');
        if ($targetBranchId) {
            $registersQuery->where(function ($q) use ($targetBranchId, $isBranchRestricted) {
                $q->where('branch_id', $targetBranchId);
                if (! $isBranchRestricted) {
                    $q->orWhereNull('branch_id');
                }
            });
        }
        $cashRegisters = $registersQuery->get();

        // 2. Superadmin / Central Registers (one for each type)
        $registerTypes = CashRegisterType::where('is_active', true)->get();
        $existingSuperadminTypeIds = CashRegister::whereNull('branch_id')->pluck('cash_register_type_id')->all();
        foreach ($registerTypes as $type) {
            if (! in_array($type->id, $existingSuperadminTypeIds, true)) {
                CashRegister::getSuperadminRegisterForType($type->id);
            }
        }
        $superadminRegisters = CashRegister::whereNull('branch_id')
            ->with(['type'])
            ->orderBy('name')
            ->get();
        if ($isBranchRestricted) {
            // Central registers stay selectable as transfer targets without exposing their balance.
            $superadminRegisters->each->makeHidden('balance');
        }

        // 3. Recent Payments
        $paymentsQuery = Payment::with(['student', 'contract', 'cashRegister', 'receivedBy'])
            ->orderBy('created_at', 'desc');
        if ($targetBranchId) {
            $paymentsQuery->where('branch_id', $targetBranchId);
        }

        // 4. Recent Expenses
        $expensesQuery = Expense::with(['cashRegister', 'category', 'user'])
            ->orderBy('created_at', 'desc');
        if ($targetBranchId) {
            $expensesQuery->where('branch_id', $targetBranchId);
        }

        // 5. Cash Transactions (Kassa tarixi / Ledger with Running Balance)
        $transactionsQuery = CashTransaction::with(['cashRegister.branch', 'cashRegister.type', 'user'])
            ->orderBy('transacted_at', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('history_register_id')) {
            $transactionsQuery->where('cash_register_id', $request->input('history_register_id'));
        }
        if ($targetBranchId) {
            $transactionsQuery->whereHas('cashRegister', function ($q) use ($targetBranchId, $isBranchRestricted) {
                $q->where(function ($scope) use ($targetBranchId, $isBranchRestricted) {
                    $scope->where('branch_id', $targetBranchId);
                    if (! $isBranchRestricted) {
                        $scope->orWhereNull('branch_id');
                    }
                });
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

        $perPage = $this->perPage($request, fn () => max(
            $paymentsQuery->count(),
            $expensesQuery->count(),
            $transactionsQuery->count(),
            $transfersQuery->count(),
            1
        ));

        $payments = $paymentsQuery->paginate($perPage, ['*'], 'payments_page')->withQueryString();
        $expenses = $expensesQuery->paginate($perPage, ['*'], 'expenses_page')->withQueryString();
        $transactions = $transactionsQuery->paginate($perPage, ['*'], 'transactions_page')->withQueryString();
        $transfers = $transfersQuery->paginate($perPage, ['*'], 'transfers_page')->withQueryString();
        $this->attachReceiptUrls($transactions->getCollection());
        $transfers->getCollection()->each(function (CashTransfer $transfer) use ($request): void {
            $transfer->setAttribute('can_review', $transfer->status === 'pending'
                && $request->user()->can('cash_transfers.approve')
                && $this->isReviewableBy($request, $transfer)
                && ! $this->isOwnTransfer($request, $transfer));
        });

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
                'per_page' => $request->query('per_page'),
                'history_register_id' => $request->input('history_register_id'),
                'history_category' => $request->input('history_category'),
                'history_from' => $request->input('history_from'),
                'history_to' => $request->input('history_to'),
            ],
        ]);
    }

    /**
     * Ledger rows that came from a payment or an expense get the address of its
     * receipt. Two queries cover the whole page, and a record deleted since then
     * simply has no receipt any more.
     *
     * @param  Collection<int, CashTransaction>  $transactions
     */
    private function attachReceiptUrls(Collection $transactions): void
    {
        $idsOf = fn (string $model): array => $transactions
            ->where('reference_type', $model)
            ->pluck('reference_id')
            ->unique()
            ->all();

        $payments = array_flip(Payment::whereIn('id', $idsOf(Payment::class))->pluck('id')->all());
        $expenses = array_flip(Expense::whereIn('id', $idsOf(Expense::class))->pluck('id')->all());

        $transactions->each(function (CashTransaction $transaction) use ($payments, $expenses): void {
            $url = match (true) {
                $transaction->reference_type === Payment::class && isset($payments[$transaction->reference_id]) => route('finance.payment-receipt', $transaction->reference_id),
                $transaction->reference_type === Expense::class && isset($expenses[$transaction->reference_id]) => route('finance.expense-receipt', $transaction->reference_id),
                default => null,
            };

            $transaction->setAttribute('receipt_url', $url);
        });
    }

    /**
     * Store new payment with strict register type validation.
     */
    public function storePayment(Request $request, TelegramService $telegramService): RedirectResponse
    {
        $validated = $request->validate([
            'contract_id' => ['required', $this->existsInUserBranch($request, 'contracts')],
            'cash_register_id' => ['required', $this->cashRegisterInUserBranch($request)],
            'amount' => 'required|numeric|min:1|max:9999999999',
            'payment_method' => 'required|in:cash,card_click,bank_transfer',
            'notes' => 'nullable|string',
        ]);

        $cashRegister = CashRegister::with('type')->findOrFail($validated['cash_register_id']);

        if ($mismatch = $cashRegister->paymentMethodMismatchMessage($validated['payment_method'])) {
            return redirect()->back()->withErrors(['cash_register_id' => $mismatch]);
        }

        $contract = Contract::with('student')->findOrFail($validated['contract_id']);
        $this->ensureCanSeeStudent($request, $contract->student);
        if ($contract->status === 'cancelled') {
            return redirect()->back()->withErrors([
                'contract_id' => "Bekor qilingan shartnomaga to'lov qabul qilib bo'lmaydi.",
            ]);
        }

        $payment = null;

        DB::transaction(function () use ($validated, $cashRegister, &$contract, $request, &$payment) {
            // Serialize payments per contract so recalculated totals include every committed payment.
            $contract = Contract::with('student')->whereKey($contract->id)->lockForUpdate()->first();
            $lockedRegister = CashRegister::where('id', $cashRegister->id)->lockForUpdate()->first();

            $receiptNumber = DocumentNumberService::nextReceiptNumber();

            $payment = Payment::create([
                'branch_id' => $contract->branch_id ?? $lockedRegister->branch_id ?? Branch::first()->id ?? 1,
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

            // Deposit into register and record ledger transaction
            $lockedRegister->deposit(
                amount: (float) $validated['amount'],
                category: 'payment',
                description: "To'lov qabul qilindi: {$contract->student?->full_name} (#{$receiptNumber})",
                reference: $payment,
                userId: $request->user()->id
            );

            // Recalculate contract finances
            $contract->recalculateFinances();

            // Record financial history for the student
            if ($contract->student) {
                FinancialHistory::recordForStudent($contract->student, [
                    'type' => 'credit',
                    'category' => 'tuition_payment',
                    'amount' => (float) $validated['amount'],
                    'balance_before' => (float) ($contract->debt_amount + (float) $validated['amount']),
                    'balance_after' => (float) $contract->debt_amount,
                    'payment_method' => $validated['payment_method'],
                    'description' => "Shartnoma to'lovi qabul qilindi: #{$contract->contract_number} (Chek #{$receiptNumber})",
                    'reference' => $payment,
                    'performed_by_user_id' => $request->user()->id,
                    'transacted_at' => now(),
                ]);
            }
        });

        if ($payment) {
            $telegramService->sendPaymentReceiptNotification($payment);
        }

        Inertia::flash('receipt_url', route('finance.payment-receipt', $payment));

        return redirect()->back()->with('success', "To'lov qabul qilindi. Chek: #{$payment?->receipt_number}");
    }

    /**
     * Store new expense from cash register.
     */
    public function storeExpense(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'cash_register_id' => ['required', $this->cashRegisterInUserBranch($request)],
            'expense_category_id' => 'required|exists:expense_categories,id',
            'amount' => 'required|numeric|min:1|max:9999999999',
            'description' => 'required|string|max:500',
        ]);

        $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);

        if ((float) $cashRegister->balance < (float) $validated['amount']) {
            return redirect()->back()->withErrors([
                'amount' => "Kassada mablag' yetarli emas. Hozirgi balans: {$cashRegister->balance} UZS",
            ]);
        }

        $expense = null;

        DB::transaction(function () use ($validated, $cashRegister, $request, &$expense) {
            $lockedRegister = CashRegister::where('id', $cashRegister->id)->lockForUpdate()->first();

            $expense = Expense::create([
                'branch_id' => $lockedRegister->branch_id ?? Branch::first()->id ?? 1,
                'cash_register_id' => $lockedRegister->id,
                'expense_category_id' => $validated['expense_category_id'],
                'user_id' => $request->user()->id,
                'amount' => $validated['amount'],
                'description' => $validated['description'],
                'spent_at' => now(),
            ]);

            $cat = ExpenseCategory::find($validated['expense_category_id']);
            $catName = $cat ? $cat->name : 'Xarajat';

            $lockedRegister->withdraw(
                amount: (float) $validated['amount'],
                category: 'expense',
                description: "Xarajat: {$catName} - {$validated['description']}",
                reference: $expense,
                userId: $request->user()->id
            );
        });

        Inertia::flash('receipt_url', route('finance.expense-receipt', $expense));

        return redirect()->back()->with('success', 'Xarajat muvaffaqiyatli saqlandi.');
    }

    /**
     * Create cash transfer from one register to another.
     */
    public function createTransfer(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'from_cash_register_id' => ['required', $this->cashRegisterInUserBranch($request), 'different:to_cash_register_id'],
            'to_cash_register_id' => 'required|exists:cash_registers,id',
            'amount' => 'required|numeric|min:1|max:9999999999',
            'notes' => 'nullable|string',
        ]);

        $fromRegister = CashRegister::findOrFail($validated['from_cash_register_id']);
        $toRegister = CashRegister::findOrFail($validated['to_cash_register_id']);

        if ((float) $fromRegister->balance < (float) $validated['amount']) {
            return redirect()->back()->withErrors([
                'amount' => "Chiqim kassasida mablag' yetarli emas (Mavjud: ".number_format((float) $fromRegister->balance, 0, '', ' ').' UZS).',
            ]);
        }

        // O'z kassalari o'rtasida (bir xil filial yoki ikkalasi ham umumiy kassa) bo'lsa, avtomatik tasdiqlanadi
        $isOwnRegisters = ($fromRegister->branch_id === $toRegister->branch_id);

        if ($isOwnRegisters) {
            try {
                DB::transaction(function () use ($validated, $fromRegister, $toRegister, $request) {
                    $transfer = CashTransfer::create([
                        'from_cash_register_id' => $fromRegister->id,
                        'to_cash_register_id' => $toRegister->id,
                        'sent_by_user_id' => $request->user()->id,
                        'approved_by_user_id' => $request->user()->id,
                        'amount' => $validated['amount'],
                        'status' => 'approved',
                        'notes' => $validated['notes'] ?? null,
                    ]);

                    $fromRegister->transferTo(
                        targetRegister: $toRegister,
                        amount: (float) $validated['amount'],
                        category: 'transfer',
                        reference: $transfer,
                        userId: $request->user()->id
                    );
                });
            } catch (InvalidArgumentException $e) {
                return redirect()->back()->withErrors(['amount' => $e->getMessage()]);
            }

            return redirect()->back()->with('success', 'Kassalararo transfer muvaffaqiyatli amalga oshirildi va avtomatik tasdiqlandi.');
        }

        // Filiallararo (boshqa filial kassasiga) o'tkazma bo'lsa, tasdiqlash uchun kutish holatida yuboriladi
        CashTransfer::create([
            'from_cash_register_id' => $validated['from_cash_register_id'],
            'to_cash_register_id' => $validated['to_cash_register_id'],
            'sent_by_user_id' => $request->user()->id,
            'amount' => $validated['amount'],
            'status' => 'pending',
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Filiallararo transfer so\'rovi yuborildi. Qabul qiluvchi filial tasdiqlashi kutilmoqda.');
    }

    /**
     * Four-eyes rule: the sender of a transfer may not approve or reject it
     * (superadmins excepted, there is nobody above them to approve).
     */
    private function isOwnTransfer(Request $request, CashTransfer $transfer): bool
    {
        $user = $request->user();

        return ! $user->isSuperAdmin() && $transfer->sent_by_user_id === $user->id;
    }

    /**
     * Who may review a pending transfer: a transfer into a central register
     * (e.g. a register sweep) is settled by a superadmin, a transfer between
     * branches by the receiving branch (or a superadmin).
     */
    private function isReviewableBy(Request $request, CashTransfer $transfer): bool
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return true;
        }

        $receivingBranchId = $transfer->toCashRegister?->branch_id;

        return $receivingBranchId !== null && (int) $receivingBranchId === (int) $user->branch_id;
    }

    /**
     * Approve cash transfer.
     */
    public function approveTransfer(Request $request, CashTransfer $transfer): RedirectResponse
    {
        if (! $this->isReviewableBy($request, $transfer)) {
            return redirect()->back()->withErrors(['transfer' => 'Bu o\'tkazmani faqat qabul qiluvchi filial yoki Superadmin tasdiqlashi mumkin.']);
        }

        if ($this->isOwnTransfer($request, $transfer)) {
            return redirect()->back()->withErrors(['transfer' => 'O\'zingiz yuborgan o\'tkazmani boshqa xodim tasdiqlashi kerak.']);
        }

        try {
            $approved = DB::transaction(function () use ($transfer, $request) {
                // Re-read under lock so a double click cannot move the money twice.
                $lockedTransfer = CashTransfer::whereKey($transfer->id)->lockForUpdate()->first();
                if (! $lockedTransfer || $lockedTransfer->status !== 'pending') {
                    return false;
                }

                $fromReg = CashRegister::findOrFail($lockedTransfer->from_cash_register_id);
                $toReg = CashRegister::findOrFail($lockedTransfer->to_cash_register_id);

                $lockedTransfer->update([
                    'status' => 'approved',
                    'approved_by_user_id' => $request->user()->id,
                ]);

                $isSweep = $toReg->branch_id === null || str_contains(mb_strtolower($lockedTransfer->notes ?? ''), "bo'shatish");

                $fromReg->transferTo(
                    targetRegister: $toReg,
                    amount: (float) $lockedTransfer->amount,
                    category: $isSweep ? 'sweep' : 'transfer',
                    reference: $lockedTransfer,
                    userId: $request->user()->id
                );

                return true;
            });
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['transfer' => $e->getMessage()]);
        }

        if (! $approved) {
            return redirect()->back()->withErrors(['transfer' => 'Ushbu transfer allaqachon ko\'rib chiqilgan.']);
        }

        return redirect()->back()->with('success', 'Transfer tasdiqlandi va mablag\' o\'tkazildi.');
    }

    /**
     * Reject a pending cash transfer; no money moves.
     */
    public function rejectTransfer(Request $request, CashTransfer $transfer): RedirectResponse
    {
        if (! $this->isReviewableBy($request, $transfer)) {
            return redirect()->back()->withErrors(['transfer' => 'Bu o\'tkazmani faqat qabul qiluvchi filial yoki Superadmin ko\'rib chiqishi mumkin.']);
        }

        if ($this->isOwnTransfer($request, $transfer)) {
            return redirect()->back()->withErrors(['transfer' => 'O\'zingiz yuborgan o\'tkazmani boshqa xodim ko\'rib chiqishi kerak.']);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $rejected = DB::transaction(function () use ($transfer, $request, $validated) {
            $lockedTransfer = CashTransfer::whereKey($transfer->id)->lockForUpdate()->first();
            if (! $lockedTransfer || $lockedTransfer->status !== 'pending') {
                return false;
            }

            $reason = trim($validated['reason'] ?? '');
            $notes = $lockedTransfer->notes;
            if ($reason !== '') {
                $notes = $notes ? "{$notes} | Rad etish sababi: {$reason}" : "Rad etish sababi: {$reason}";
            }

            $lockedTransfer->update([
                'status' => 'rejected',
                'approved_by_user_id' => $request->user()->id,
                'notes' => $notes,
            ]);

            return true;
        });

        if (! $rejected) {
            return redirect()->back()->withErrors(['transfer' => 'Ushbu transfer allaqachon ko\'rib chiqilgan.']);
        }

        return redirect()->back()->with('success', 'Transfer rad etildi.');
    }

    /**
     * Sweep / Empty cash registers to their corresponding Superadmin register by type.
     */
    public function sweepRegisters(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'registers' => 'nullable|array',
            'registers.*.cash_register_id' => 'required|exists:cash_registers,id',
            'registers.*.amount' => 'required|numeric|min:0.01|max:9999999999',
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

                // If user is not superadmin, they can only sweep registers of their own branch
                $user = $request->user();
                if (! $user->isSuperAdmin() && (int) $branchRegister->branch_id !== (int) $user->branch_id) {
                    continue;
                }

                // If it is already a superadmin register, skip
                if ($branchRegister->branch_id === null) {
                    continue;
                }

                $pendingSum = (float) CashTransfer::where('from_cash_register_id', $branchRegister->id)
                    ->where('status', 'pending')
                    ->sum('amount');
                $availableBalance = (float) $branchRegister->balance - $pendingSum;
                if ($availableBalance <= 0) {
                    continue;
                }

                $amountToTransfer = min($availableBalance, $amount);
                if ($amountToTransfer <= 0) {
                    continue;
                }

                $superadminRegister = CashRegister::getSuperadminRegisterForType($branchRegister->cash_register_type_id);

                CashTransfer::create([
                    'from_cash_register_id' => $branchRegister->id,
                    'to_cash_register_id' => $superadminRegister->id,
                    'amount' => $amountToTransfer,
                    'sent_by_user_id' => $request->user()->id,
                    'approved_by_user_id' => null,
                    'status' => 'pending',
                    'notes' => $request->input('notes') ?: "Kassani bo'shatish (Superadmin tasdig'i kutilmoqda)",
                ]);

                $transferredCount++;
                $totalSweptAmount += $amountToTransfer;
            }
        });

        if ($transferredCount === 0) {
            return redirect()->back()->withErrors([
                'sweep' => "Mablag' o'tkazilmadi. Kassalarda yetarli balans mavjud emas yoki avvalgi so'rov hali tasdiqlanmagan.",
            ]);
        }

        $formattedSum = number_format($totalSweptAmount, 0, '', ' ');

        return redirect()->back()->with('success', "Kassa bo'shatish so'rovi yuborildi! Jami {$formattedSum} UZS Superadmin tasdiqlashi uchun kutish holatiga o'tkazildi.");
    }

    /**
     * Printable payment receipt (80 mm thermal layout, also readable on A4).
     */
    public function paymentReceipt(Request $request, Payment $payment): View
    {
        $this->ensureCanSeeStudent($request, $payment->student);

        $payment->load(['student', 'contract.contractType', 'cashRegister', 'receivedBy', 'branch']);

        return view('receipts.payment', [
            'payment' => $payment,
            'branch' => $payment->branch,
            'number' => $payment->receipt_number,
            'amount' => $payment->amount,
            'dateTime' => ($payment->paid_at ?? $payment->created_at)?->format('Y-m-d H:i'),
            'isRefund' => $payment->payment_type === 'refund',
            'methodLabel' => match ($payment->payment_method) {
                'cash' => 'Naqd pul',
                'card_click' => 'Karta / Click / Payme',
                'bank_transfer' => 'Bank o\'tkazmasi',
                default => $payment->payment_method,
            },
            'autoprint' => $request->boolean('autoprint'),
        ]);
    }

    /**
     * Printable cash-out order for an expense.
     */
    public function expenseReceipt(Request $request, Expense $expense): View
    {
        $expense->load(['category', 'cashRegister', 'user', 'branch']);

        return view('receipts.expense', [
            'expense' => $expense,
            'branch' => $expense->branch,
            'number' => $expense->receipt_number,
            'amount' => $expense->amount,
            'dateTime' => ($expense->spent_at ?? $expense->created_at)?->format('Y-m-d H:i'),
            'autoprint' => $request->boolean('autoprint'),
        ]);
    }

    /**
     * Delete an expense and refund the money back to the cash register.
     */
    public function destroyExpense(Expense $expense): RedirectResponse
    {
        // Salary payouts and contract refunds also create an expense; deleting only the
        // expense would return the cash while the payout/refund records stay in place.
        $linkedCategory = CashTransaction::where('reference_type', Expense::class)
            ->where('reference_id', $expense->id)
            ->where('type', 'out')
            ->whereIn('category', ['salary', 'refund'])
            ->value('category');

        if ($linkedCategory === 'salary') {
            return redirect()->back()->withErrors(['expense' => "Bu xarajat oylik to'lovi bilan bog'langan va alohida o'chirilmaydi."]);
        }

        if ($linkedCategory === 'refund') {
            return redirect()->back()->withErrors(['expense' => "Bu xarajat to'lov qaytarish (refund) bilan bog'langan. Uni qaytarish to'lovini o'chirish orqali bekor qiling."]);
        }

        DB::transaction(function () use ($expense) {
            // Re-read under lock so a double submit cannot refund the register twice.
            $lockedExpense = Expense::whereKey($expense->id)->lockForUpdate()->first();
            if (! $lockedExpense) {
                return;
            }

            if ($lockedExpense->cash_register_id) {
                $register = CashRegister::find($lockedExpense->cash_register_id);
                $register?->deposit(
                    amount: (float) $lockedExpense->amount,
                    category: 'refund',
                    description: "O'chirilgan xarajat qaytarildi: {$lockedExpense->description}",
                    reference: $lockedExpense,
                    userId: auth()->id()
                );
            }

            // If this expense is attached to vehicle maintenance, reset expense_id on maintenance
            VehicleMaintenance::where('expense_id', $lockedExpense->id)->update(['expense_id' => null]);

            $lockedExpense->delete();
        });

        return redirect()->back()->with('success', "Xarajat o'chirildi va mablag' kassaga qaytarildi.");
    }

    /**
     * Delete a payment, adjust the cash register balance, and recalculate contract finances.
     */
    public function destroyPayment(Request $request, Payment $payment): RedirectResponse
    {
        $this->ensureCanSeeStudent($request, $payment->student);

        try {
            DB::transaction(function () use ($payment) {
                // Lock the contract first (same order as payments/refunds) and re-read the
                // payment so a double submit cannot reverse it twice.
                if ($payment->contract_id) {
                    Contract::whereKey($payment->contract_id)->lockForUpdate()->first();
                }

                $payment = Payment::whereKey($payment->id)->lockForUpdate()->first();
                if (! $payment) {
                    return;
                }

                if ($payment->payment_type !== 'refund' && $payment->contract_id) {
                    $otherTuition = (float) Payment::where('contract_id', $payment->contract_id)
                        ->where('payment_type', '!=', 'refund')
                        ->whereKeyNot($payment->id)
                        ->sum('amount');
                    $refunded = (float) Payment::where('contract_id', $payment->contract_id)
                        ->where('payment_type', 'refund')
                        ->sum('amount');

                    if ($otherTuition + 0.01 < $refunded) {
                        throw new InvalidArgumentException(
                            "Bu to'lov qaytarilgan (refund) mablag'ni qoplaydi. Avval tegishli qaytarish to'lovini o'chiring."
                        );
                    }
                }

                $lockedRegister = $payment->cash_register_id
                    ? CashRegister::where('id', $payment->cash_register_id)->first()
                    : null;

                if ($payment->payment_type === 'refund') {
                    // Deleting a refund payment returns the money to the register
                    if ($lockedRegister) {
                        $lockedRegister->deposit(
                            amount: (float) $payment->amount,
                            category: 'refund',
                            description: "Qaytarilgan to'lov bekor qilindi (#{$payment->receipt_number})",
                            reference: $payment,
                            userId: auth()->id()
                        );
                    }
                    Expense::where('cash_register_id', $payment->cash_register_id)
                        ->where('amount', $payment->amount)
                        ->where('description', 'like', "To'lovni qaytarish (Chek: #{$payment->receipt_number})%")
                        ->first()
                        ?->delete();
                } else {
                    // Deleting an income payment deducts the money from the register
                    if ($lockedRegister) {
                        $lockedRegister->withdraw(
                            amount: (float) $payment->amount,
                            category: 'refund',
                            description: "Bekor qilingan to'lov (#{$payment->receipt_number})",
                            reference: $payment,
                            userId: auth()->id()
                        );
                    }
                }

                $contract = $payment->contract;
                $payment->delete();

                if ($contract) {
                    $debtBefore = (float) $contract->debt_amount;
                    $contract->recalculateFinances();

                    if ($contract->student) {
                        $isRefund = $payment->payment_type === 'refund';
                        FinancialHistory::recordForStudent($contract->student, [
                            'type' => $isRefund ? 'credit' : 'debit',
                            'category' => $isRefund ? 'refund_reversal' : 'payment_reversal',
                            'amount' => (float) $payment->amount,
                            'balance_before' => $debtBefore,
                            'balance_after' => (float) $contract->debt_amount,
                            'payment_method' => $payment->payment_method,
                            'description' => "To'lov bekor qilindi (Chek #{$payment->receipt_number})",
                            'performed_by_user_id' => auth()->id(),
                            'transacted_at' => now(),
                        ]);
                    }
                }
            });
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['payment' => $e->getMessage()]);
        }

        return redirect()->back()->with('success', "To'lov o'chirildi, kassa va shartnoma hisoblari qayta yangilandi.");
    }
}
