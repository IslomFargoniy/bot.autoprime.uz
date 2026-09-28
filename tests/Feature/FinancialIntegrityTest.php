<?php

use App\Jobs\ReconcileFinancialBalancesJob;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransfer;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Payment;
use App\Models\Salary;
use App\Models\Student;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use App\Services\TelegramService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'fin-int'], ['name' => 'Moliya Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
    $this->superAdmin = User::factory()->create(['role' => 'superadmin']);
    $this->cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true]);
});

function fundedRegister(Branch $branch, float $openingBalance, string $name = 'Kassa'): CashRegister
{
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => $name,
        'balance' => 0,
        'is_active' => true,
    ]);

    if ($openingBalance > 0) {
        $register->deposit($openingBalance, 'initial', "Boshlang'ich qoldiq");
    }

    return $register->fresh();
}

function contractFor(Branch $branch, User $creator, float $finalAmount = 3000000): Contract
{
    $contractType = ContractType::firstOrCreate(
        ['name' => 'Integrity Kurs'],
        ['branch_id' => $branch->id, 'category' => 'B', 'price' => $finalAmount, 'is_active' => true]
    );

    return Contract::create([
        'branch_id' => $branch->id,
        'student_id' => Student::factory()->create(['branch_id' => $branch->id])->id,
        'contract_type_id' => $contractType->id,
        'created_by_user_id' => $creator->id,
        'contract_number' => 'INT-'.fake()->unique()->numerify('#####'),
        'contract_date' => now()->toDateString(),
        'total_amount' => $finalAmount,
        'final_amount' => $finalAmount,
        'debt_amount' => $finalAmount,
        'status' => 'active',
        'payment_status' => 'unpaid',
    ]);
}

test('a transfer approved twice moves the money only once', function () {
    $from = fundedRegister($this->branch, 1000000, 'Chiqim');
    $to = fundedRegister($this->branch, 0, 'Kirim');
    $transfer = CashTransfer::create(['from_cash_register_id' => $from->id, 'to_cash_register_id' => $to->id, 'amount' => 400000, 'status' => 'pending']);

    $this->actingAs($this->superAdmin)->post("/admin/finance/transfer/{$transfer->id}/approve")->assertSessionHasNoErrors();
    $this->actingAs($this->superAdmin)->post("/admin/finance/transfer/{$transfer->id}/approve")->assertSessionHasErrors('transfer');

    expect((float) $from->fresh()->balance)->toEqual(600000.0)
        ->and((float) $to->fresh()->balance)->toEqual(400000.0);
});

test('approving a transfer without enough balance returns an error and keeps it pending', function () {
    $from = fundedRegister($this->branch, 100000, 'Chiqim');
    $to = fundedRegister($this->branch, 0, 'Kirim');
    $transfer = CashTransfer::create(['from_cash_register_id' => $from->id, 'to_cash_register_id' => $to->id, 'amount' => 400000, 'status' => 'pending']);

    $this->actingAs($this->superAdmin)->post("/admin/finance/transfer/{$transfer->id}/approve")->assertSessionHasErrors('transfer');

    expect($transfer->fresh()->status)->toBe('pending')
        ->and((float) $from->fresh()->balance)->toEqual(100000.0);
});

test('a pending transfer can be rejected without moving money', function () {
    $from = fundedRegister($this->branch, 1000000, 'Chiqim');
    $to = fundedRegister($this->branch, 0, 'Kirim');
    $transfer = CashTransfer::create(['from_cash_register_id' => $from->id, 'to_cash_register_id' => $to->id, 'amount' => 400000, 'status' => 'pending']);

    $this->actingAs($this->superAdmin)->post("/admin/finance/transfer/{$transfer->id}/reject")->assertSessionHasNoErrors();

    expect($transfer->fresh()->status)->toBe('rejected')
        ->and((float) $from->fresh()->balance)->toEqual(1000000.0)
        ->and((float) $to->fresh()->balance)->toEqual(0.0);
});

test('a salary payout expense cannot be deleted on its own', function () {
    $register = fundedRegister($this->branch, 5000000);
    $employee = User::factory()->create(['role' => 'teacher', 'branch_id' => $this->branch->id]);
    $salary = Salary::create(['branch_id' => $this->branch->id, 'user_id' => $employee->id, 'period' => '2026-09', 'salary_type' => 'base_salary', 'amount' => 1000000, 'accrued_at' => now()]);

    $this->actingAs($this->admin)->post(route('salaries.pay', $salary), [
        'cash_register_id' => $register->id,
        'amount' => 1000000,
        'payment_method' => 'cash',
    ])->assertSessionHasNoErrors();

    $expense = Expense::where('cash_register_id', $register->id)->latest('id')->first();

    $this->actingAs($this->admin)->delete("/admin/finance/expense/{$expense->id}")->assertSessionHasErrors('expense');

    expect((float) $register->fresh()->balance)->toEqual(4000000.0)
        ->and(Expense::whereKey($expense->id)->exists())->toBeTrue();
});

