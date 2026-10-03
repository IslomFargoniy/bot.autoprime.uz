<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransfer;
use App\Models\Certificate;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Group;
use App\Models\Lead;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'money'], ['name' => 'Pul Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
});

function moneyRegister(Branch $branch, float $balance = 0, string $name = 'Kassa'): CashRegister
{
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => $name.' '.fake()->unique()->numerify('###'),
        'balance' => 0,
        'is_active' => true,
    ]);

    if ($balance > 0) {
        $register->deposit($balance, 'initial', 'Boshlang\'ich qoldiq');
    }

    return $register->fresh();
}

/** A contract that costs 2 400 000 and has nothing paid yet. */
function debtContract(array $overrides = []): Contract
{
    $student = Student::factory()->create(['branch_id' => test()->branch->id]);

    return openDrivingContract($student, [
        'total_amount' => 2400000, 'final_amount' => 2400000, 'paid_amount' => 0, 'debt_amount' => 2400000,
        'payment_status' => 'unpaid', ...$overrides,
    ]);
}

function payOn(Contract $contract, CashRegister $register, int $amount)
{
    return test()->actingAs(test()->admin)->post('/admin/finance/payment', [
        'contract_id' => $contract->id, 'cash_register_id' => $register->id, 'amount' => $amount, 'payment_method' => 'cash',
    ]);
}

test('a payment larger than the debt is refused and nothing moves', function () {
    $register = moneyRegister($this->branch);
    $contract = debtContract();

    payOn($contract, $register, 5000000)->assertSessionHasErrors('amount');

    expect(Payment::count())->toBe(0)
        ->and((float) $register->fresh()->balance)->toBe(0.0)
        ->and((float) $contract->fresh()->debt_amount)->toBe(2400000.0)
        ->and((float) $contract->fresh()->overpaid_amount)->toBe(0.0);
});

test('a payment of exactly the debt settles the contract and then no more can be taken', function () {
    $register = moneyRegister($this->branch);
    $contract = debtContract();

    payOn($contract, $register, 2400000)->assertSessionHasNoErrors();

    expect((float) $contract->fresh()->debt_amount)->toBe(0.0)
        ->and($contract->fresh()->payment_status)->toBe('paid')
        ->and((float) $contract->fresh()->overpaid_amount)->toBe(0.0);

    payOn($contract, $register, 1000)->assertSessionHasErrors('amount');
    expect(Payment::count())->toBe(1);
});

test('partial payments add up to the debt and the last one is capped by what is left', function () {
    $register = moneyRegister($this->branch);
    $contract = debtContract();

    payOn($contract, $register, 1000000)->assertSessionHasNoErrors();
    payOn($contract, $register, 1500000)->assertSessionHasErrors('amount');
    payOn($contract, $register, 1400000)->assertSessionHasNoErrors();

    expect((float) $contract->fresh()->debt_amount)->toBe(0.0)->and(Payment::count())->toBe(2);
});

test('a completed contract takes no payment, a frozen one does', function () {
    $register = moneyRegister($this->branch);

    payOn(debtContract(['status' => 'completed']), $register, 1000)->assertSessionHasErrors('contract_id');
    payOn(debtContract(['status' => 'frozen']), $register, 1000)->assertSessionHasNoErrors();

    expect(Payment::count())->toBe(1);
});

test('the payment form offers only contracts that still have a debt to pay', function () {
    $owing = debtContract();
    debtContract(['paid_amount' => 2400000, 'debt_amount' => 0, 'payment_status' => 'paid']);
    debtContract(['status' => 'cancelled']);

    $ids = collect($this->actingAs($this->admin)->get('/admin/finance')->inertiaProps('contracts'))->pluck('id')->all();

    expect($ids)->toBe([$owing->id]);
});

test('the payment of a contract with a certificate cannot be deleted', function () {
    $register = moneyRegister($this->branch);
    $contract = debtContract();
    payOn($contract, $register, 2400000)->assertSessionHasNoErrors();
    Certificate::create([
        'branch_id' => $this->branch->id, 'student_id' => $contract->student_id, 'contract_id' => $contract->id,
        'certificate_number' => 'CERT-M-0001', 'qr_verify_hash' => 'hash-money', 'category' => 'B',
        'issued_date' => now()->toDateString(), 'status' => 'issued',
    ]);
    $payment = Payment::firstOrFail();

    $this->actingAs($this->admin)->delete("/admin/finance/payment/{$payment->id}")->assertSessionHasErrors('payment');

    expect(Payment::whereKey($payment->id)->exists())->toBeTrue()
        ->and((float) $register->fresh()->balance)->toBe(2400000.0);
});

