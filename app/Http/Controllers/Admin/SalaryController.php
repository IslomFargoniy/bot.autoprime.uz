<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\Driving;
use App\Models\LessonSession;
use App\Models\Salary;
use App\Models\SalaryPayment;
use App\Models\User;
use App\Services\BranchSessionService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SalaryController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        $period = $request->input('period', Carbon::now()->format('Y-m'));

        $salariesQuery = Salary::with(['user', 'calculatedBy', 'salaryPayments'])
            ->where('period', $period)
            ->orderBy('created_at', 'desc');

        if ($targetBranchId) {
            $salariesQuery->whereHas('user', function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            });
        }

        $salaries = $salariesQuery->paginate(20)->withQueryString();

        $employees = User::where('status', 'active')
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
            ],
        ]);
    }

    /**
     * 1-Click Monthly Payroll Generation.
     */
    public function generateMonthlyPayroll(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'period' => 'required|date_format:Y-m',
        ]);

        $period = $validated['period'];
        $startOfMonth = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
        $endOfMonth = Carbon::createFromFormat('Y-m', $period)->endOfMonth();

        $employees = User::where('status', 'active')->get();
        $createdCount = 0;

        DB::transaction(function () use ($employees, $period, $startOfMonth, $endOfMonth, $request, &$createdCount) {
            foreach ($employees as $emp) {
                // Check if already generated base payroll for this period
                $existing = Salary::where('user_id', $emp->id)
                    ->where('period', $period)
                    ->where('salary_type', 'base_salary')
                    ->first();

                if ($existing) {
                    continue;
                }

                $baseSalary = (float) $emp->base_salary;
                $drivingHours = 0.0;
                $drivingAmount = 0.0;
                $lessonCount = 0;
                $lessonAmount = 0.0;

                // 1. Calculate Driving hours for Instructors
                if ($emp->role === 'instructor' || $emp->driving_hourly_rate > 0) {
                    $completedDrivings = Driving::where('instructor_id', $emp->id)
                        ->where('status', 'completed')
                        ->whereBetween('start_time', [$startOfMonth, $endOfMonth])
                        ->get();

                    foreach ($completedDrivings as $drv) {
                        $diffMinutes = Carbon::parse($drv->start_time)->diffInMinutes(Carbon::parse($drv->end_time));
                        $drivingHours += round($diffMinutes / 60, 2);
                    }

                    $drivingAmount = $drivingHours * (float) $emp->driving_hourly_rate;
                }

                // 2. Calculate Theory lessons for Teachers
                if ($emp->role === 'teacher' || $emp->lesson_rate > 0) {
                    $lessonCount = LessonSession::where('teacher_id', $emp->id)
                        ->whereIn('status', ['finished', 'completed'])
                        ->whereBetween('started_at', [$startOfMonth, $endOfMonth])
                        ->count();

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

                // Update employee salary_balance
                $emp->increment('salary_balance', $totalGross);
                $createdCount++;
            }
        });

        return redirect()->back()->with('success', "{$createdCount} nafar xodim uchun oylik vedomosti muvaffaqiyatli hisoblandi.");
    }

    /**
     * Accrue bonus or penalty / advance.
     */
    public function storeCustomAdjustment(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'period' => 'required|date_format:Y-m',
            'type' => 'required|in:bonus,kpi,fine,advance',
            'amount' => 'required|numeric|min:1',
            'description' => 'required|string|max:500',
        ]);

        $isDeduction = in_array($validated['type'], ['fine', 'advance']);
        $employee = User::findOrFail($validated['user_id']);

        DB::transaction(function () use ($validated, $isDeduction, $employee, $request) {
            Salary::create([
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

            if ($isDeduction) {
                $employee->decrement('salary_balance', min((float) $employee->salary_balance, (float) $validated['amount']));
            } else {
                $employee->increment('salary_balance', (float) $validated['amount']);
            }
        });

        return redirect()->back()->with('success', 'Amal saqlandi va xodim balansi yangilandi.');
    }

    /**
     * Pay salary from cash register.
     */
    public function pay(Request $request, Salary $salary): RedirectResponse
    {
        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|in:cash,card_click,bank_transfer',
            'notes' => 'nullable|string',
        ]);

        $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);
        if ((float) $cashRegister->balance < (float) $validated['amount']) {
            return redirect()->back()->withErrors([
                'amount' => "Tanlangan kassada yetarli mablag' mavjud emas (Mavjud: {$cashRegister->balance} UZS).",
            ]);
        }

        DB::transaction(function () use ($salary, $cashRegister, $validated, $request) {
            $lockedRegister = CashRegister::where('id', $cashRegister->id)->lockForUpdate()->first();
            $employee = User::where('id', $salary->user_id)->lockForUpdate()->first();

            SalaryPayment::create([
                'salary_id' => $salary->id,
                'user_id' => $employee->id,
                'cash_register_id' => $lockedRegister->id,
                'paid_by_user_id' => $request->user()->id,
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'paid_at' => now(),
                'comment' => $validated['notes'] ?? null,
            ]);

            $lockedRegister->decrement('balance', (float) $validated['amount']);
            $employee->decrement('salary_balance', min((float) $employee->salary_balance, (float) $validated['amount']));
        });

        return redirect()->back()->with('success', 'Oylik to\'lovi kassadan muvaffaqiyatli amalga oshirildi.');
    }
}
