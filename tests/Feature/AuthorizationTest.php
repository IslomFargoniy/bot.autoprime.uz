<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransfer;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Salary;
use App\Models\User;
use App\Services\BranchSessionService;
use Illuminate\Support\Facades\Hash;

/**
 * @return array{salary: Salary, expense: Expense, transfer: CashTransfer}
 */
function createFinanceFixtures(): array
{
    $branch = Branch::firstOrCreate(['code' => 'fin-fixture'], ['name' => 'Fixture', 'status' => 'active']);
    $employee = User::factory()->create(['role' => 'teacher', 'branch_id' => $branch->id]);
    $type = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true]);
    $registers = collect([1, 2])->map(fn ($i) => CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $type->id,
        'name' => "Kassa {$i}",
        'balance' => 1000000,
        'is_active' => true,
    ]));

    return [
        'salary' => Salary::create(['branch_id' => $branch->id, 'user_id' => $employee->id, 'period' => '2026-09', 'salary_type' => 'base_salary', 'amount' => 100000, 'accrued_at' => now()]),
        'expense' => Expense::create([
            'branch_id' => $branch->id,
            'cash_register_id' => $registers[0]->id,
            'expense_category_id' => ExpenseCategory::firstOrCreate(['name' => 'Boshqa'], ['is_active' => true])->id,
            'amount' => 1000,
            'spent_at' => now(),
        ]),
        'transfer' => CashTransfer::create(['from_cash_register_id' => $registers[0]->id, 'to_cash_register_id' => $registers[1]->id, 'amount' => 1000, 'status' => 'pending']),
    ];
}

test('a user gets the spatie role matching the role column and keeps it in sync', function () {
    $user = User::factory()->create(['role' => 'kassir']);

    expect($user->hasRole('kassir'))->toBeTrue();

    $user->update(['role' => 'accountant']);

    expect($user->fresh()->getRoleNames()->all())->toBe(['accountant']);
});

test('roles without the permission are forbidden from protected actions', function (string $role, string $method, string $uri) {
    $user = User::factory()->create(['role' => $role]);

    $this->actingAs($user)->{$method}($uri)->assertForbidden();
})->with([
    'instructor opening finance' => ['instructor', 'get', '/admin/finance'],
    'instructor creating a lead' => ['instructor', 'post', '/admin/leads'],
    'instructor paying salaries' => ['instructor', 'post', fn () => '/admin/salaries/'.createFinanceFixtures()['salary']->id.'/pay'],
    'instructor managing tickets' => ['instructor', 'post', '/admin/tests/tickets'],
    'instructor issuing certificates' => ['instructor', 'post', '/admin/certificates'],
    'teacher opening finance' => ['teacher', 'get', '/admin/finance'],
    'reception creating staff' => ['reception', 'post', '/admin/staff'],
    'kassir deleting expenses' => ['kassir', 'delete', fn () => '/admin/finance/expense/'.createFinanceFixtures()['expense']->id],
    'admin approving transfers' => ['admin', 'post', fn () => '/admin/finance/transfer/'.createFinanceFixtures()['transfer']->id.'/approve'],
    'admin managing admins' => ['admin', 'get', '/admin/admins'],
]);

test('each role can open the pages its sidebar shows', function (string $role, string $uri) {
    $user = User::factory()->create(['role' => $role]);

    $this->actingAs($user)->get($uri)->assertSuccessful();
})->with([
    'instructor dashboard' => ['instructor', '/admin/dashboard'],
    'instructor drivings' => ['instructor', '/admin/drivings'],
    'instructor vehicles' => ['instructor', '/admin/vehicles'],
    'kassir finance' => ['kassir', '/admin/finance'],
    'kassir salaries' => ['kassir', '/admin/salaries'],
    'reception leads' => ['reception', '/admin/leads'],
    'teacher attendance' => ['teacher', '/admin/attendance'],
    'accountant finance' => ['accountant', '/admin/finance'],
]);

test('superadmin bypasses permission checks', function () {
    $superAdmin = User::factory()->create(['role' => 'superadmin']);

    $this->actingAs($superAdmin)->get('/admin/admins')->assertSuccessful();
});

test('an admin cannot take over the superadmin through the instructors endpoint', function () {
    $superAdmin = User::factory()->create(['role' => 'superadmin', 'password' => Hash::make('original-secret')]);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)->put("/admin/instructors/{$superAdmin->id}", [
        'name' => 'Hacked',
        'phone' => '+998900000001',
        'password' => 'new-password',
    ])->assertNotFound();

    $this->actingAs($admin)->delete("/admin/instructors/{$superAdmin->id}")->assertNotFound();

    expect(Hash::check('original-secret', $superAdmin->fresh()->password))->toBeTrue();
});

test('a branch admin cannot manage staff of another branch', function () {
    $branchA = Branch::firstOrCreate(['code' => 'auth-a'], ['name' => 'A', 'status' => 'active']);
    $branchB = Branch::firstOrCreate(['code' => 'auth-b'], ['name' => 'B', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branchA->id]);
    $otherStaff = User::factory()->create(['role' => 'teacher', 'branch_id' => $branchB->id]);

    $this->actingAs($admin)->getJson("/admin/staff/{$otherStaff->id}")->assertForbidden();
    $this->actingAs($admin)->put("/admin/staff/{$otherStaff->id}", [
        'name' => 'Changed',
        'phone' => $otherStaff->phone,
        'role' => 'teacher',
    ])->assertForbidden();
    $this->actingAs($admin)->delete("/admin/staff/{$otherStaff->id}")->assertForbidden();

    expect($otherStaff->fresh())->not->toBeNull();
});

test('a branch admin cannot create a superadmin or place staff in another branch', function () {
    $branchA = Branch::firstOrCreate(['code' => 'auth-a'], ['name' => 'A', 'status' => 'active']);
    $branchB = Branch::firstOrCreate(['code' => 'auth-b'], ['name' => 'B', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branchA->id]);

    $this->actingAs($admin)->post('/admin/staff', [
        'name' => 'Boss',
        'phone' => '+998900000002',
        'role' => 'superadmin',
        'password' => 'secret123',
    ])->assertForbidden();

    $this->actingAs($admin)->post('/admin/staff', [
        'name' => 'Teacher',
        'phone' => '+998900000003',
        'role' => 'teacher',
        'branch_id' => $branchB->id,
        'password' => 'secret123',
    ])->assertRedirect();

    expect(User::where('phone', '+998900000003')->value('branch_id'))->toBe($branchA->id);
});

test('every non-superadmin with a branch is locked to that branch', function (string $role) {
    $branch = Branch::firstOrCreate(['code' => 'lock-branch'], ['name' => 'Lock', 'status' => 'active']);
    $user = User::factory()->create(['role' => $role, 'branch_id' => $branch->id]);

    $this->actingAs($user);
    session(['selected_branch_id' => 'all']);

    expect(BranchSessionService::getActiveBranchId())->toBe((string) $branch->id);
})->with(['admin', 'teacher', 'reception', 'kassir', 'accountant', 'instructor']);

test('shared inertia props expose the current user permissions', function () {
    $user = User::factory()->create(['role' => 'kassir']);

    $this->actingAs($user)->get('/admin/finance')
        ->assertInertia(fn ($page) => $page
            ->where('auth.is_super_admin', false)
            ->where('auth.permissions', fn ($permissions) => collect($permissions)->contains('salaries.pay')
                && ! collect($permissions)->contains('users.manage')));
});