test('a discount above the tariff price is refused on a contract and on a lead conversion', function () {
    $tariff = ContractType::create(['branch_id' => $this->branch->id, 'name' => 'Tarif', 'category' => 'B', 'price' => 3000000, 'is_active' => true]);
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $lead = Lead::create(['branch_id' => $this->branch->id, 'full_name' => 'Chegirma', 'phone' => '+998901234500', 'source' => 'walk_in', 'stage' => 'new_lead']);

    $this->actingAs($this->admin)->post('/admin/contracts', [
        'student_id' => $student->id, 'contract_type_id' => $tariff->id, 'discount_amount' => 3000001,
    ])->assertSessionHasErrors('discount_amount');
    $this->actingAs($this->admin)->post(route('leads.convert', $lead), [
        'contract_type_id' => $tariff->id, 'discount_amount' => 5000000,
    ])->assertSessionHasErrors('discount_amount');

    expect(Contract::count())->toBe(0)->and(Student::count())->toBe(1);

    $this->actingAs($this->admin)->post('/admin/contracts', [
        'student_id' => $student->id, 'contract_type_id' => $tariff->id, 'discount_amount' => 3000000,
    ])->assertSessionHasNoErrors();

    expect((float) Contract::firstOrFail()->final_amount)->toBe(0.0);
});

test('transfers waiting for approval are taken off the balance before another one is sent', function () {
    $other = Branch::firstOrCreate(['code' => 'money-b'], ['name' => 'Boshqa Filial', 'status' => 'active']);
    $from = moneyRegister($this->branch, 1000000);
    $abroad = moneyRegister($other);
    $own = moneyRegister($this->branch);
    $send = fn (CashRegister $to, int $amount) => $this->actingAs($this->admin)->post('/admin/finance/transfer', [
        'from_cash_register_id' => $from->id, 'to_cash_register_id' => $to->id, 'amount' => $amount,
    ]);

    $send($abroad, 700000)->assertSessionHasNoErrors();
    expect(CashTransfer::where('status', 'pending')->count())->toBe(1);

    $send($abroad, 700000)->assertSessionHasErrors('amount');
    $send($own, 400000)->assertSessionHasErrors('amount');
    expect(CashTransfer::count())->toBe(1);

    $send($own, 300000)->assertSessionHasNoErrors();
    expect((float) $from->fresh()->balance)->toBe(700000.0);
});

test('the seats of a group cannot be cut below its active students, graduates take no seat', function () {
    $group = Group::create(['name' => 'Sig\'im', 'branch_id' => $this->branch->id, 'category' => 'B', 'max_students' => 10]);
    Student::factory()->count(2)->create(['branch_id' => $this->branch->id, 'group_id' => $group->id]);
    Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $group->id, 'status' => 'graduated']);
    $update = fn (int $max) => $this->actingAs($this->admin)->put("/admin/groups/{$group->id}", [
        'name' => $group->name, 'category' => 'B', 'max_students' => $max,
    ]);

    $update(1)->assertSessionHasErrors('max_students');
    expect($group->fresh()->max_students)->toBe(10);

    $update(2)->assertSessionHasNoErrors();
    expect($group->fresh()->max_students)->toBe(2);
});

test('maintenance cannot be dated in the future or read an odometer lower than the vehicle has', function () {
    $vehicle = Vehicle::create([
        'branch_id' => $this->branch->id, 'make_model' => 'Cobalt', 'plate_number' => '01A123BC', 'status' => 'active', 'current_mileage' => 50000,
    ]);
    $post = fn (array $extra) => $this->actingAs($this->admin)->post("/admin/vehicles/{$vehicle->id}/maintenances", [
        'maintenance_type' => 'Moy almashtirish', 'cost' => 0, 'performed_date' => now()->toDateString(), 'odometer' => 51000, ...$extra,
    ]);

    $post(['performed_date' => now()->addDays(3)->toDateString()])->assertSessionHasErrors('performed_date');
    $post(['odometer' => 49000])->assertSessionHasErrors('odometer');
    $post(['next_due_date' => now()->subDay()->toDateString()])->assertSessionHasErrors('next_due_date');
    expect(VehicleMaintenance::count())->toBe(0);

    $post([])->assertSessionHasNoErrors();
    expect(VehicleMaintenance::count())->toBe(1)->and($vehicle->fresh()->current_mileage)->toBe(51000);
});
