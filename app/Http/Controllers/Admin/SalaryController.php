<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\BranchScopedValidationRules;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\Driving;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FinancialHistory;
use App\Models\LessonSession;
use App\Models\Salary;
use App\Models\SalaryPayment;
use App\Models\User;
use App\Services\BranchSessionService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class SalaryController extends Controller
{
    use BranchScopedValidationRules;

    /**
     * Manual entries that can be taken back; regular salary accruals cannot.
     */
    private const ADJUSTMENT_TYPES = ['bonus', 'kpi', 'fine', 'advance'];

    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        $period = $request->input('period', Carbon::now()->format('Y-m'));

        $salariesQuery = Salary::with(['user', 'calculatedBy', 'salaryPayments', 'payments'])
            ->where('period', $period)
            ->orderBy('created_at', 'desc');

        if ($targetBranchId) {
            $salariesQuery->whereHas('user', function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            });
        }
        $salaries = $salariesQuery->paginate($this->perPage($request, fn () => $salariesQuery->count()))->withQueryString();

        $employees = User::where('status', 'active')
            ->whereNotIn('role', config('roles.unsalaried_roles'))
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->select(['id', 'name', 'phone', 'role', 'base_salary', 'driving_hourly_rate', 'lesson_rate', 'salary_balance'])
            ->get();

        $cashRegisters = CashRegister::where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->get();

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Salaries/Index', [
            'salaries' => $salaries,
            'employees' => $employees,
            'cashRegisters' => $cashRegisters,
            'branches' => $branches,
            'filters' => [
                'period' => $period,
                'branch_id' => $targetBranchId,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    /**
     * 1-Click Monthly Payroll Generation.
     */
    public function generateMonthlyPayroll(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'period' => ['required', 'date_format:Y-m', 'before_or_equal:'.now()->format('Y-m')],
        ], [
            'period.before_or_equal' => 'Oylik kelgusi oylar uchun hisoblanmaydi.',
        ]);

        $period = $validated['period'];
        $startOfMonth = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
        $endOfMonth = Carbon::createFromFormat('Y-m', $period)->endOfMonth();

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        $employees = User::with('roles')
            ->where('status', 'active')
            ->whereNotIn('role', config('roles.unsalaried_roles'))
            ->whereKeyNot($request->user()->id)
            ->when($targetBranchId, fn ($q) => $q->where('branch_id', $targetBranchId))
            ->get();
        $createdCount = 0;

        $employeeIds = $employees->pluck('id')->all();

        // Batch pre-fetch existing salaries for this period
        $existingSalaries = Salary::whereIn('user_id', $employeeIds)
            ->where('period', $period)
            ->where('salary_type', 'base_salary')
            ->pluck('user_id')
            ->flip();

        // Batch pre-fetch completed drivings grouped by instructor
        $completedDrivingsGrouped = Driving::whereIn('instructor_id', $employeeIds)
            ->where('status', 'completed')
            ->whereBetween('start_time', [$startOfMonth, $endOfMonth])
            ->get()
            ->groupBy('instructor_id');

        // Batch pre-fetch theory lesson counts grouped by teacher
        $theoryLessonCounts = LessonSession::whereIn('teacher_id', $employeeIds)
            ->where('status', 'finished')
            ->whereBetween('started_at', [$startOfMonth, $endOfMonth])
            ->selectRaw('teacher_id, COUNT(*) as cnt')
            ->groupBy('teacher_id')
            ->pluck('cnt', 'teacher_id');

        DB::transaction(function () use (
            $employees,
            $period,
            $existingSalaries,
            $completedDrivingsGrouped,
            $theoryLessonCounts,
            $request,
            &$createdCount
        ) {
            foreach ($employees as $emp) {
                // Skip if already generated base payroll for this period
                if (isset($existingSalaries[$emp->id])) {
                    continue;
                }

                // Lock the employee so a concurrent run waits and then sees this accrual
                $emp = User::whereKey($emp->id)->lockForUpdate()->first();
                if (! $emp) {
                    continue;
                }

                // Re-check under the lock: the pre-fetch above may predate a concurrent run
                $alreadyGenerated = Salary::where('user_id', $emp->id)
                    ->where('period', $period)
                    ->where('salary_type', 'base_salary')
                    ->exists();
                if ($alreadyGenerated) {
                    continue;
                }

                $baseSalary = (float) $emp->base_salary;
                $drivingHours = 0.0;
                $drivingAmount = 0.0;
                $lessonCount = 0;
                $lessonAmount = 0.0;

                // 1. Calculate Driving hours for Instructors
                if ($emp->conductsDrivings() || $emp->driving_hourly_rate > 0) {
                    $completedDrivings = $completedDrivingsGrouped->get($emp->id, collect());

                    foreach ($completedDrivings as $drv) {
                        $diffMinutes = Carbon::parse($drv->start_time)->diffInMinutes(Carbon::parse($drv->end_time));
                        $drivingHours += round($diffMinutes / 60, 2);
                    }

                    $drivingAmount = $drivingHours * (float) $emp->driving_hourly_rate;
                }

                // 2. Calculate Theory lessons for Teachers
                if ($emp->teachesLessons() || $emp->lesson_rate > 0) {
                    $lessonCount = (int) ($theoryLessonCounts[$emp->id] ?? 0);
                    $lessonAmount = $lessonCount * (float) $emp->lesson_rate;
                }

                $totalGross = $baseSalary + $drivingAmount + $lessonAmount;

                if ($totalGross <= 0) {
                    continue;
                }

                // Accrue salary
                Salary::create([
                    'branch_id' => $emp->branch_id,
                    'user_id' => $emp->id,
                    'created_by_user_id' => $request->user()->id,
                    'period' => $period,
                    'salary_type' => 'base_salary',
                    'amount' => $totalGross,
                    'is_deduction' => false,
                    'lessons_or_hours_count' => (int) round($drivingHours + $lessonCount),
                    'notes' => "Oylik hisob-kitob ({$period}): Oklad: {$baseSalary} + Vajdeniya: {$drivingAmount} ({$drivingHours} soat) + Nazariya: {$lessonAmount} ({$lessonCount} ta dars)",
                    'accrued_at' => now(),
                ]);

                // Update employee salary_balance & record financial history
                $balBefore = (float) $emp->salary_balance;
                $emp->increment('salary_balance', $totalGross);
                $balAfter = (float) ($balBefore + $totalGross);

                FinancialHistory::recordForUser($emp, [
                    'type' => 'credit',
                    'category' => 'salary_accrual',
                    'amount' => (float) $totalGross,
                    'balance_before' => $balBefore,
                    'balance_after' => $balAfter,
                    'description' => "{$period} oyi uchun oylik hisoblandi (Oklad + Amaliyot + Nazariya)",
                    'performed_by_user_id' => $request->user()->id,
                    'transacted_at' => now(),
                ]);

                $createdCount++;
            }
        });

        return redirect()->back()->with('success', "{$createdCount} nafar xodim uchun oylik vedomosti muvaffaqiyatli hisoblandi.");
    }

    /**
     * Why the actor may not accrue or pay salary for the employee, if anything:
     * admins are not on the payroll and nobody handles their own pay.
     */
    private function payrollRestriction(User $actor, ?User $employee): ?string
    {
        if (! $employee || ! $employee->isSalaried()) {
            return 'Adminlarga oylik hisoblanmaydi.';
        }

        if ($employee->is($actor)) {
            return 'O\'zingizga oylik, bonus yoki to\'lov yoza olmaysiz.';
        }

        return null;
    }

    /**
     * Accrue bonus or penalty / advance.
     */
    public function storeCustomAdjustment(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', $this->existsInUserBranch($request, 'users')],
            'period' => 'required|date_format:Y-m',
            'type' => ['required', Rule::in(self::ADJUSTMENT_TYPES)],
            'amount' => 'required|numeric|min:1|max:9999999999',
            'description' => 'required|string|max:500',
        ]);

        $isDeduction = in_array($validated['type'], ['fine', 'advance']);
        $employee = User::findOrFail($validated['user_id']);

        if ($error = $this->payrollRestriction($request->user(), $employee)) {
            return redirect()->back()->withErrors(['user_id' => $error]);
        }

        DB::transaction(function () use ($validated, $isDeduction, $employee, $request) {
            $createdSalary = Salary::create([
                'branch_id' => $employee->branch_id,
                'user_id' => $employee->id,
                'created_by_user_id' => $request->user()->id,
                'period' => $validated['period'],
                'salary_type' => $validated['type'],
                'amount' => $validated['amount'],
                'is_deduction' => $isDeduction,
                'notes' => $validated['description'],
                'accrued_at' => now(),
            ]);

            $employee = User::whereKey($employee->id)->lockForUpdate()->first();
            $balBefore = (float) $employee->salary_balance;
            // Deductions are applied in full (the balance may go negative) so the
            // result never depends on the order of accruals, fines and payouts.
            if ($isDeduction) {
                $employee->decrement('salary_balance', (float) $validated['amount']);
            } else {
                $employee->increment('salary_balance', (float) $validated['amount']);
            }
            $balAfter = (float) $employee->fresh()->salary_balance;

            FinancialHistory::recordForUser($employee, [
                'type' => $isDeduction ? 'debit' : 'credit',
                'category' => $validated['type'],
                'amount' => (float) $validated['amount'],
                'balance_before' => $balBefore,
                'balance_after' => $balAfter,
                'description' => "{$validated['description']} ({$validated['period']})",
                'reference' => $createdSalary,
                'performed_by_user_id' => $request->user()->id,
                'transacted_at' => now(),
            ]);
        });

        return redirect()->back()->with('success', 'Amal saqlandi va xodim balansi yangilandi.');
    }

    /**
     * Take back a bonus, KPI, fine or advance entered by mistake. The employee balance
     * is restored and the ledger keeps a reversing entry; entries that were already
     * (partly) paid out and regular monthly salaries cannot be taken back.
     */
    public function destroyAdjustment(Request $request, Salary $salary): RedirectResponse
    {
        $user = $request->user();
        $employee = $salary->user;

        abort_if($user->isBranchRestricted() && $employee?->branch_id !== $user->branch_id, 403, 'Bu xodim boshqa filialga tegishli.');

        if (! in_array($salary->salary_type, self::ADJUSTMENT_TYPES, true)) {
            return redirect()->back()->withErrors(['delete' => 'Faqat bonus, KPI, jarima va avans yozuvlarini bekor qilish mumkin.']);
        }

        if ($error = $this->payrollRestriction($user, $employee)) {
            return redirect()->back()->withErrors(['delete' => $error]);
        }

        $error = DB::transaction(function () use ($salary, $request): ?string {
            $lockedSalary = Salary::whereKey($salary->id)->lockForUpdate()->firstOrFail();

            if ($lockedSalary->payments()->exists()) {
                return 'Bu yozuv bo\'yicha to\'lov qilingan, bekor qilib bo\'lmaydi.';
            }

            $lockedEmployee = User::whereKey($lockedSalary->user_id)->lockForUpdate()->firstOrFail();
            $amount = (float) $lockedSalary->amount;
            $balBefore = (float) $lockedEmployee->salary_balance;

            if ($lockedSalary->is_deduction) {
                $lockedEmployee->increment('salary_balance', $amount);
            } else {
                $lockedEmployee->decrement('salary_balance', $amount);
            }

            FinancialHistory::recordForUser($lockedEmployee, [
                'type' => $lockedSalary->is_deduction ? 'credit' : 'debit',
                'category' => 'adjustment_reversal',
                'amount' => $amount,
                'balance_before' => $balBefore,
                'balance_after' => (float) $lockedEmployee->fresh()->salary_balance,
                'description' => "Bekor qilindi: {$lockedSalary->notes} ({$lockedSalary->period})",
                'performed_by_user_id' => $request->user()->id,
                'transacted_at' => now(),
            ]);

            $lockedSalary->delete();

            return null;
        });

        if ($error) {
            return redirect()->back()->withErrors(['delete' => $error]);
        }

        return redirect()->back()->with('success', 'Yozuv bekor qilindi va xodim balansi qaytarildi.');
    }

    /**
     * Pay salary from cash register.
     */
    public function pay(Request $request, Salary $salary): RedirectResponse
    {
        $validated = $request->validate([
            'cash_register_id' => ['required', $this->cashRegisterInUserBranch($request)],
            'amount' => 'required|numeric|min:1|max:9999999999',
            'payment_method' => 'required|in:cash,card_click,bank_transfer',
            'notes' => 'nullable|string',
        ]);

        if ($salary->is_deduction) {
            return redirect()->back()->withErrors(['amount' => "Ushlab qolish (jarima/avans) yozuvini to'lab bo'lmaydi."]);
        }

        if ($error = $this->payrollRestriction($request->user(), $salary->user)) {
            return redirect()->back()->withErrors(['amount' => $error]);
        }

        $cashRegister = CashRegister::with('type')->findOrFail($validated['cash_register_id']);
        if ($mismatch = $cashRegister->paymentMethodMismatchMessage($validated['payment_method'])) {
            return redirect()->back()->withErrors(['cash_register_id' => $mismatch]);
        }

        try {
            DB::transaction(function () use ($salary, $cashRegister, $validated, $request) {
                $this->payLockedSalary($salary, $cashRegister, $validated, $request);
            });
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['amount' => $e->getMessage()]);
        }

        return redirect()->back()->with('success', 'Oylik to\'lovi kassadan muvaffaqiyatli amalga oshirildi va Moliya xarajatlarida qayd etildi.');
    }

    /**
     * Pay out (part of) a salary accrual. Must run inside a transaction: the
     * accrual is locked so the remaining amount is checked against committed
     * payments and two concurrent payouts cannot both pass.
     *
     * @param  array{cash_register_id: int|string, amount: int|float|string, payment_method: string, notes?: string|null}  $validated
     */
    private function payLockedSalary(Salary $salary, CashRegister $cashRegister, array $validated, Request $request): void
    {
        $lockedSalary = Salary::whereKey($salary->id)->lockForUpdate()->firstOrFail();
        if ((float) $validated['amount'] > $lockedSalary->remainingAmount() + 0.01) {
            throw new InvalidArgumentException(
                "To'lov summasi qolgan qarzdan (".number_format($lockedSalary->remainingAmount(), 0, '', ' ')." UZS) ko'p bo'lishi mumkin emas."
            );
        }

        $lockedRegister = CashRegister::where('id', $cashRegister->id)->lockForUpdate()->first();
        $employee = User::where('id', $salary->user_id)->lockForUpdate()->first();

        $category = ExpenseCategory::system(ExpenseCategory::SALARY);

        $expense = Expense::create([
            'branch_id' => $employee->branch_id ?? $lockedRegister->branch_id ?? Branch::first()->id ?? 1,
            'cash_register_id' => $lockedRegister->id,
            'expense_category_id' => $category->id,
            'user_id' => $request->user()->id,
            'amount' => $validated['amount'],
            'recipient' => "Xodim: {$employee->name} ({$employee->role})",
            'description' => "Oylik maosh to'lovi ({$salary->period})".(! empty($validated['notes']) ? ": {$validated['notes']}" : ''),
            'spent_at' => now(),
        ]);

        $salaryPayment = SalaryPayment::create([
            'salary_id' => $salary->id,
            'user_id' => $employee->id,
            'cash_register_id' => $lockedRegister->id,
            'paid_by_user_id' => $request->user()->id,
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'paid_at' => now(),
            'comment' => $validated['notes'] ?? null,
        ]);

        $lockedRegister->withdraw(
            amount: (float) $validated['amount'],
            category: 'salary',
            description: "Oylik maosh to'lovi: {$employee->name} ({$salary->period})",
            reference: $expense,
            userId: $request->user()->id
        );

        $balBefore = (float) $employee->salary_balance;
        $employee->decrement('salary_balance', (float) $validated['amount']);
        $balAfter = (float) $employee->fresh()->salary_balance;

        FinancialHistory::recordForUser($employee, [
            'type' => 'debit',
            'category' => 'salary_payout',
            'amount' => (float) $validated['amount'],
            'balance_before' => $balBefore,
            'balance_after' => $balAfter,
            'payment_method' => $validated['payment_method'],
            'description' => "Oylik maosh to'lovi ({$salary->period} oyi uchun)",
            'reference' => $salaryPayment,
            'performed_by_user_id' => $request->user()->id,
            'transacted_at' => now(),
        ]);
    }
}