test('salary payouts cannot exceed the accrual and deductions cannot be paid out', function () {
    $register = fundedRegister($this->branch, 5000000);
    $employee = User::factory()->create(['role' => 'teacher', 'branch_id' => $this->branch->id]);
    $salary = Salary::create(['branch_id' => $this->branch->id, 'user_id' => $employee->id, 'period' => '2026-09', 'salary_type' => 'base_salary', 'amount' => 1000000, 'accrued_at' => now()]);
    $fine = Salary::create(['branch_id' => $this->branch->id, 'user_id' => $employee->id, 'period' => '2026-09', 'salary_type' => 'fine', 'amount' => 50000, 'is_deduction' => true, 'accrued_at' => now()]);

    $payload = ['cash_register_id' => $register->id, 'payment_method' => 'cash'];

    $this->actingAs($this->admin)->post(route('salaries.pay', $salary), [...$payload, 'amount' => 600000])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post(route('salaries.pay', $salary), [...$payload, 'amount' => 600000])->assertSessionHasErrors('amount');
    $this->actingAs($this->admin)->post(route('salaries.pay', $fine), [...$payload, 'amount' => 50000])->assertSessionHasErrors('amount');

    expect((float) $register->fresh()->balance)->toEqual(4400000.0);
});

test('a fine is deducted in full and the nightly reconciliation agrees with the live balance', function () {
    $employee = User::factory()->create(['role' => 'teacher', 'branch_id' => $this->branch->id, 'salary_balance' => 0]);

    $this->actingAs($this->admin)->post(route('salaries.store-adjustment'), [
        'user_id' => $employee->id, 'period' => '2026-09', 'type' => 'fine', 'amount' => 100000, 'description' => 'Kechikish',
    ])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post(route('salaries.store-adjustment'), [
        'user_id' => $employee->id, 'period' => '2026-09', 'type' => 'bonus', 'amount' => 1000000, 'description' => 'Bonus',
    ])->assertSessionHasNoErrors();

    expect((float) $employee->fresh()->salary_balance)->toEqual(900000.0);

    (new ReconcileFinancialBalancesJob)->handle();

    expect((float) $employee->fresh()->salary_balance)->toEqual(900000.0);
});

test('reconciliation keeps opening balances and only reports register drift', function () {
    $register = fundedRegister($this->branch, 45000000);

    (new ReconcileFinancialBalancesJob)->handle();
    expect((float) $register->fresh()->balance)->toEqual(45000000.0);

    // A mismatch means the ledger may be wrong: it is logged, never copied over real money.
    Log::spy();
    $register->update(['balance' => 1]);
    (new ReconcileFinancialBalancesJob)->handle();

    expect((float) $register->fresh()->balance)->toEqual(1.0);
    Log::shouldHaveReceived('warning')->withArgs(fn (string $message) => str_contains($message, "(ID: {$register->id})"));
});

