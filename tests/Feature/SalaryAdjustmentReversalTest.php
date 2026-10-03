<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\FinancialHistory;
use App\Models\Salary;
use App\Models\SalaryPayment;
use App\Models\User;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'sal-a'], ['name' => 'A filial', 'status' => 'active']);
    $this->otherBranch = Branch::firstOrCreate(['code' => 'sal-b'], ['name' => 'B filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
    $this->employee = User::factory()->create(['role' => 'reception', 'branch_id' => $this->branch->id, 'salary_balance' => 0]);
});

function addAdjustment(string $type, int $amount = 200000): Salary
{
    test()->actingAs(test()->admin)->post('/admin/salaries/adjustment', [
        'user_id' => test()->employee->id,
        'period' => now()->format('Y-m'),
        'type' => $type,
        'amount' => $amount,
        'description' => 'Test yozuvi',
    ])->assertSessionHasNoErrors();

    return Salary::where('user_id', test()->employee->id)->where('salary_type', $type)->latest('id')->firstOrFail();
}

test('cancelling a bonus takes the amount back from the balance and logs a reversal', function () {
    $bonus = addAdjustment('bonus');
    expect((float) $this->employee->fresh()->salary_balance)->toBe(200000.0);

    $this->actingAs($this->admin)->delete("/admin/salaries/{$bonus->id}")->assertSessionHasNoErrors();

    $reversal = FinancialHistory::where('category', 'adjustment_reversal')->latest('id')->first();

    expect(Salary::find($bonus->id))->toBeNull()
        ->and((float) $this->employee->fresh()->salary_balance)->toBe(0.0)
        ->and($reversal)->not->toBeNull()
        ->and($reversal->type)->toBe('debit')
        ->and((float) $reversal->amount)->toBe(200000.0)
        ->and((float) $reversal->balance_after)->toBe(0.0);
});

test('cancelling a fine or an advance gives the money back to the balance', function (string $type) {
    $entry = addAdjustment($type, 50000);
    expect((float) $this->employee->fresh()->salary_balance)->toBe(-50000.0);

    $this->actingAs($this->admin)->delete("/admin/salaries/{$entry->id}")->assertSessionHasNoErrors();

    expect(Salary::find($entry->id))->toBeNull()
        ->and((float) $this->employee->fresh()->salary_balance)->toBe(0.0)
        ->and(FinancialHistory::where('category', 'adjustment_reversal')->latest('id')->first()->type)->toBe('credit');
})->with(['fine', 'advance']);

test('an entry that was already paid out cannot be cancelled', function () {
    $bonus = addAdjustment('bonus');
    $register = CashRegister::create([
        'branch_id' => $this->branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => 'Kassa',
        'balance' => 0,
        'is_active' => true,
    ]);
    SalaryPayment::create([
        'salary_id' => $bonus->id,
        'user_id' => $this->employee->id,
        'cash_register_id' => $register->id,
        'paid_by_user_id' => $this->admin->id,
        'amount' => 1000,
        'payment_method' => 'cash',
        'paid_at' => now(),
    ]);

    $this->actingAs($this->admin)->delete("/admin/salaries/{$bonus->id}")->assertSessionHasErrors('delete');

    expect(Salary::find($bonus->id))->not->toBeNull()
        ->and((float) $this->employee->fresh()->salary_balance)->toBe(200000.0);
});

test('a regular salary accrual cannot be cancelled', function () {
    $salary = Salary::create([
        'branch_id' => $this->branch->id,
        'user_id' => $this->employee->id,
        'created_by_user_id' => $this->admin->id,
        'period' => now()->format('Y-m'),
        'salary_type' => 'salary',
        'amount' => 3000000,
        'is_deduction' => false,
        'accrued_at' => now(),
    ]);

    $this->actingAs($this->admin)->delete("/admin/salaries/{$salary->id}")->assertSessionHasErrors('delete');

    expect(Salary::find($salary->id))->not->toBeNull();
});

test('only users with the accrue permission from the right branch can cancel an entry', function () {
    $bonus = addAdjustment('bonus');
    $foreignAdmin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->otherBranch->id]);
    $instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id]);

    $this->actingAs($foreignAdmin)->delete("/admin/salaries/{$bonus->id}")->assertForbidden();
    $this->actingAs($instructor)->delete("/admin/salaries/{$bonus->id}")->assertForbidden();

    expect(Salary::find($bonus->id))->not->toBeNull();
});
