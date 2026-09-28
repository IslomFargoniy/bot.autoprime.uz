<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\Driving;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Salary;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'roles'], ['name' => 'Rollar Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
});

function staffMember(string $role, array $attributes = []): User
{
    return User::factory()->create(['role' => $role, 'branch_id' => test()->branch->id, ...$attributes]);
}

test('admins and superadmins do not appear on the staff page and cannot be edited there', function () {
    $otherAdmin = staffMember('admin');
    $teacher = staffMember('teacher');

    $this->actingAs($this->admin)->get('/admin/staff')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->where('staff.data', fn ($rows) => collect($rows)->pluck('id')->contains($teacher->id)
                && ! collect($rows)->pluck('id')->contains($otherAdmin->id)));

    $this->actingAs($this->admin)->put("/admin/staff/{$otherAdmin->id}", [
        'name' => 'Hijacked', 'phone' => $otherAdmin->phone, 'role' => 'teacher', 'password' => 'newpass123',
    ])->assertForbidden();

    expect($otherAdmin->fresh()->name)->not->toBe('Hijacked');
});

test('payroll skips admins and rejects adjustments for admins', function () {
    $this->admin->update(['base_salary' => 3000000]);
    $teacher = staffMember('teacher', ['base_salary' => 2000000]);

    $this->actingAs(staffMember('accountant'))->post(route('salaries.generate'), ['period' => '2026-09'])->assertRedirect();

    expect(Salary::where('user_id', $this->admin->id)->exists())->toBeFalse()
        ->and(Salary::where('user_id', $teacher->id)->exists())->toBeTrue();

    $this->actingAs(staffMember('accountant'))->post(route('salaries.store-adjustment'), [
        'user_id' => $this->admin->id, 'period' => '2026-09', 'type' => 'bonus', 'amount' => 500000, 'description' => 'Bonus',
    ])->assertSessionHasErrors('user_id');

    expect((float) $this->admin->fresh()->salary_balance)->toEqual(0.0);
});

test('nobody can accrue or pay their own salary', function () {
    $accountant = staffMember('accountant');

    $this->actingAs($accountant)->post(route('salaries.store-adjustment'), [
        'user_id' => $accountant->id, 'period' => '2026-09', 'type' => 'bonus', 'amount' => 500000, 'description' => 'O\'zimga',
    ])->assertSessionHasErrors('user_id');

    $salary = Salary::create(['branch_id' => $this->branch->id, 'user_id' => $accountant->id, 'period' => '2026-09', 'salary_type' => 'base_salary', 'amount' => 1000000, 'accrued_at' => now()]);
    $register = CashRegister::create([
        'branch_id' => $this->branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => 'Kassa', 'balance' => 0, 'is_active' => true,
    ]);
    $register->deposit(5000000, 'initial', 'Boshlang\'ich qoldiq');

    $this->actingAs($accountant)->post(route('salaries.pay', $salary), [
        'cash_register_id' => $register->id, 'amount' => 1000000, 'payment_method' => 'cash',
    ])->assertSessionHasErrors('amount');

    expect((float) $register->fresh()->balance)->toEqual(5000000.0);
});

test('a teacher only sees and runs lessons of their own groups', function () {
    $teacher = staffMember('teacher');
    $ownGroup = Group::create(['name' => 'Mening guruhim', 'branch_id' => $this->branch->id, 'teacher_id' => $teacher->id]);
    $otherGroup = Group::create(['name' => 'Begona guruh', 'branch_id' => $this->branch->id, 'teacher_id' => staffMember('teacher')->id]);
    $ownStudent = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $ownGroup->id]);
    $otherStudent = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $otherGroup->id]);

    $this->actingAs($teacher)->get('/admin/groups')
        ->assertInertia(fn ($page) => $page->where('groups.data', fn ($rows) => collect($rows)->pluck('id')->all() === [$ownGroup->id]));
    $this->actingAs($teacher)->get('/admin/students')
        ->assertInertia(fn ($page) => $page->where('students.data', fn ($rows) => collect($rows)->pluck('id')->all() === [$ownStudent->id]));
    $this->actingAs($teacher)->get("/admin/students/{$otherStudent->id}")->assertForbidden();

    $journal = fn (Group $group, Student $student) => [
        'group_id' => $group->id, 'date' => '2026-09-20', 'attendances' => [['student_id' => $student->id, 'status' => 'present']],
    ];
    $this->actingAs($teacher)->post('/admin/attendance/mark-group', $journal($otherGroup, $otherStudent))->assertForbidden();
    $this->actingAs($teacher)->post('/admin/attendance/start-session', ['group_id' => $otherGroup->id])->assertForbidden();
    $this->actingAs($teacher)->post('/admin/attendance/mark-group', $journal($ownGroup, $ownStudent))->assertSessionHasNoErrors();

    expect(LessonSession::where('group_id', $otherGroup->id)->exists())->toBeFalse()
        ->and(LessonSession::where('group_id', $ownGroup->id)->value('teacher_id'))->toBe($teacher->id);
});