test('the ledger repair restores money lost by the clamped backfill', function () {
    $register = fundedRegister($this->branch, 0);
    $rows = [
        // Production ledger of "Chilonzor Naqd pul kassasi" as written by the clamped backfill.
        ['in', 'payment', 3500000, 0, 3500000, '2026-08-24 06:15:52'],
        ['in', 'payment', 2100000, 3500000, 5600000, '2026-08-29 06:15:52'],
        ['in', 'payment', 700000, 5600000, 6300000, '2026-09-09 06:15:52'],
        ['out', 'expense', 250000, 6300000, 6050000, '2026-09-20 06:12:44'],
        ['out', 'expense', 380000, 6050000, 5670000, '2026-09-21 06:12:44'],
        ['out', 'expense', 120000, 5670000, 5550000, '2026-09-23 04:12:44'],
        ['out', 'transfer_out', 5000000, 5550000, 550000, '2026-09-23 06:12:45'],
        ['out', 'transfer_out', 1500000, 550000, 0, '2026-09-26 15:35:58'],
        ['in', 'transfer_in', 1000, 0, 1000, '2026-09-26 15:39:06'],
        ['in', 'initial', 13000000, 1000, 13001000, '2026-09-23 06:12:45'],
        ['out', 'sweep_out', 13001000, 13001000, 0, '2026-09-26 17:41:24'],
    ];
    foreach ($rows as [$type, $category, $amount, $before, $after, $at]) {
        DB::table('cash_transactions')->insert([
            'cash_register_id' => $register->id, 'type' => $type, 'category' => $category, 'amount' => $amount,
            'balance_before' => $before, 'balance_after' => $after, 'transacted_at' => $at, 'created_at' => $at, 'updated_at' => $at,
        ]);
    }
    // The old nightly job had copied the wrong ledger total into the register.
    $register->update(['balance' => -950000]);

    (require database_path('migrations/2026_09_28_073203_repair_clamped_cash_ledger_backfill.php'))->up();

    $ledger = DB::table('cash_transactions')->where('cash_register_id', $register->id)->orderBy('transacted_at')->orderBy('id')->get();
    $sum = $ledger->sum(fn ($row) => ($row->type === 'in' ? 1 : -1) * (float) $row->amount);

    expect((float) $register->fresh()->balance)->toEqual(0.0)
        ->and(round($sum, 2))->toEqual(0.0)
        ->and((float) $ledger->firstWhere('category', 'initial')->amount)->toEqual(13950000.0)
        ->and((float) $ledger->last()->balance_after)->toEqual(0.0);

    // Every row now continues from the previous one.
    $previousAfter = 0.0;
    foreach ($ledger as $row) {
        expect((float) $row->balance_before)->toEqual($previousAfter);
        $previousAfter = (float) $row->balance_after;
    }
});

test('a refund larger than what was paid returns a validation error', function () {
    $register = fundedRegister($this->branch, 5000000);
    $contract = contractFor($this->branch, $this->admin);

    $this->actingAs($this->admin)->post('/admin/finance/payment', [
        'contract_id' => $contract->id, 'cash_register_id' => $register->id, 'amount' => 500000, 'payment_method' => 'cash',
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->post(route('contracts.refund', $contract), [
        'cash_register_id' => $register->id, 'amount' => 800000, 'payment_method' => 'cash',
    ])->assertSessionHasErrors('amount');

    expect(Payment::where('payment_type', 'refund')->count())->toBe(0);
});

test('a tuition payment that funds a refund cannot be deleted before the refund', function () {
    $register = fundedRegister($this->branch, 5000000);
    $contract = contractFor($this->branch, $this->admin);

    $this->actingAs($this->admin)->post('/admin/finance/payment', [
        'contract_id' => $contract->id, 'cash_register_id' => $register->id, 'amount' => 1000000, 'payment_method' => 'cash',
    ]);
    $this->actingAs($this->admin)->post(route('contracts.refund', $contract), [
        'cash_register_id' => $register->id, 'amount' => 1000000, 'payment_method' => 'cash',
    ])->assertSessionHasNoErrors();

    $tuition = Payment::where('payment_type', '!=', 'refund')->first();
    $this->actingAs($this->admin)->delete("/admin/finance/payment/{$tuition->id}")->assertSessionHasErrors('payment');

    expect(Payment::whereKey($tuition->id)->exists())->toBeTrue()
        ->and((float) $register->fresh()->balance)->toEqual(5000000.0);
});

test('payments cannot be taken on a cancelled contract', function () {
    $register = fundedRegister($this->branch, 0);
    $contract = contractFor($this->branch, $this->admin);
    $contract->update(['status' => 'cancelled']);

    $this->actingAs($this->admin)->post('/admin/finance/payment', [
        'contract_id' => $contract->id, 'cash_register_id' => $register->id, 'amount' => 100000, 'payment_method' => 'cash',
    ])->assertSessionHasErrors('contract_id');
});

test('payroll generation twice accrues the base salary only once', function () {
    $employee = User::factory()->create(['role' => 'teacher', 'branch_id' => $this->branch->id, 'base_salary' => 2000000]);

    $this->actingAs($this->admin)->post(route('salaries.generate'), ['period' => '2026-09']);
    $this->actingAs($this->admin)->post(route('salaries.generate'), ['period' => '2026-09']);

    expect(Salary::where('user_id', $employee->id)->where('salary_type', 'base_salary')->count())->toBe(1)
        ->and((float) $employee->fresh()->salary_balance)->toEqual(2000000.0);
});

test('payroll generation re-checks under the lock for a run that finished concurrently', function () {
    $employee = User::factory()->create(['role' => 'teacher', 'branch_id' => $this->branch->id, 'base_salary' => 2000000]);

    // Simulate a concurrent run committing between the pre-fetch and the row lock:
    // the second read of the employee is the locked one.
    $reads = 0;
    User::retrieved(function (User $user) use ($employee, &$reads) {
        if ($user->id === $employee->id && ++$reads === 2) {
            Salary::create([
                'branch_id' => $employee->branch_id, 'user_id' => $employee->id, 'period' => '2026-09',
                'salary_type' => 'base_salary', 'amount' => 2000000, 'is_deduction' => false, 'accrued_at' => now(),
            ]);
        }
    });

    $this->actingAs($this->admin)->post(route('salaries.generate'), ['period' => '2026-09'])->assertRedirect();

    expect($reads)->toBeGreaterThanOrEqual(2)
        ->and(Salary::where('user_id', $employee->id)->where('salary_type', 'base_salary')->count())->toBe(1)
        ->and((float) $employee->fresh()->salary_balance)->toEqual(0.0);
});

test('marking a group journal twice reuses one session credited to the group teacher', function () {
    $teacher = User::factory()->create(['role' => 'teacher', 'branch_id' => $this->branch->id]);
    $group = Group::create(['name' => 'Jurnal', 'branch_id' => $this->branch->id, 'teacher_id' => $teacher->id]);
    $student = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $group->id]);
    $payload = ['group_id' => $group->id, 'date' => '2026-09-20', 'attendances' => [['student_id' => $student->id, 'status' => 'present']]];

    $this->actingAs($this->admin)->post('/admin/attendance/mark-group', $payload)->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/admin/attendance/mark-group', $payload)->assertSessionHasNoErrors();

    expect(LessonSession::where('group_id', $group->id)->count())->toBe(1)
        ->and(LessonSession::where('group_id', $group->id)->value('teacher_id'))->toBe($teacher->id);
});

