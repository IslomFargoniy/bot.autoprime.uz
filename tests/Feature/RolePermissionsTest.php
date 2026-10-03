<?php

use App\Models\Attempt;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransfer;
use App\Models\Contract;
use App\Models\ContractType;
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

function roleRegister(Branch $branch, float $balance): CashRegister
{
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => 'Kassa '.fake()->unique()->numerify('###'),
        'balance' => 0,
        'is_active' => true,
    ]);
    if ($balance > 0) {
        $register->deposit($balance, 'initial', 'Boshlang\'ich qoldiq');
    }

    return $register->fresh();
}

function roleContract(Branch $branch, Student $student, User $creator): Contract
{
    $type = ContractType::firstOrCreate(['name' => 'Rol Kurs'], ['branch_id' => $branch->id, 'category' => 'B', 'price' => 3000000, 'is_active' => true]);

    return Contract::create([
        'branch_id' => $branch->id, 'student_id' => $student->id, 'contract_type_id' => $type->id,
        'created_by_user_id' => $creator->id, 'contract_number' => 'ROL-'.fake()->unique()->numerify('#####'),
        'contract_date' => now()->toDateString(), 'total_amount' => 3000000, 'final_amount' => 3000000,
        'debt_amount' => 3000000, 'status' => 'active', 'payment_status' => 'unpaid',
    ]);
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

test('staff cannot grant a permission they do not hold themselves', function () {
    $kassir = staffMember('kassir');
    $manager = staffMember('reception');
    $manager->givePermissionTo(['users.view', 'users.manage', 'roles.manage']);

    $this->actingAs($manager)->put(route('staff.update-permissions', $kassir), [
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

test('the sender of a cash transfer cannot approve or reject it themselves', function () {
    $sender = staffMember('accountant');
    $from = roleRegister($this->branch, 1000000);
    $to = roleRegister($this->branch, 0);
    $transfer = CashTransfer::create([
        'from_cash_register_id' => $from->id, 'to_cash_register_id' => $to->id, 'amount' => 400000,
        'status' => 'pending', 'sent_by_user_id' => $sender->id,
    ]);

    $this->actingAs($sender)->post("/admin/finance/transfer/{$transfer->id}/approve")->assertSessionHasErrors('transfer');
    $this->actingAs($sender)->post("/admin/finance/transfer/{$transfer->id}/reject")->assertSessionHasErrors('transfer');
    expect($transfer->fresh()->status)->toBe('pending');

    $this->actingAs(staffMember('accountant'))->post("/admin/finance/transfer/{$transfer->id}/approve")->assertSessionHasNoErrors();
    expect($transfer->fresh()->status)->toBe('approved')
        ->and((float) $to->fresh()->balance)->toEqual(400000.0);
});

test('test attempts are limited to the branch and to a teacher\'s own students', function () {
    $teacher = staffMember('teacher');
    $ownGroup = Group::create(['name' => 'Test guruh', 'branch_id' => $this->branch->id, 'teacher_id' => $teacher->id]);
    $otherBranch = Branch::firstOrCreate(['code' => 'roles-b'], ['name' => 'Boshqa filial', 'status' => 'active']);

    $attemptFor = fn (Student $student) => Attempt::create([
        'student_id' => $student->id, 'attempt_type' => 'random_mock', 'is_passed' => true, 'started_at' => now(), 'finished_at' => now(),
    ]);
    $own = $attemptFor(Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $ownGroup->id]));
    $sameBranch = $attemptFor(Student::factory()->create(['branch_id' => $this->branch->id]));
    $foreign = $attemptFor(Student::factory()->create(['branch_id' => $otherBranch->id]));

    $ids = fn (User $user) => collect($this->actingAs($user)->get('/admin/tests')->assertSuccessful()->viewData('page')['props']['attempts']['data'])->pluck('id')->sort()->values()->all();

    expect($ids($this->admin))->toBe(collect([$own->id, $sameBranch->id])->sort()->values()->all())
        ->and($ids($teacher))->toBe([$own->id])
        ->and($foreign->id)->not->toBeIn($ids($this->admin));
});

test('a teacher with extra student permissions can only place students into own groups', function () {
    $teacher = staffMember('teacher');
    $teacher->givePermissionTo(['students.edit']);
    $ownGroup = Group::create(['name' => 'Mening', 'branch_id' => $this->branch->id, 'teacher_id' => $teacher->id]);
    $otherGroup = Group::create(['name' => 'Begona', 'branch_id' => $this->branch->id, 'teacher_id' => staffMember('teacher')->id]);

    $student = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $ownGroup->id, 'phone' => '+998901110003']);

    $this->actingAs($teacher)->put("/admin/students/{$student->id}", ['full_name' => 'Ali', 'phone' => $student->phone, 'group_id' => $otherGroup->id])
        ->assertSessionHasErrors('group_id');
    $this->actingAs($teacher)->put("/admin/students/{$student->id}", ['full_name' => 'Vali', 'phone' => $student->phone])
        ->assertSessionHasErrors('group_id');
    $this->actingAs($teacher)->put("/admin/students/{$student->id}", ['full_name' => 'Soli', 'phone' => $student->phone, 'group_id' => $ownGroup->id])
        ->assertSessionHasNoErrors();

    $this->actingAs($teacher)->put("/admin/students/{$student->id}", ['full_name' => 'Soli', 'phone' => $student->phone, 'group_id' => $otherGroup->id])
        ->assertSessionHasErrors('group_id');

    expect($student->fresh()->group_id)->toBe($ownGroup->id);
});

test('a teacher with contract permissions only sees contracts of own students', function () {
    $teacher = staffMember('teacher');
    $teacher->givePermissionTo(['contracts.view', 'contracts.print']);
    $ownGroup = Group::create(['name' => 'Shartnoma guruh', 'branch_id' => $this->branch->id, 'teacher_id' => $teacher->id]);
    $own = roleContract($this->branch, Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $ownGroup->id]), $this->admin);
    $other = roleContract($this->branch, Student::factory()->create(['branch_id' => $this->branch->id]), $this->admin);

    $this->actingAs($teacher)->get('/admin/contracts')
        ->assertInertia(fn ($page) => $page->where('contracts.data', fn ($rows) => collect($rows)->pluck('id')->all() === [$own->id]));
    $this->actingAs($teacher)->get("/admin/contracts/{$other->id}/download-pdf")->assertForbidden();
});

test('staff without a branch cannot sign in, a branchless superadmin can', function () {
    $branchless = User::factory()->create(['role' => 'reception', 'branch_id' => null, 'telegram_id' => '880001']);
    $superAdmin = User::factory()->create(['role' => 'superadmin', 'branch_id' => null, 'telegram_id' => '880002']);

    expect($branchless->canSignIn())->toBeFalse()
        ->and($superAdmin->canSignIn())->toBeTrue()
        ->and($branchless->isBranchRestricted())->toBeTrue();

    $this->postJson('/api/telegram-auth', ['initData' => signedTelegramInitData(880001)])->assertForbidden();
    $this->actingAs($branchless)->get(route('students.index'))->assertRedirect(route('login'));
});

test('a superadmin must pick a branch when creating staff', function () {
    $superAdmin = User::factory()->create(['role' => 'superadmin']);

    $this->actingAs($superAdmin)->post('/admin/staff', [
        'name' => 'Filialsiz',
        'phone' => '+998900000077',
        'role' => 'kassir',
        'password' => 'secret123',
    ])->assertSessionHasErrors('branch_id');
});
