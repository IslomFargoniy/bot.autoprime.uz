<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Student;
use App\Models\User;
use App\Services\DocumentNumberService;
use App\Services\TelegramService;

function createNumberedContract(string $contractNumber): Contract
{
    $branch = Branch::firstOrCreate(['code' => 'number-branch'], ['name' => 'Raqam Filial', 'status' => 'active']);
    $contractType = ContractType::firstOrCreate(
        ['name' => 'Raqam Kurs'],
        ['branch_id' => $branch->id, 'category' => 'B', 'price' => 1000000, 'is_active' => true]
    );

    return Contract::create([
        'branch_id' => $branch->id,
        'student_id' => Student::factory()->create(['branch_id' => $branch->id])->id,
        'contract_type_id' => $contractType->id,
        'contract_number' => $contractNumber,
        'contract_date' => now()->toDateString(),
        'total_amount' => 1000000,
        'final_amount' => 1000000,
        'debt_amount' => 1000000,
        'status' => 'active',
        'payment_status' => 'unpaid',
    ]);
}

test('next contract number starts at one for the current year', function () {
    expect(DocumentNumberService::nextContractNumber())->toBe('AP-'.date('Y').'-0001');
});

test('next contract number does not collide after a contract is deleted', function () {
    $year = date('Y');
    createNumberedContract("AP-{$year}-0001");
    $middle = createNumberedContract("AP-{$year}-0002");
    createNumberedContract("AP-{$year}-0003");

    $middle->delete();

    expect(DocumentNumberService::nextContractNumber())->toBe("AP-{$year}-0004");
});

test('sequence ignores numbers from other prefixes and orders past four digits', function () {
    $year = date('Y');
    createNumberedContract('AP-2020-0050');
    createNumberedContract("AP-{$year}-9999");
    createNumberedContract("AP-{$year}-10000");

    expect(DocumentNumberService::nextContractNumber())->toBe("AP-{$year}-10001");
});

test('creating contracts via the admin endpoint produces unique sequential numbers', function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $branch = Branch::firstOrCreate(['code' => 'number-branch'], ['name' => 'Raqam Filial', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);
    $contractType = ContractType::create(['branch_id' => $branch->id, 'name' => 'Kurs', 'category' => 'B', 'price' => 1000000, 'is_active' => true]);

    foreach (Student::factory()->count(2)->create(['branch_id' => $branch->id]) as $student) {
        $this->actingAs($admin)->post(route('contracts.store'), [
            'student_id' => $student->id,
            'contract_type_id' => $contractType->id,
        ])->assertSessionHasNoErrors();
    }

    expect(Contract::pluck('contract_number')->all())
        ->toBe(['AP-'.date('Y').'-0001', 'AP-'.date('Y').'-0002']);
});

test('every new expense gets a unique EXP number whichever flow creates it', function () {
    $branch = Branch::firstOrCreate(['code' => 'exp-num'], ['name' => 'Raqam', 'status' => 'active']);
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => 'Kassa', 'balance' => 0, 'is_active' => true,
    ]);
    $category = ExpenseCategory::create(['name' => 'Boshqa', 'is_active' => true]);
    $make = fn () => Expense::create([
        'branch_id' => $branch->id, 'cash_register_id' => $register->id, 'expense_category_id' => $category->id,
        'amount' => 1000, 'spent_at' => now(),
    ]);

    $first = $make();
    $second = $make();

    expect($first->receipt_number)->toBe('EXP-'.date('Ymd').'-0001')
        ->and($second->receipt_number)->toBe('EXP-'.date('Ymd').'-0002');
});
