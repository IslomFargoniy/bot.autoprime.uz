<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransfer;
use App\Models\ExpenseCategory;
use App\Models\User;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true]);
    $this->cardType = CashRegisterType::firstOrCreate(['code' => 'card_terminal'], ['name' => 'Terminal', 'is_active' => true]);
    $this->branch = Branch::firstOrCreate(['code' => 'reg-a'], ['name' => 'A filial', 'status' => 'active']);
    $this->otherBranch = Branch::firstOrCreate(['code' => 'reg-b'], ['name' => 'B filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
    $this->superadmin = User::factory()->create(['role' => 'superadmin', 'branch_id' => null]);
});

function makeRegister(Branch $branch, string $name = 'Kassa', float $balance = 0, ?CashRegisterType $type = null): CashRegister
{
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => ($type ?? test()->cashType)->id,
        'name' => $name,
        'balance' => 0,
        'is_active' => true,
    ]);

    if ($balance > 0) {
        $register->deposit($balance, 'initial', 'Boshlang\'ich qoldiq');
    }

    return $register->fresh();
}

test('an admin creates a register for their own branch with an empty balance', function () {
    $this->actingAs($this->admin)
        ->post('/admin/cash-registers', [
            'branch_id' => $this->otherBranch->id,
            'cash_register_type_id' => $this->cashType->id,
            'name' => 'Yangi kassa',
            'balance' => 5000000,
        ])
        ->assertSessionHasNoErrors();

    $register = CashRegister::where('name', 'Yangi kassa')->first();

    expect($register->branch_id)->toBe($this->branch->id)
        ->and((float) $register->balance)->toBe(0.0)
        ->and($register->is_active)->toBeTrue();
});

test('register names are unique inside a branch and inactive types are refused', function () {
    makeRegister($this->branch, 'Asosiy');
    $closedType = CashRegisterType::create(['code' => 'old', 'name' => 'Eski', 'is_active' => false]);

    $this->actingAs($this->admin)
        ->post('/admin/cash-registers', ['cash_register_type_id' => $this->cashType->id, 'name' => 'Asosiy'])
        ->assertSessionHasErrors('name');

    $this->actingAs($this->admin)
        ->post('/admin/cash-registers', ['cash_register_type_id' => $closedType->id, 'name' => 'Boshqa'])
        ->assertSessionHasErrors('cash_register_type_id');
});

test('a register holding money cannot be switched off or deleted', function () {
    $register = makeRegister($this->branch, 'Pulli', 100000);

    $this->actingAs($this->admin)
        ->put("/admin/cash-registers/{$register->id}", ['name' => 'Pulli', 'is_active' => false])
        ->assertSessionHasErrors('is_active');

    $this->actingAs($this->admin)
        ->delete("/admin/cash-registers/{$register->id}")
        ->assertSessionHasErrors('delete');

    expect($register->fresh()->is_active)->toBeTrue()
        ->and(CashRegister::find($register->id))->not->toBeNull();
});

test('an emptied register with history can be switched off but not deleted', function () {
    $register = makeRegister($this->branch, 'Bo\'shatilgan', 50000);
    $register->withdraw(50000, 'expense', 'Chiqim');

    $this->actingAs($this->admin)
        ->put("/admin/cash-registers/{$register->id}", ['name' => 'Bo\'shatilgan', 'is_active' => false])
        ->assertSessionHasNoErrors();
    expect($register->fresh()->is_active)->toBeFalse();

    $this->actingAs($this->admin)
        ->delete("/admin/cash-registers/{$register->id}")
        ->assertSessionHasErrors('delete');
    expect(CashRegister::find($register->id))->not->toBeNull();
});

