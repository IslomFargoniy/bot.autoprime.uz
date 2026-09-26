<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Course;
use App\Models\Expense;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Payment;
use App\Models\Salary;
use App\Models\SalaryPayment;
use App\Models\Student;
use App\Models\User;

test('contract types and contracts can be created with financial recalculation', function () {
    $branch = Branch::firstOrCreate(['code' => 'test-branch'], ['name' => 'Test Filial', 'status' => 'active']);
    $user = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);

    $contractType = ContractType::create([
        'branch_id' => $branch->id,
        'name' => 'B Standart Kurs',
        'category' => 'B',
        'price' => 3000000,
        'has_theory' => true,
        'has_driving' => true,
        'has_lms' => true,
        'required_driving_lessons' => 10,
        'required_theory_lessons' => 24,
        'min_theory_payment_percent' => 30.00,
        'is_active' => true,
    ]);

    expect($contractType->price)->toEqual('3000000.00');

    $student = Student::factory()->create(['branch_id' => $branch->id]);

    $contract = Contract::create([
        'branch_id' => $branch->id,
        'student_id' => $student->id,
        'contract_type_id' => $contractType->id,
        'created_by_user_id' => $user->id,
        'contract_number' => 'AP-2026-0001',
        'contract_date' => now()->toDateString(),
        'total_amount' => 3000000,
        'discount_amount' => 200000,
        'final_amount' => 2800000,
        'paid_amount' => 0,
        'debt_amount' => 2800000,
        'status' => 'active',
        'payment_status' => 'unpaid',
    ]);

    expect($contract->final_amount)->toEqual('2800000.00')
        ->and($contract->debt_amount)->toEqual('2800000.00');

    // Create Cash Register
    $cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd Pul', 'is_active' => true]);
    $cashRegister = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $cashType->id,
        'name' => 'Filial Naqd Kassasi',
        'balance' => 0,
        'is_active' => true,
    ]);

    // Make Payment
    $payment = Payment::create([
        'branch_id' => $branch->id,
        'contract_id' => $contract->id,
        'student_id' => $student->id,
        'cash_register_id' => $cashRegister->id,
        'received_by_user_id' => $user->id,
        'amount' => 1000000,
        'payment_type' => 'contract_tuition',
        'payment_method' => 'cash',
        'receipt_number' => 'REC-2026-0001',
        'paid_at' => now(),
    ]);

    $contract->recalculateFinances();

    expect($contract->paid_amount)->toEqual('1000000.00')
        ->and($contract->debt_amount)->toEqual('1800000.00')
        ->and($contract->payment_status)->toBe('partial');

    // Pay remaining
    Payment::create([
        'branch_id' => $branch->id,
        'contract_id' => $contract->id,
        'student_id' => $student->id,
        'cash_register_id' => $cashRegister->id,
        'received_by_user_id' => $user->id,
        'amount' => 1800000,
        'payment_type' => 'contract_tuition',
        'payment_method' => 'cash',
        'receipt_number' => 'REC-2026-0002',
        'paid_at' => now(),
    ]);

    $contract->recalculateFinances();

    expect($contract->paid_amount)->toEqual('2800000.00')
        ->and($contract->debt_amount)->toEqual('0.00')
        ->and($contract->payment_status)->toBe('paid');
});

test('lesson session generates and validates dynamic HMAC QR tokens', function () {
    $branch = Branch::firstOrCreate(['code' => 'test-branch'], ['name' => 'Test Filial', 'status' => 'active']);
    $teacher = User::factory()->create(['role' => 'instructor', 'branch_id' => $branch->id]);
    $course = Course::create(['name' => 'B Toifa', 'category' => 'B']);
    $group = Group::create([
        'branch_id' => $branch->id,
        'course_id' => $course->id,
        'teacher_id' => $teacher->id,
        'name' => '24-Guruh',
    ]);

    $session = LessonSession::create([
        'branch_id' => $branch->id,
        'group_id' => $group->id,
        'teacher_id' => $teacher->id,
        'topic' => '1-Mavzu: Yo\'l harakati qoidalari asoslari',
        'started_at' => now(),
        'qr_secret_salt' => bin2hex(random_bytes(16)),
    ]);

    $token = $session->generateDynamicToken(20);

    expect($token)->not->toBeEmpty()
        ->and($session->isValidDynamicToken($token, 20))->toBeTrue()
        ->and($session->isValidDynamicToken('invalid-fake-token', 20))->toBeFalse();
});

