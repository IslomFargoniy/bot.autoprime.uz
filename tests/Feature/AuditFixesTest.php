<?php

use App\Models\Autodrome;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashTransfer;
use App\Models\Certificate;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Driving;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Payment;
use App\Models\Salary;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'audit'], ['name' => 'Audit Filial', 'status' => 'active']);
    $this->otherBranch = Branch::firstOrCreate(['code' => 'audit2'], ['name' => 'Audit Filial 2', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
});

function auditStaff(string $role, ?int $branchId = null, array $attributes = []): User
{
    return User::factory()->create(['role' => $role, 'branch_id' => $branchId ?? test()->branch->id, ...$attributes]);
}

function auditRegister(?int $branchId, float $balance = 0, string $typeCode = 'cash'): CashRegister
{
    $register = CashRegister::create([
        'branch_id' => $branchId,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => $typeCode], ['name' => $typeCode, 'is_active' => true])->id,
        'name' => 'Kassa '.fake()->unique()->numerify('####'),
        'balance' => 0,
        'is_active' => true,
    ]);
    if ($balance > 0) {
        $register->deposit($balance, 'initial', 'Boshlang\'ich qoldiq');
    }

    return $register->fresh();
}

function auditContract(Student $student, float $amount = 3000000): Contract
{
    $type = ContractType::firstOrCreate(['name' => 'Audit Kurs'], ['branch_id' => test()->branch->id, 'category' => 'B', 'price' => $amount, 'is_active' => true]);

    return Contract::create([
        'branch_id' => test()->branch->id, 'student_id' => $student->id, 'contract_type_id' => $type->id,
        'created_by_user_id' => test()->admin->id, 'contract_number' => 'AUD-'.fake()->unique()->numerify('#####'),
        'contract_date' => now()->toDateString(), 'total_amount' => $amount, 'final_amount' => $amount,
        'debt_amount' => $amount, 'status' => 'active', 'payment_status' => 'unpaid',
    ]);
}

test('starting and finishing an attendance session redirects to existing routes', function () {
    $teacher = auditStaff('teacher');
    $group = Group::create(['name' => 'Davomat', 'branch_id' => $this->branch->id, 'teacher_id' => $teacher->id]);

    $response = $this->actingAs($teacher)->post(route('attendance.start-session'), ['group_id' => $group->id]);
    $session = LessonSession::where('group_id', $group->id)->firstOrFail();
    $response->assertRedirect(route('attendance.screen', $session->id));

    $this->actingAs($teacher)->post(route('attendance.finish-session', $session))
        ->assertRedirect(route('attendance.index'));
    expect($session->fresh()->status)->toBe('finished');
});

function auditDriving(User $instructor, array $attributes = []): Driving
{
    return Driving::create([
        'branch_id' => test()->branch->id,
        'instructor_id' => $instructor->id,
        'student_id' => Student::factory()->create(['branch_id' => test()->branch->id])->id,
        'start_time' => now()->subHours(2), 'end_time' => now()->subHour(), 'status' => 'scheduled',
        ...$attributes,
    ]);
}

test('an instructor completes a lesson only inside the autodrome radius', function () {
    $instructor = auditStaff('instructor');
    $autodrome = Autodrome::create(['branch_id' => $this->branch->id, 'name' => 'Poligon', 'latitude' => 41.3111, 'longitude' => 69.2797, 'radius_meters' => 200]);
    $driving = auditDriving($instructor, ['autodrome_id' => $autodrome->id]);

    $this->actingAs($instructor)->put("/admin/drivings/{$driving->id}", ['status' => 'completed'])
        ->assertSessionHasErrors('status');
    $this->actingAs($instructor)->put("/admin/drivings/{$driving->id}", ['status' => 'completed', 'latitude' => 41.40, 'longitude' => 69.40])
        ->assertSessionHasErrors('status');
    expect($driving->fresh()->status)->toBe('scheduled');

    $this->actingAs($instructor)->put("/admin/drivings/{$driving->id}", ['status' => 'completed', 'latitude' => 41.3112, 'longitude' => 69.2798])
        ->assertSessionHasNoErrors();
    expect($driving->fresh()->status)->toBe('completed');
});