test('a register with a pending transfer cannot be switched off', function () {
    $register = makeRegister($this->branch, 'Kutayotgan');
    $other = makeRegister($this->branch, 'Boshqa', 10000);
    CashTransfer::create([
        'from_cash_register_id' => $other->id,
        'to_cash_register_id' => $register->id,
        'amount' => 1000,
        'status' => 'pending',
        'transferred_by_user_id' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->put("/admin/cash-registers/{$register->id}", ['name' => 'Kutayotgan', 'is_active' => false])
        ->assertSessionHasErrors('is_active');
});

test('a register without any history can be renamed, retyped and deleted', function () {
    $register = makeRegister($this->branch, 'Eski nom');

    $this->actingAs($this->admin)
        ->put("/admin/cash-registers/{$register->id}", ['name' => 'Yangi nom', 'cash_register_type_id' => $this->cardType->id])
        ->assertSessionHasNoErrors();

    expect($register->fresh()->only(['name', 'cash_register_type_id']))
        ->toBe(['name' => 'Yangi nom', 'cash_register_type_id' => $this->cardType->id]);

    $this->actingAs($this->admin)->delete("/admin/cash-registers/{$register->id}")->assertSessionHasNoErrors();
    expect(CashRegister::find($register->id))->toBeNull();
});

test('the type of a register with history cannot change', function () {
    $register = makeRegister($this->branch, 'Tarixli', 1000);

    $this->actingAs($this->admin)
        ->put("/admin/cash-registers/{$register->id}", ['name' => 'Tarixli', 'cash_register_type_id' => $this->cardType->id])
        ->assertSessionHasErrors('cash_register_type_id');

    expect($register->fresh()->cash_register_type_id)->toBe($this->cashType->id);
});

test('an admin cannot touch registers of another branch or the central ones', function () {
    $foreign = makeRegister($this->otherBranch, 'Begona');
    $central = CashRegister::getSuperadminRegisterForType($this->cashType->id);

    $this->actingAs($this->admin)->put("/admin/cash-registers/{$foreign->id}", ['name' => 'X'])->assertForbidden();
    $this->actingAs($this->admin)->delete("/admin/cash-registers/{$foreign->id}")->assertForbidden();
    $this->actingAs($this->admin)->put("/admin/cash-registers/{$central->id}", ['name' => 'X'])->assertForbidden();
    $this->actingAs($this->admin)->delete("/admin/cash-registers/{$central->id}")->assertForbidden();
});

test('the superadmin may rename a central register but nothing else', function () {
    $central = CashRegister::getSuperadminRegisterForType($this->cashType->id);

    $this->actingAs($this->superadmin)
        ->put("/admin/cash-registers/{$central->id}", ['name' => 'Bosh kassa', 'is_active' => false, 'cash_register_type_id' => $this->cardType->id])
        ->assertSessionHasNoErrors();

    expect($central->fresh())
        ->name->toBe('Bosh kassa')
        ->is_active->toBeTrue()
        ->cash_register_type_id->toBe($this->cashType->id);

    $this->actingAs($this->superadmin)->delete("/admin/cash-registers/{$central->id}")->assertSessionHasErrors('delete');
});

test('a switched-off register is refused for payments, expenses and transfers', function () {
    $inactive = makeRegister($this->branch, 'Nofaol', 100000);
    $inactive->update(['is_active' => false]);
    $active = makeRegister($this->branch, 'Faol', 100000);

    $this->actingAs($this->admin)
        ->post('/admin/finance/expense', [
            'cash_register_id' => $inactive->id,
            'expense_category_id' => ExpenseCategory::system(ExpenseCategory::SALARY)->id,
            'amount' => 1000,
            'description' => 'Test',
        ])
        ->assertSessionHasErrors('cash_register_id');

    $this->actingAs($this->admin)
        ->post('/admin/finance/transfer', [
            'from_cash_register_id' => $active->id,
            'to_cash_register_id' => $inactive->id,
            'amount' => 1000,
        ])
        ->assertSessionHasErrors('to_cash_register_id');
});

test('a new branch gets one empty register per active type and can be deleted again', function () {
    $this->actingAs($this->superadmin)
        ->post('/admin/branches', ['name' => 'Yangi filial', 'code' => 'fresh', 'status' => 'active'])
        ->assertSessionHasNoErrors();

    $branch = Branch::where('code', 'fresh')->first();
    $types = CashRegisterType::where('is_active', true)->count();

    expect($branch->cashRegisters()->count())->toBe($types)
        ->and($branch->cashRegisters()->where('balance', '!=', 0)->exists())->toBeFalse();

    $this->actingAs($this->superadmin)->delete("/admin/branches/{$branch->id}")->assertSessionHasNoErrors();

    expect(Branch::find($branch->id))->toBeNull()
        ->and(CashRegister::where('branch_id', $branch->id)->exists())->toBeFalse()
        ->and(CashRegister::whereNull('branch_id')->where('name', 'like', 'Yangi filial%')->exists())->toBeFalse();
});

test('a branch whose register holds money cannot be deleted', function () {
    $branch = Branch::create(['code' => 'rich', 'name' => 'Boy filial', 'status' => 'active']);
    makeRegister($branch, 'Pulli', 5000);

    $this->actingAs($this->superadmin)->delete("/admin/branches/{$branch->id}")->assertSessionHasErrors('delete');

    expect(Branch::find($branch->id))->not->toBeNull();
});