test('salary accrual and payment correctly track payroll', function () {
    $branch = Branch::firstOrCreate(['code' => 'test-branch'], ['name' => 'Test Filial', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);
    $instructor = User::factory()->create([
        'role' => 'instructor',
        'branch_id' => $branch->id,
        'base_salary' => 2000000,
        'driving_hourly_rate' => 50000,
        'lesson_rate' => 60000,
    ]);

    $salary = Salary::create([
        'branch_id' => $branch->id,
        'user_id' => $instructor->id,
        'created_by_user_id' => $admin->id,
        'period' => '2026-08',
        'salary_type' => 'base_salary',
        'amount' => 2000000,
        'is_deduction' => false,
        'lessons_or_hours_count' => 0,
        'accrued_at' => now(),
    ]);

    expect($salary->amount)->toEqual('2000000.00');

    $cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd Pul', 'is_active' => true]);
    $cashRegister = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $cashType->id,
        'name' => 'Asosiy Kassa',
        'balance' => 5000000,
        'is_active' => true,
    ]);

    $salaryPayment = SalaryPayment::create([
        'salary_id' => $salary->id,
        'user_id' => $instructor->id,
        'cash_register_id' => $cashRegister->id,
        'paid_by_user_id' => $admin->id,
        'amount' => 2000000,
        'payment_method' => 'cash',
        'paid_at' => now(),
    ]);

    expect($salaryPayment->amount)->toEqual('2000000.00')
        ->and($salaryPayment->salary->id)->toBe($salary->id);
});

test('paying salary creates finance expense and deducts cash register balance', function () {
    $branch = Branch::firstOrCreate(['code' => 'test-branch-2'], ['name' => 'Filial 2', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);
    $employee = User::factory()->create(['role' => 'instructor', 'branch_id' => $branch->id, 'base_salary' => 3000000]);

    $salary = Salary::create([
        'branch_id' => $branch->id,
        'user_id' => $employee->id,
        'created_by_user_id' => $admin->id,
        'period' => '2026-09',
        'salary_type' => 'base_salary',
        'amount' => 3000000,
        'is_deduction' => false,
        'accrued_at' => now(),
    ]);

    $cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd Pul', 'is_active' => true]);
    $cashRegister = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $cashType->id,
        'name' => 'Oylik Kassasi',
        'balance' => 10000000,
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)->post(route('salaries.pay', $salary), [
        'cash_register_id' => $cashRegister->id,
        'amount' => 3000000,
        'payment_method' => 'cash',
        'notes' => 'Sentyabr oyligi to\'landi',
    ]);

    $response->assertRedirect();
    $cashRegister->refresh();
    expect((float) $cashRegister->balance)->toEqual(7000000.0);

    $expense = Expense::where('cash_register_id', $cashRegister->id)->latest()->first();
    expect($expense)->not->toBeNull()
        ->and((float) $expense->amount)->toEqual(3000000.0)
        ->and($expense->recipient)->toContain($employee->full_name);
});