test('a lesson that has not started yet cannot be completed by anyone', function () {
    $instructor = auditStaff('instructor');
    $driving = auditDriving($instructor, ['start_time' => now()->addDay(), 'end_time' => now()->addDay()->addHour()]);

    $this->actingAs($this->admin)->put("/admin/drivings/{$driving->id}", ['status' => 'completed'])->assertSessionHasErrors('status');
    $this->actingAs($instructor)->put("/admin/drivings/{$driving->id}", ['status' => 'completed'])->assertSessionHasErrors('status');

    expect($driving->fresh()->status)->toBe('scheduled');
});

test('an admin may complete a past lesson without a position', function () {
    $driving = auditDriving(auditStaff('instructor'));

    $this->actingAs($this->admin)->put("/admin/drivings/{$driving->id}", ['status' => 'completed'])->assertSessionHasNoErrors();

    expect($driving->fresh()->status)->toBe('completed');
});

test('branch staff cannot spend from a central register', function () {
    $central = auditRegister(null, 1000000);
    $accountant = auditStaff('accountant');
    $category = ExpenseCategory::create(['name' => 'Boshqa', 'is_active' => true]);

    $this->actingAs($accountant)->post(route('finance.store-expense'), [
        'cash_register_id' => $central->id, 'expense_category_id' => $category->id, 'amount' => 500000, 'description' => 'Test',
    ])->assertSessionHasErrors('cash_register_id');

    expect((float) $central->fresh()->balance)->toEqual(1000000.0)
        ->and(Expense::count())->toBe(0);

    $own = auditRegister($this->branch->id, 1000000);
    $this->actingAs($accountant)->post(route('finance.store-expense'), [
        'cash_register_id' => $own->id, 'expense_category_id' => $category->id, 'amount' => 500000, 'description' => 'Test',
    ])->assertSessionHasNoErrors();
});

test('a branch accountant cannot approve a sweep, only a superadmin can', function () {
    $branchRegister = auditRegister($this->branch->id, 1000000);
    $central = auditRegister(null);
    $sender = auditStaff('kassir');
    $transfer = CashTransfer::create([
        'from_cash_register_id' => $branchRegister->id, 'to_cash_register_id' => $central->id,
        'sent_by_user_id' => $sender->id, 'amount' => 400000, 'status' => 'pending',
    ]);

    $this->actingAs(auditStaff('accountant'))->post(route('finance.approve-transfer', $transfer))->assertSessionHasErrors('transfer');
    $this->actingAs(auditStaff('accountant'))->post(route('finance.reject-transfer', $transfer))->assertSessionHasErrors('transfer');
    expect($transfer->fresh()->status)->toBe('pending');

    $superadmin = User::factory()->create(['role' => 'superadmin', 'branch_id' => null]);
    $this->actingAs($superadmin)->post(route('finance.approve-transfer', $transfer))->assertSessionHasNoErrors();

    expect($transfer->fresh()->status)->toBe('approved')
        ->and((float) $central->fresh()->balance)->toEqual(400000.0);
});

test('only the receiving branch approves an inter-branch transfer', function () {
    $from = auditRegister($this->branch->id, 1000000);
    $to = auditRegister($this->otherBranch->id);
    $transfer = CashTransfer::create([
        'from_cash_register_id' => $from->id, 'to_cash_register_id' => $to->id,
        'sent_by_user_id' => auditStaff('kassir')->id, 'amount' => 300000, 'status' => 'pending',
    ]);

    $this->actingAs(auditStaff('accountant'))->post(route('finance.approve-transfer', $transfer))->assertSessionHasErrors('transfer');
    expect($transfer->fresh()->status)->toBe('pending');

    $this->actingAs(auditStaff('accountant', $this->otherBranch->id))->post(route('finance.approve-transfer', $transfer))->assertSessionHasNoErrors();
    expect($transfer->fresh()->status)->toBe('approved');
});

