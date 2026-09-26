<?php

use App\Models\Branch;
use App\Models\Contract;
use App\Models\ContractType;
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