test('an instructor cannot change or delete another instructor\'s lesson', function () {
    $instructor = staffMember('instructor');
    $otherDriving = Driving::create([
        'instructor_id' => staffMember('instructor')->id,
        'student_id' => Student::factory()->create(['branch_id' => $this->branch->id])->id,
        'branch_id' => $this->branch->id,
        'start_time' => now()->addDay(), 'end_time' => now()->addDay()->addHour(), 'status' => 'scheduled',
    ]);

    $this->actingAs($instructor)->put("/admin/drivings/{$otherDriving->id}", ['status' => 'cancelled'])->assertForbidden();
    $this->actingAs($instructor)->delete("/admin/drivings/{$otherDriving->id}")->assertForbidden();

    expect($otherDriving->fresh()->status)->toBe('scheduled');
});

test('a receptionist granted cashier permissions can open the finance page', function () {
    $reception = staffMember('reception');

    $this->actingAs($reception)->get('/admin/finance')->assertForbidden();

    $this->actingAs($this->admin)->put(route('staff.update-permissions', $reception), [
        'permissions' => config('roles.roles.kassir'),
    ])->assertSessionHasNoErrors();

    $this->actingAs($reception->fresh())->get('/admin/finance')->assertSuccessful();
    expect($reception->fresh()->getDirectPermissions()->pluck('name')->all())->not->toContain('payments.create');
});

test('an admin cannot grant a permission they do not hold themselves', function () {
    $kassir = staffMember('kassir');

    $this->actingAs($this->admin)->put(route('staff.update-permissions', $kassir), [
        'permissions' => ['cash_transfers.approve'],
    ])->assertSessionHasErrors('permissions');

    expect($kassir->fresh()->checkPermissionTo('cash_transfers.approve'))->toBeFalse();
});

test('a teacher granted the instructor capability can be assigned as a group instructor', function () {
    $teacher = staffMember('teacher');

    $this->actingAs($this->admin)->post('/admin/groups', ['name' => 'Aralash', 'instructor_id' => $teacher->id])
        ->assertSessionHasErrors('instructor_id');

    $this->actingAs($this->admin)->put(route('staff.update-permissions', $teacher), [
        'permissions' => ['drivings.conduct', 'drivings.view', 'drivings.manage'],
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->post('/admin/groups', ['name' => 'Aralash', 'instructor_id' => $teacher->id, 'teacher_id' => $teacher->id])
        ->assertSessionHasNoErrors();

    expect($teacher->fresh()->conductsDrivings())->toBeTrue()
        ->and(Group::where('name', 'Aralash')->value('instructor_id'))->toBe($teacher->id);
});

test('admins and superadmins never count as instructors or teachers', function () {
    $superAdmin = User::factory()->create(['role' => 'superadmin']);

    expect($this->admin->conductsDrivings())->toBeFalse()
        ->and($this->admin->teachesLessons())->toBeFalse()
        ->and($superAdmin->conductsDrivings())->toBeFalse()
        ->and($superAdmin->teachesLessons())->toBeFalse();
});

test('staff without the dashboard land on their first permitted page', function (string $role, string $home) {
    $this->actingAs(staffMember($role))->get('/dashboard')->assertRedirect($home);
})->with([
    'kassir' => ['kassir', '/admin/finance'],
    'accountant' => ['accountant', '/admin/finance'],
    'teacher' => ['teacher', '/admin/attendance'],
    'reception' => ['reception', '/admin/dashboard'],
]);