test('staff can only hand out roles whose permissions they hold', function () {
    $payload = fn (string $role) => [
        'name' => 'Yangi xodim', 'phone' => '+99890'.fake()->unique()->numerify('#######'), 'role' => $role, 'password' => 'secret123',
    ];

    $this->actingAs($this->admin)->post('/admin/staff', $payload('accountant'))->assertSessionHasNoErrors();
    expect(User::where('role', 'accountant')->exists())->toBeTrue();

    $manager = auditStaff('kassir');
    $manager->givePermissionTo(['users.view', 'users.manage']);

    $this->actingAs($manager)->post('/admin/staff', $payload('accountant'))->assertSessionHasErrors('role');
    expect(User::where('role', 'accountant')->count())->toBe(1);

    $kassir = auditStaff('kassir');
    $this->actingAs($manager)->put("/admin/staff/{$kassir->id}", [
        'name' => $kassir->name, 'phone' => $kassir->phone, 'role' => 'accountant',
    ])->assertSessionHasErrors('role');
    expect($kassir->fresh()->role)->toBe('kassir');
});

test('a branch admin approves transfers into their branch but not register sweeps', function () {
    $from = auditRegister($this->otherBranch->id, 1000000);
    $own = auditRegister($this->branch->id);
    $central = auditRegister(null);
    $sender = auditStaff('kassir', $this->otherBranch->id);

    $interBranch = CashTransfer::create([
        'from_cash_register_id' => $from->id, 'to_cash_register_id' => $own->id,
        'sent_by_user_id' => $sender->id, 'amount' => 300000, 'status' => 'pending',
    ]);
    $sweep = CashTransfer::create([
        'from_cash_register_id' => auditRegister($this->branch->id, 500000)->id, 'to_cash_register_id' => $central->id,
        'sent_by_user_id' => $sender->id, 'amount' => 200000, 'status' => 'pending',
    ]);

    $this->actingAs($this->admin)->post(route('finance.approve-transfer', $sweep))->assertSessionHasErrors('transfer');
    expect($sweep->fresh()->status)->toBe('pending');

    $this->actingAs($this->admin)->post(route('finance.approve-transfer', $interBranch))->assertSessionHasNoErrors();
    expect($interBranch->fresh()->status)->toBe('approved');
});

test('payroll covers the current month, never a future one, and never the actor', function () {
    $actor = auditStaff('accountant', null, ['base_salary' => 1000000]);
    $teacher = auditStaff('teacher', null, ['base_salary' => 2000000]);

    $this->actingAs($actor)->post(route('salaries.generate'), ['period' => now()->addMonth()->format('Y-m')])->assertSessionHasErrors('period');
    expect(Salary::count())->toBe(0);

    $this->actingAs($actor)->post(route('salaries.generate'), ['period' => now()->format('Y-m')])->assertSessionHasNoErrors();

    expect(Salary::where('user_id', $teacher->id)->exists())->toBeTrue()
        ->and(Salary::where('user_id', $actor->id)->exists())->toBeFalse();
});

test('an instructor cannot book a student of another instructor', function () {
    $instructor = auditStaff('instructor');
    $foreignStudent = Student::factory()->create(['branch_id' => $this->branch->id]);

    $this->actingAs($instructor)->post('/admin/drivings', [
        'instructor_id' => $instructor->id, 'student_ids' => [$foreignStudent->id],
        'start_time' => now()->addDay()->toDateTimeString(), 'end_time' => now()->addDay()->addHour()->toDateTimeString(),
    ])->assertForbidden();

    expect(Driving::count())->toBe(0);
});

test('qr attendance needs an active contract', function () {
    $teacher = auditStaff('teacher');
    $group = Group::create(['name' => 'QR', 'branch_id' => $this->branch->id, 'teacher_id' => $teacher->id]);
    $student = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $group->id, 'telegram_id' => '922922']);
    $session = LessonSession::create([
        'branch_id' => $this->branch->id, 'group_id' => $group->id, 'teacher_id' => $teacher->id, 'topic' => 'Dars',
        'qr_secret_salt' => bin2hex(random_bytes(16)), 'started_at' => now(), 'status' => 'active',
    ]);

    $this->withHeader('X-Telegram-Init-Data', signedTelegramInitData(922922))
        ->postJson('/api/attendance/scan-qr', ['qr_token' => $session->generateQrToken()])
        ->assertForbidden();

    expect($session->attendances()->count())->toBe(0);
});

test('a revoked certificate is reported as invalid', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $certificate = Certificate::create([
        'branch_id' => $this->branch->id, 'student_id' => $student->id, 'contract_id' => auditContract($student)->id,
        'certificate_number' => 'CERT-T-0001', 'qr_verify_hash' => 'hash-valid', 'category' => 'B',
        'issued_date' => now()->toDateString(), 'status' => 'issued',
    ]);

    $this->getJson(route('certificates.verify', 'hash-valid'))->assertJson(['valid' => true]);

    $certificate->update(['status' => 'revoked']);
    $this->getJson(route('certificates.verify', 'hash-valid'))->assertJson(['valid' => false, 'status' => 'revoked']);
});

