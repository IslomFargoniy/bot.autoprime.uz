<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransaction;
use App\Models\ExpenseCategory;
use App\Models\Group;
use App\Models\Student;
use App\Models\User;

beforeEach(function () {
    $this->branchA = Branch::firstOrCreate(['code' => 'iso-a'], ['name' => 'Filial A', 'status' => 'active']);
    $this->branchB = Branch::firstOrCreate(['code' => 'iso-b'], ['name' => 'Filial B', 'status' => 'active']);
    $this->adminA = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branchA->id]);
    $this->cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true]);
});

function registerIn(Branch $branch, int $balance = 5000000): CashRegister
{
    return CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => "Kassa {$branch->name}",
        'balance' => $balance,
        'is_active' => true,
    ]);
}

test('a branch admin cannot view, update or delete a student of another branch', function () {
    $foreignStudent = Student::factory()->create(['branch_id' => $this->branchB->id]);

    $this->actingAs($this->adminA)->get("/admin/students/{$foreignStudent->id}")->assertForbidden();
    $this->actingAs($this->adminA)->put("/admin/students/{$foreignStudent->id}", ['full_name' => 'X', 'phone' => '+998901234567'])->assertForbidden();
    $this->actingAs($this->adminA)->delete("/admin/students/{$foreignStudent->id}")->assertForbidden();

    expect($foreignStudent->fresh())->not->toBeNull();
});

test('a branch admin can still manage students of their own branch', function () {
    $ownStudent = Student::factory()->create(['branch_id' => $this->branchA->id]);

    $this->actingAs($this->adminA)->get("/admin/students/{$ownStudent->id}")->assertSuccessful();
});

test('a branch admin cannot spend from another branch cash register', function () {
    $foreignRegister = registerIn($this->branchB);
    $category = ExpenseCategory::firstOrCreate(['name' => 'Boshqa'], ['is_active' => true]);

    $this->actingAs($this->adminA)->post('/admin/finance/expense', [
        'cash_register_id' => $foreignRegister->id,
        'expense_category_id' => $category->id,
        'amount' => 100000,
        'description' => 'Yechib olish',
    ])->assertSessionHasErrors('cash_register_id');

    expect((float) $foreignRegister->fresh()->balance)->toEqual(5000000.0);
});

test('a branch admin cannot move a record into another branch', function () {
    $group = Group::create(['name' => 'G-A', 'branch_id' => $this->branchA->id]);

    $this->actingAs($this->adminA)->put("/admin/groups/{$group->id}", [
        'name' => 'G-A renamed',
        'branch_id' => $this->branchB->id,
    ]);

    expect($group->fresh()->branch_id)->toBe($this->branchA->id);
});

test('ledger history of another branch register is not visible through history_register_id', function () {
    $foreignRegister = registerIn($this->branchB);
    CashTransaction::create([
        'cash_register_id' => $foreignRegister->id,
        'type' => 'income',
        'category' => 'payment',
        'amount' => 1000,
        'balance_before' => 0,
        'balance_after' => 1000,
        'description' => 'Maxfiy',
        'transacted_at' => now(),
    ]);

    $this->actingAs($this->adminA)
        ->get("/admin/finance?history_register_id={$foreignRegister->id}")
        ->assertInertia(fn ($page) => $page->where('transactions.total', 0));
});

test('an instructor cannot open a student outside their groups', function () {
    $instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branchA->id]);
    $otherInstructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branchA->id]);
    $otherGroup = Group::create(['name' => 'Other', 'branch_id' => $this->branchA->id, 'instructor_id' => $otherInstructor->id]);
    $student = Student::factory()->create(['branch_id' => $this->branchA->id, 'group_id' => $otherGroup->id]);

    $this->actingAs($instructor)->get("/admin/students/{$student->id}")->assertForbidden();
    $this->actingAs($instructor)->get("/admin/groups/{$otherGroup->id}/export-students")->assertForbidden();
});
