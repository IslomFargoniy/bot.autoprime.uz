<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'cat-a'], ['name' => 'A filial', 'status' => 'active']);
    $this->otherBranch = Branch::firstOrCreate(['code' => 'cat-b'], ['name' => 'B filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
    $this->superadmin = User::factory()->create(['role' => 'superadmin', 'branch_id' => null]);
});

function categoryRegister(Branch $branch, float $balance = 1000000): CashRegister
{
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => 'Kassa '.fake()->unique()->numerify('####'),
        'balance' => 0,
        'is_active' => true,
    ]);
    $register->deposit($balance, 'initial', 'Boshlang\'ich qoldiq');

    return $register->fresh();
}

test('an admin adds categories to their own branch only', function () {
    $this->actingAs($this->admin)
        ->post('/admin/expense-categories', ['name' => 'Ijara', 'branch_id' => $this->otherBranch->id])
        ->assertSessionHasNoErrors();

    expect(ExpenseCategory::where('name', 'Ijara')->value('branch_id'))->toBe($this->branch->id);

    $this->actingAs($this->admin)
        ->post('/admin/expense-categories', ['name' => 'Ijara'])
        ->assertSessionHasErrors('name');
});

test('the superadmin can create a shared category and the same name may exist in another branch', function () {
    $this->actingAs($this->superadmin)
        ->post('/admin/expense-categories', ['name' => 'Internet'])
        ->assertSessionHasNoErrors();
    $this->actingAs($this->superadmin)
        ->post('/admin/expense-categories', ['name' => 'Internet', 'branch_id' => $this->branch->id])
        ->assertSessionHasNoErrors();

    expect(ExpenseCategory::where('name', 'Internet')->count())->toBe(2);
});

test('categories can be renamed, switched off and deleted when unused', function () {
    $category = ExpenseCategory::create(['branch_id' => $this->branch->id, 'name' => 'Eski', 'is_active' => true]);

    $this->actingAs($this->admin)
        ->put("/admin/expense-categories/{$category->id}", ['name' => 'Yangi', 'is_active' => false])
        ->assertSessionHasNoErrors();
    expect($category->fresh())->name->toBe('Yangi')->is_active->toBeFalse();

    $this->actingAs($this->admin)->delete("/admin/expense-categories/{$category->id}")->assertSessionHasNoErrors();
    expect(ExpenseCategory::find($category->id))->toBeNull();
});

test('a category with expenses cannot be deleted', function () {
    $category = ExpenseCategory::create(['branch_id' => $this->branch->id, 'name' => 'Ishlatilgan', 'is_active' => true]);
    $register = categoryRegister($this->branch);

    $this->actingAs($this->admin)->post('/admin/finance/expense', [
        'cash_register_id' => $register->id,
        'expense_category_id' => $category->id,
        'amount' => 1000,
        'description' => 'Test',
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->delete("/admin/expense-categories/{$category->id}")->assertSessionHasErrors('delete');

    expect(ExpenseCategory::find($category->id))->not->toBeNull();
});

test('a system category can be renamed but not switched off or deleted', function () {
    $salary = ExpenseCategory::system(ExpenseCategory::SALARY);

    $this->actingAs($this->superadmin)
        ->put("/admin/expense-categories/{$salary->id}", ['name' => 'Maoshlar', 'is_active' => false])
        ->assertSessionHasErrors('is_active');
    $this->actingAs($this->superadmin)
        ->put("/admin/expense-categories/{$salary->id}", ['name' => 'Maoshlar'])
        ->assertSessionHasNoErrors();
    $this->actingAs($this->superadmin)->delete("/admin/expense-categories/{$salary->id}")->assertSessionHasErrors('delete');

    expect($salary->fresh())->name->toBe('Maoshlar')->is_active->toBeTrue();
});

test('a renamed system category is reused, not duplicated, when salary is paid', function () {
    $salary = ExpenseCategory::system(ExpenseCategory::SALARY);
    $salary->update(['name' => 'Maoshlar']);

    expect(ExpenseCategory::system(ExpenseCategory::SALARY)->id)->toBe($salary->id)
        ->and(ExpenseCategory::where('code', ExpenseCategory::SALARY)->count())->toBe(1)
        ->and(ExpenseCategory::where('name', ExpenseCategory::SYSTEM_NAMES[ExpenseCategory::SALARY])->exists())->toBeFalse();
});

test('a branch admin cannot edit shared or foreign categories', function () {
    $shared = ExpenseCategory::create(['name' => 'Umumiy', 'is_active' => true]);
    $foreign = ExpenseCategory::create(['branch_id' => $this->otherBranch->id, 'name' => 'Begona', 'is_active' => true]);

    foreach ([$shared, $foreign] as $category) {
        $this->actingAs($this->admin)->put("/admin/expense-categories/{$category->id}", ['name' => 'X'])->assertForbidden();
        $this->actingAs($this->admin)->delete("/admin/expense-categories/{$category->id}")->assertForbidden();
    }
});

test('an expense cannot use another branch\'s or a switched-off category', function () {
    $register = categoryRegister($this->branch);
    $foreign = ExpenseCategory::create(['branch_id' => $this->otherBranch->id, 'name' => 'Begona', 'is_active' => true]);
    $off = ExpenseCategory::create(['branch_id' => $this->branch->id, 'name' => 'O\'chiq', 'is_active' => false]);

    foreach ([$foreign, $off] as $category) {
        $this->actingAs($this->admin)->post('/admin/finance/expense', [
            'cash_register_id' => $register->id,
            'expense_category_id' => $category->id,
            'amount' => 1000,
            'description' => 'Test',
        ])->assertSessionHasErrors('expense_category_id');
    }

    expect(Expense::count())->toBe(0);
});

test('only the categories an admin may use are listed on the finance page', function () {
    ExpenseCategory::create(['branch_id' => $this->otherBranch->id, 'name' => 'Begona', 'is_active' => true]);
    ExpenseCategory::create(['branch_id' => $this->branch->id, 'name' => 'Oz', 'is_active' => true]);
    ExpenseCategory::create(['branch_id' => $this->branch->id, 'name' => 'Nofaol', 'is_active' => false]);

    $this->actingAs($this->admin)->get('/admin/finance')->assertInertia(fn ($page) => $page
        ->where('expenseCategories', fn ($rows) => collect($rows)->pluck('name')->contains('Oz')
            && ! collect($rows)->pluck('name')->contains('Begona')
            && ! collect($rows)->pluck('name')->contains('Nofaol'))
        ->where('manageableExpenseCategories', fn ($rows) => collect($rows)->pluck('name')->contains('Nofaol')
            && ! collect($rows)->pluck('name')->contains('Begona')));
});