test('refunds and salary payouts must use a register of the matching type', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $contract = auditContract($student);
    $cashRegister = auditRegister($this->branch->id, 5000000, 'cash');
    $cardRegister = auditRegister($this->branch->id, 5000000, 'card_click');

    $this->actingAs($this->admin)->post(route('finance.store-payment'), [
        'contract_id' => $contract->id, 'cash_register_id' => $cashRegister->id, 'amount' => 1000000, 'payment_method' => 'cash',
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->post(route('contracts.refund', $contract), [
        'cash_register_id' => $cardRegister->id, 'amount' => 100000, 'payment_method' => 'cash',
    ])->assertSessionHasErrors('cash_register_id');
    expect((float) $cardRegister->fresh()->balance)->toEqual(5000000.0);

    $teacher = auditStaff('teacher');
    $salary = Salary::create(['branch_id' => $this->branch->id, 'user_id' => $teacher->id, 'period' => '2026-09', 'salary_type' => 'base_salary', 'amount' => 1000000, 'accrued_at' => now()]);
    $this->actingAs($this->admin)->post(route('salaries.pay', $salary), [
        'cash_register_id' => $cardRegister->id, 'amount' => 500000, 'payment_method' => 'cash',
    ])->assertSessionHasErrors('cash_register_id');
    expect((float) $cardRegister->fresh()->balance)->toEqual(5000000.0);
});

test('deleting a refund payment removes only its own expense', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $contract = auditContract($student);
    $register = auditRegister($this->branch->id, 5000000);
    $category = ExpenseCategory::create(['name' => 'Boshqa', 'is_active' => true]);

    $this->actingAs($this->admin)->post(route('finance.store-payment'), [
        'contract_id' => $contract->id, 'cash_register_id' => $register->id, 'amount' => 1000000, 'payment_method' => 'cash',
    ])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post(route('contracts.refund', $contract), [
        'cash_register_id' => $register->id, 'amount' => 200000, 'payment_method' => 'cash',
    ])->assertSessionHasNoErrors();

    $refund = Payment::where('payment_type', 'refund')->firstOrFail();
    $unrelated = Expense::create([
        'branch_id' => $this->branch->id, 'cash_register_id' => $register->id, 'expense_category_id' => $category->id,
        'user_id' => $this->admin->id, 'amount' => 200000, 'description' => "Eslatma: {$refund->receipt_number} bilan bog'liq emas", 'spent_at' => now(),
    ]);

    $this->actingAs($this->admin)->delete(route('finance.destroy-payment', $refund))->assertSessionHasNoErrors();

    expect(Expense::whereKey($unrelated->id)->exists())->toBeTrue()
        ->and(Expense::where('description', 'like', "To'lovni qaytarish%")->exists())->toBeFalse();
});

test('the finance page tells which pending transfers the user may review', function () {
    $from = auditRegister($this->branch->id, 1000000);
    $to = auditRegister($this->otherBranch->id);
    $sender = auditStaff('kassir');
    $transfer = CashTransfer::create([
        'from_cash_register_id' => $from->id, 'to_cash_register_id' => $to->id,
        'sent_by_user_id' => $sender->id, 'amount' => 100000, 'status' => 'pending',
    ]);

    $canReview = fn (User $user): bool => (bool) collect($this->actingAs($user)->get('/admin/finance')->inertiaProps('transfers.data'))
        ->firstWhere('id', $transfer->id)['can_review'];

    expect($canReview($this->admin))->toBeFalse()
        ->and($canReview(auditStaff('accountant', $this->otherBranch->id)))->toBeTrue();
});

test('the shared auth props tell whether the user is limited to own records', function () {
    $props = fn (User $user) => $this->actingAs($user)->get('/profile')->inertiaProps('auth.works_on_own_records_only');

    expect($props(auditStaff('teacher')))->toBeTrue()
        ->and($props(auditStaff('instructor')))->toBeTrue()
        ->and($props($this->admin))->toBeFalse();
});