test('contract refund creates refund payment, expense, decrements balance, and updates contract', function () {
    $branch = Branch::firstOrCreate(['code' => 'test-branch-3'], ['name' => 'Filial 3', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);
    $student = Student::factory()->create(['branch_id' => $branch->id]);

    $contractType = ContractType::create([
        'branch_id' => $branch->id,
        'name' => 'B Standart',
        'category' => 'B',
        'price' => 4000000,
        'is_active' => true,
    ]);

    $contract = Contract::create([
        'branch_id' => $branch->id,
        'student_id' => $student->id,
        'contract_type_id' => $contractType->id,
        'created_by_user_id' => $admin->id,
        'contract_number' => 'REF-TEST-001',
        'contract_date' => now()->toDateString(),
        'total_amount' => 4000000,
        'discount_amount' => 0,
        'final_amount' => 4000000,
        'paid_amount' => 2000000,
        'debt_amount' => 2000000,
        'status' => 'active',
        'payment_status' => 'partial',
    ]);

    $cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd Pul', 'is_active' => true]);
    $cashRegister = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $cashType->id,
        'name' => 'Qaytarish Kassasi',
        'balance' => 5000000,
        'is_active' => true,
    ]);

    // Initial student payment record
    Payment::create([
        'branch_id' => $branch->id,
        'contract_id' => $contract->id,
        'student_id' => $student->id,
        'cash_register_id' => $cashRegister->id,
        'received_by_user_id' => $admin->id,
        'amount' => 2000000,
        'payment_type' => 'contract_tuition',
        'payment_method' => 'cash',
        'receipt_number' => 'REC-INIT-001',
        'paid_at' => now(),
    ]);

    $response = $this->actingAs($admin)->post(route('contracts.refund', $contract), [
        'cash_register_id' => $cashRegister->id,
        'amount' => 1500000,
        'payment_method' => 'cash',
        'cancel_contract' => true,
        'notes' => 'Talaba darslarni to\'xtatgani sababli qaytarildi',
    ]);

    $response->assertRedirect();
    $contract->refresh();
    $cashRegister->refresh();

    expect((float) $cashRegister->balance)->toEqual(3500000.0)
        ->and((float) $contract->paid_amount)->toEqual(500000.0)
        ->and((float) $contract->debt_amount)->toEqual(3500000.0)
        ->and($contract->status)->toBe('cancelled');

    $refundPayment = Payment::where('contract_id', $contract->id)->where('payment_type', 'refund')->first();
    expect($refundPayment)->not->toBeNull()
        ->and((float) $refundPayment->amount)->toEqual(1500000.0);

    $expense = Expense::where('cash_register_id', $cashRegister->id)->latest()->first();
    expect($expense)->not->toBeNull()
        ->and((float) $expense->amount)->toEqual(1500000.0)
        ->and($expense->recipient)->toContain($student->full_name);
});

test('deleting expense refunds the cash register balance', function () {
    $branch = Branch::firstOrCreate(['code' => 'test-branch-del-exp'], ['name' => 'Filial Exp', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);

    $cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd Pul', 'is_active' => true]);
    $cashRegister = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $cashType->id,
        'name' => 'Chiqim Kassasi',
        'balance' => 5000000,
        'is_active' => true,
    ]);

    $category = \App\Models\ExpenseCategory::firstOrCreate(['name' => 'Ofis xarajatlari'], ['is_active' => true]);

    $expense = Expense::create([
        'branch_id' => $branch->id,
        'cash_register_id' => $cashRegister->id,
        'expense_category_id' => $category->id,
        'user_id' => $admin->id,
        'amount' => 1000000,
        'description' => 'Qog\'oz va kanselyariya sotib olindi',
        'spent_at' => now(),
    ]);

    $response = $this->actingAs($admin)->delete(route('finance.destroy-expense', $expense));
    $response->assertRedirect();

    $cashRegister->refresh();
    expect((float) $cashRegister->balance)->toEqual(6000000.0)
        ->and(Expense::find($expense->id))->toBeNull();
});