test('a group journal only accepts students of that group', function () {
    $group = Group::create(['name' => 'Jurnal', 'branch_id' => $this->branch->id]);
    $outsider = Student::factory()->create(['branch_id' => $this->branch->id]);

    $this->actingAs($this->admin)->post('/admin/attendance/mark-group', [
        'group_id' => $group->id,
        'date' => '2026-09-20',
        'attendances' => [['student_id' => $outsider->id, 'status' => 'present']],
    ])->assertSessionHasErrors('attendances.0.student_id');
});

test('records with financial history cannot be deleted', function () {
    $contract = contractFor($this->branch, $this->admin);
    $employee = User::factory()->create(['role' => 'teacher', 'branch_id' => $this->branch->id]);
    Salary::create(['branch_id' => $this->branch->id, 'user_id' => $employee->id, 'period' => '2026-09', 'salary_type' => 'base_salary', 'amount' => 1000, 'accrued_at' => now()]);

    $this->actingAs($this->admin)->delete("/admin/students/{$contract->student_id}")->assertSessionHasErrors('delete');
    $this->actingAs($this->admin)->delete("/admin/staff/{$employee->id}")->assertSessionHasErrors('delete');
    $secondBranch = Branch::firstOrCreate(['code' => 'fin-int-2'], ['name' => 'Ikkinchi', 'status' => 'active']);
    Student::factory()->create(['branch_id' => $secondBranch->id]);
    $this->actingAs($this->superAdmin)->delete("/admin/branches/{$secondBranch->id}")->assertSessionHasErrors('delete');

    expect(Student::whereKey($contract->student_id)->exists())->toBeTrue()
        ->and(User::whereKey($employee->id)->exists())->toBeTrue()
        ->and(Branch::whereKey($secondBranch->id)->exists())->toBeTrue();
});

test('maintenance paid from a register without enough balance is not saved', function () {
    $register = fundedRegister($this->branch, 100000);
    $vehicle = Vehicle::create(['branch_id' => $this->branch->id, 'make_model' => 'Cobalt', 'plate_number' => '01B777BB', 'status' => 'active']);

    $this->actingAs($this->admin)->post("/admin/vehicles/{$vehicle->id}/maintenances", [
        'maintenance_type' => 'Moy almashtirish',
        'cost' => 500000,
        'performed_date' => now()->toDateString(),
        'cash_register_id' => $register->id,
    ])->assertSessionHasErrors('cash_register_id');

    expect(VehicleMaintenance::count())->toBe(0)
        ->and((float) $register->fresh()->balance)->toEqual(100000.0);
});

test('amounts above the column capacity are rejected by validation', function () {
    $register = fundedRegister($this->branch, 0);
    $category = ExpenseCategory::firstOrCreate(['name' => 'Boshqa'], ['is_active' => true]);

    $this->actingAs($this->admin)->post('/admin/finance/expense', [
        'cash_register_id' => $register->id,
        'expense_category_id' => $category->id,
        'amount' => 99999999999999,
        'description' => 'Katta',
    ])->assertSessionHasErrors('amount');
});