test('deleting payment recalculates contract finances and adjusts cash register', function () {
    $branch = Branch::firstOrCreate(['code' => 'test-branch-del-pay'], ['name' => 'Filial Pay', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);
    $student = Student::factory()->create(['branch_id' => $branch->id]);

    $contractType = ContractType::create([
        'branch_id' => $branch->id,
        'name' => 'B Standart',
        'category' => 'B',
        'price' => 3000000,
        'is_active' => true,
    ]);

    $contract = Contract::create([
        'branch_id' => $branch->id,
        'student_id' => $student->id,
        'contract_type_id' => $contractType->id,
        'created_by_user_id' => $admin->id,
        'contract_number' => 'DEL-PAY-001',
        'contract_date' => now()->toDateString(),
        'total_amount' => 3000000,
        'discount_amount' => 0,
        'final_amount' => 3000000,
        'paid_amount' => 1000000,
        'debt_amount' => 2000000,
        'status' => 'active',
        'payment_status' => 'partial',
    ]);

    $cashType = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd Pul', 'is_active' => true]);
    $cashRegister = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $cashType->id,
        'name' => 'To\'lov Kassasi',
        'balance' => 2000000,
        'is_active' => true,
    ]);

    $payment = Payment::create([
        'branch_id' => $branch->id,
        'contract_id' => $contract->id,
        'student_id' => $student->id,
        'cash_register_id' => $cashRegister->id,
        'received_by_user_id' => $admin->id,
        'amount' => 1000000,
        'payment_type' => 'contract_tuition',
        'payment_method' => 'cash',
        'receipt_number' => 'REC-DEL-001',
        'paid_at' => now(),
    ]);

    $response = $this->actingAs($admin)->delete(route('finance.destroy-payment', $payment));
    $response->assertRedirect();

    $cashRegister->refresh();
    $contract->refresh();

    expect((float) $cashRegister->balance)->toEqual(1000000.0)
        ->and((float) $contract->paid_amount)->toEqual(0.0)
        ->and((float) $contract->debt_amount)->toEqual(3000000.0)
        ->and(Payment::find($payment->id))->toBeNull();
});

test('driving controller blocks scheduling when contract driving limit is reached', function () {
    $branch = Branch::firstOrCreate(['code' => 'test-branch-limit'], ['name' => 'Filial Limit', 'status' => 'active']);
    $admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);
    $instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $branch->id]);
    $student = Student::factory()->create(['branch_id' => $branch->id]);

    $contractType = ContractType::create([
        'branch_id' => $branch->id,
        'name' => 'B Mini Kurs',
        'category' => 'B',
        'price' => 2000000,
        'has_driving' => true,
        'required_driving_lessons' => 2,
        'is_active' => true,
    ]);

    $contract = Contract::create([
        'branch_id' => $branch->id,
        'student_id' => $student->id,
        'contract_type_id' => $contractType->id,
        'created_by_user_id' => $admin->id,
        'contract_number' => 'LIMIT-001',
        'contract_date' => now()->toDateString(),
        'has_driving' => true,
        'required_driving_lessons' => 2,
        'total_amount' => 2000000,
        'final_amount' => 2000000,
        'paid_amount' => 2000000, // 100% paid
        'debt_amount' => 0,
        'status' => 'active',
        'payment_status' => 'paid',
    ]);

    expect($contract->hasReachedDrivingLimit())->toBeFalse()
        ->and($contract->getRemainingDrivingLessonsCount())->toBe(2);

    // Create 2 drivings under this contract
    \App\Models\Driving::create([
        'branch_id' => $branch->id,
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'contract_id' => $contract->id,
        'start_time' => now()->addDay(),
        'end_time' => now()->addDay()->addHour(),
        'status' => 'scheduled',
    ]);

    \App\Models\Driving::create([
        'branch_id' => $branch->id,
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'contract_id' => $contract->id,
        'start_time' => now()->addDays(2),
        'end_time' => now()->addDays(2)->addHour(),
        'status' => 'completed',
    ]);

    expect($contract->hasReachedDrivingLimit())->toBeTrue()
        ->and($contract->getRemainingDrivingLessonsCount())->toBe(0);

    // Attempt to schedule a 3rd driving lesson via DrivingController::store
    $response = $this->actingAs($admin)->post('/admin/drivings', [
        'instructor_id' => $instructor->id,
        'student_ids' => [$student->id],
        'start_time' => now()->addDays(3)->format('Y-m-d H:i:s'),
        'end_time' => now()->addDays(3)->addHour()->format('Y-m-d H:i:s'),
    ]);

    $response->assertSessionHasErrors('student_ids');
});
