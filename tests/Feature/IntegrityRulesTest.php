<?php

use App\Models\Answer;
use App\Models\Attempt;
use App\Models\AttemptAnswer;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\Certificate;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Course;
use App\Models\Driving;
use App\Models\Group;
use App\Models\Lead;
use App\Models\LessonSession;
use App\Models\Question;
use App\Models\Student;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\TelegramService;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'integrity'], ['name' => 'Integrity Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
});

test('a group with students, sessions or lessons cannot be deleted, an empty one can', function () {
    $busy = Group::create(['name' => 'Band', 'branch_id' => $this->branch->id]);
    Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $busy->id]);

    $this->actingAs($this->admin)->delete(route('groups.destroy', $busy))->assertSessionHasErrors('delete');
    expect(Group::whereKey($busy->id)->exists())->toBeTrue();

    $withSession = Group::create(['name' => 'Sessiyali', 'branch_id' => $this->branch->id]);
    LessonSession::create([
        'branch_id' => $this->branch->id, 'group_id' => $withSession->id, 'teacher_id' => $this->admin->id,
        'topic' => 'Dars', 'qr_secret_salt' => 'x', 'started_at' => now(), 'status' => 'finished',
    ]);
    $this->actingAs($this->admin)->delete(route('groups.destroy', $withSession))->assertSessionHasErrors('delete');

    $empty = Group::create(['name' => 'Bo\'sh', 'branch_id' => $this->branch->id]);
    $this->actingAs($this->admin)->delete(route('groups.destroy', $empty))->assertSessionHasNoErrors();
    expect(Group::whereKey($empty->id)->exists())->toBeFalse();
});

test('a vehicle with lessons cannot be deleted', function () {
    $vehicle = Vehicle::create([
        'branch_id' => $this->branch->id, 'make_model' => 'Cobalt', 'plate_number' => '01A123BC', 'status' => 'active',
    ]);
    Driving::create([
        'branch_id' => $this->branch->id, 'instructor_id' => User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id])->id,
        'student_id' => Student::factory()->create(['branch_id' => $this->branch->id])->id,
        'vehicle_id' => $vehicle->id, 'start_time' => now()->subDay(), 'end_time' => now()->subDay()->addHour(), 'status' => 'completed',
    ]);

    $this->actingAs($this->admin)->delete(route('vehicles.destroy', $vehicle))->assertSessionHasErrors('delete');
    expect(Vehicle::whereKey($vehicle->id)->exists())->toBeTrue();

    $unused = Vehicle::create(['branch_id' => $this->branch->id, 'make_model' => 'Nexia', 'plate_number' => '01B999CD', 'status' => 'active']);
    $this->actingAs($this->admin)->delete(route('vehicles.destroy', $unused))->assertSessionHasNoErrors();
    expect(Vehicle::whereKey($unused->id)->exists())->toBeFalse();
});

test('a course used by a group cannot be deleted', function () {
    $course = Course::create(['name' => 'B kurs', 'category' => 'B', 'is_active' => true]);
    Group::create(['name' => 'Kursli', 'branch_id' => $this->branch->id, 'course_id' => $course->id]);

    $this->actingAs($this->admin)->delete(route('courses.destroy', $course))->assertSessionHasErrors('delete');
    expect(Course::whereKey($course->id)->exists())->toBeTrue();

    $free = Course::create(['name' => 'Bo\'sh kurs', 'category' => 'B', 'is_active' => true]);
    $this->actingAs($this->admin)->delete(route('courses.destroy', $free))->assertSessionHasNoErrors();
    expect(Course::whereKey($free->id)->exists())->toBeFalse();
});

test('a question or ticket with test results cannot be deleted', function () {
    $ticket = Ticket::create(['ticket_number' => 1, 'title_uz' => 'Bilet 1', 'is_active' => true]);
    $question = Question::create(['ticket_id' => $ticket->id, 'question_number' => 1, 'question_uz' => 'Savol', 'question_ru' => 'Вопрос', 'is_active' => true]);
    Answer::create(['question_id' => $question->id, 'answer_uz' => 'Ha', 'answer_ru' => 'Да', 'is_correct' => true, 'order' => 1]);
    $attempt = Attempt::create(['attempt_type' => 'ticket_exam', 'ticket_id' => $ticket->id, 'started_at' => now()]);
    AttemptAnswer::create(['attempt_id' => $attempt->id, 'question_id' => $question->id, 'is_correct' => true]);

    $this->actingAs($this->admin)->delete(route('tests.questions.destroy', $question))->assertSessionHasErrors('delete');
    $this->actingAs($this->admin)->delete(route('tests.tickets.destroy', $ticket))->assertSessionHasErrors('delete');
    expect(Question::whereKey($question->id)->exists())->toBeTrue()
        ->and(Ticket::whereKey($ticket->id)->exists())->toBeTrue();

    $freeTicket = Ticket::create(['ticket_number' => 2, 'title_uz' => 'Bilet 2', 'is_active' => true]);
    $this->actingAs($this->admin)->delete(route('tests.tickets.destroy', $freeTicket))->assertSessionHasNoErrors();
    expect(Ticket::whereKey($freeTicket->id)->exists())->toBeFalse();
});

test('a converted lead cannot be deleted', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $converted = Lead::create(['branch_id' => $this->branch->id, 'full_name' => 'Aylangan', 'phone' => '+998901110001', 'stage' => 'contract_signed', 'student_id' => $student->id]);
    $open = Lead::create(['branch_id' => $this->branch->id, 'full_name' => 'Ochiq', 'phone' => '+998901110002', 'stage' => 'new_lead']);

    $this->actingAs($this->admin)->delete(route('leads.destroy', $converted))->assertSessionHasErrors('delete');
    expect(Lead::whereKey($converted->id)->exists())->toBeTrue();

    $this->actingAs($this->admin)->delete(route('leads.destroy', $open))->assertSessionHasNoErrors();
    expect(Lead::whereKey($open->id)->exists())->toBeFalse();
});

test('students cannot be put into an inactive group but may stay in one', function () {
    $inactive = Group::create(['name' => 'Nofaol', 'branch_id' => $this->branch->id, 'is_active' => false]);
    $student = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $inactive->id]);

    $this->actingAs($this->admin)->post('/admin/students', [
        'full_name' => 'Yangi', 'phone' => '+998901234500', 'group_id' => $inactive->id,
    ])->assertSessionHasErrors('group_id');

    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", [
        'full_name' => 'Yangi Ism', 'phone' => $student->phone, 'group_id' => $inactive->id,
    ])->assertSessionHasNoErrors();
    expect($student->fresh()->full_name)->toBe('Yangi Ism');

    $active = Group::create(['name' => 'Faol', 'branch_id' => $this->branch->id]);
    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", [
        'full_name' => 'Yangi Ism', 'phone' => $student->phone, 'group_id' => $active->id,
    ])->assertSessionHasNoErrors();
    expect($student->fresh()->group_id)->toBe($active->id);
});

function integrityContractType(Branch $branch, array $attributes = []): ContractType
{
    return ContractType::create([
        'branch_id' => $branch->id, 'name' => 'Tarif '.fake()->unique()->numerify('###'), 'category' => 'B',
        'price' => 3000000, 'is_active' => true, ...$attributes,
    ]);
}

test('a student can have only one open contract and only an active tariff', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $type = integrityContractType($this->branch);
    $payload = ['student_id' => $student->id, 'contract_type_id' => $type->id];

    $this->actingAs($this->admin)->post('/admin/contracts', $payload)->assertSessionHasNoErrors();
    expect(Contract::where('student_id', $student->id)->count())->toBe(1);

    $this->actingAs($this->admin)->post('/admin/contracts', $payload)->assertSessionHasErrors('student_id');
    expect(Contract::where('student_id', $student->id)->count())->toBe(1);

    Contract::where('student_id', $student->id)->update(['status' => 'frozen']);
    $this->actingAs($this->admin)->post('/admin/contracts', $payload)->assertSessionHasErrors('student_id');

    Contract::where('student_id', $student->id)->update(['status' => 'cancelled']);
    $inactive = integrityContractType($this->branch, ['is_active' => false]);
    $this->actingAs($this->admin)->post('/admin/contracts', ['student_id' => $student->id, 'contract_type_id' => $inactive->id])->assertSessionHasErrors('contract_type_id');

    $this->actingAs($this->admin)->post('/admin/contracts', $payload)->assertSessionHasNoErrors();
    expect(Contract::where('student_id', $student->id)->count())->toBe(2);
});

test('only active students can get a new contract', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $student->update(['status' => 'dropped']);

    $this->actingAs($this->admin)->post('/admin/contracts', ['student_id' => $student->id, 'contract_type_id' => integrityContractType($this->branch)->id])
        ->assertSessionHasErrors('student_id');
});

test('driving lessons need an active driving contract with lessons left', function () {
    Queue::fake();
    $instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id]);
    $slot = fn (int $day) => [
        'start_time' => now()->addDays($day)->setTime(10, 0)->toDateTimeString(),
        'end_time' => now()->addDays($day)->setTime(11, 0)->toDateTimeString(),
    ];
    $book = fn (Student $student, int $day) => $this->actingAs($this->admin)->post('/admin/drivings', [
        'instructor_id' => $instructor->id, 'student_ids' => [$student->id], ...$slot($day),
    ]);

    $noContract = Student::factory()->create(['branch_id' => $this->branch->id]);
    $book($noContract, 2)->assertSessionHasErrors('student_ids');

    $theoryOnly = Student::factory()->create(['branch_id' => $this->branch->id]);
    openDrivingContract($theoryOnly, ['has_driving' => false]);
    $book($theoryOnly, 2)->assertSessionHasErrors('student_ids');

    $limited = Student::factory()->create(['branch_id' => $this->branch->id]);
    openDrivingContract($limited, ['required_driving_lessons' => 2]);
    $book($limited, 2)->assertSessionHasNoErrors();
    $book($limited, 3)->assertSessionHasNoErrors();
    $book($limited, 4)->assertSessionHasErrors('student_ids');

    expect(Driving::where('student_id', $limited->id)->count())->toBe(2)
        ->and(Driving::whereIn('student_id', [$noContract->id, $theoryOnly->id])->count())->toBe(0);
});

test('contract status moves only through allowed transitions', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $contract = openDrivingContract($student);

    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'completed'])->assertSessionHasErrors('status');
    expect($contract->fresh()->status)->toBe('active');

    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'frozen'])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'active'])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'cancelled'])->assertSessionHasNoErrors();
    expect($contract->fresh()->status)->toBe('cancelled');

    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'active'])->assertSessionHasErrors('status');
    expect($contract->fresh()->status)->toBe('cancelled');
});

test('a contract with a certificate can be neither refunded nor deleted', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $contract = openDrivingContract($student, ['paid_amount' => 0, 'debt_amount' => 0, 'status' => 'completed']);
    Certificate::create([
        'branch_id' => $this->branch->id, 'student_id' => $student->id, 'contract_id' => $contract->id,
        'certificate_number' => 'CERT-I-0001', 'qr_verify_hash' => 'hash-int', 'category' => 'B',
        'issued_date' => now()->toDateString(), 'status' => 'issued',
    ]);

    $this->actingAs($this->admin)->delete("/admin/contracts/{$contract->id}")->assertSessionHasErrors('delete');
    expect(Contract::whereKey($contract->id)->exists())->toBeTrue();

    $contract->update(['paid_amount' => 500000]);
    $register = CashRegister::create([
        'branch_id' => $this->branch->id,
        'cash_register_type_id' => CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true])->id,
        'name' => 'Kassa', 'balance' => 0, 'is_active' => true,
    ]);
    $register->deposit(1000000, 'initial', 'Boshlang\'ich');

    $this->actingAs($this->admin)->post("/admin/contracts/{$contract->id}/refund", [
        'cash_register_id' => $register->id, 'amount' => 100000, 'payment_method' => 'cash',
    ])->assertSessionHasErrors('amount');
    expect((float) $register->fresh()->balance)->toEqual(1000000.0);
});

test('attendance cannot be marked for a future date', function () {
    $group = Group::create(['name' => 'Davomat', 'branch_id' => $this->branch->id, 'teacher_id' => $this->admin->id]);
    $student = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $group->id]);
    $tomorrow = now()->addDay()->toDateString();

    $this->actingAs($this->admin)->post('/admin/attendance/mark-group', [
        'group_id' => $group->id, 'date' => $tomorrow, 'attendances' => [['student_id' => $student->id, 'status' => 'present']],
    ])->assertSessionHasErrors('date');

    $this->actingAs($this->admin)->post('/admin/attendance/mark-manual', [
        'student_id' => $student->id, 'date' => $tomorrow, 'status' => 'present', 'manual_reason' => 'Test',
    ])->assertSessionHasErrors('date');

    $this->actingAs($this->admin)->post('/admin/attendance/mark-group', [
        'group_id' => $group->id, 'date' => now()->toDateString(), 'attendances' => [['student_id' => $student->id, 'status' => 'present']],
    ])->assertSessionHasNoErrors();
    expect(LessonSession::where('group_id', $group->id)->count())->toBe(1);
});

test('the attendance roster warns about students the QR check would refuse', function () {
    $group = Group::create(['name' => 'Ogohlantirish', 'branch_id' => $this->branch->id, 'teacher_id' => $this->admin->id]);
    $paid = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $group->id]);
    $unpaid = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $group->id]);
    $none = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $group->id]);
    openDrivingContract($paid);
    openDrivingContract($unpaid, ['paid_amount' => 0, 'debt_amount' => 1000000, 'payment_status' => 'unpaid']);

    $roster = collect($this->actingAs($this->admin)->getJson('/admin/attendance/group-attendances?group_id='.$group->id)->json('students'))->keyBy('id');

    expect($roster[$paid->id]['payment_warning'])->toBeNull()
        ->and($roster[$unpaid->id]['payment_warning'])->toContain('To\'lov')
        ->and($roster[$none->id]['payment_warning'])->toContain('shartnoma');
});

test('issuing a certificate graduates the student', function () {
    $instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id]);
    $contract = graduateCandidate($this->branch, $instructor, presentLessons: 8);

    $this->actingAs($this->admin)->post('/admin/certificates', ['contract_id' => $contract->id])->assertSessionHasNoErrors();

    expect($contract->student->fresh()->status)->toBe('graduated');

    $this->actingAs($this->admin)->put("/admin/students/{$contract->student_id}", [
        'full_name' => $contract->student->full_name, 'phone' => $contract->student->phone, 'status' => 'dropped',
    ])->assertSessionHasErrors('status');
});

test('a student can be marked as dropped and then cannot be booked', function () {
    Queue::fake();
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    openDrivingContract($student);

    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", [
        'full_name' => $student->full_name, 'phone' => $student->phone, 'status' => 'graduated',
    ])->assertSessionHasErrors('status');

    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", [
        'full_name' => $student->full_name, 'phone' => $student->phone, 'status' => 'dropped',
    ])->assertSessionHasNoErrors();
    expect($student->fresh()->status)->toBe('dropped');

    $this->actingAs($this->admin)->post('/admin/drivings', [
        'instructor_id' => User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id])->id,
        'student_ids' => [$student->id],
        'start_time' => now()->addDays(2)->setTime(10, 0)->toDateTimeString(),
        'end_time' => now()->addDays(2)->setTime(11, 0)->toDateTimeString(),
    ])->assertSessionHasErrors('student_ids');
});

test('a certificate can be revoked once and then fails verification and download', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $contract = openDrivingContract($student, ['status' => 'completed']);
    $certificate = Certificate::create([
        'branch_id' => $this->branch->id, 'student_id' => $student->id, 'contract_id' => $contract->id,
        'certificate_number' => 'CERT-R-0001', 'qr_verify_hash' => 'hash-revoke', 'category' => 'B',
        'issued_date' => now()->toDateString(), 'status' => 'issued',
    ]);

    $this->actingAs($this->admin)->post(route('certificates.revoke', $certificate), [])->assertSessionHasErrors('reason');

    $this->actingAs($this->admin)->post(route('certificates.revoke', $certificate), ['reason' => 'Xato ma\'lumot'])->assertSessionHasNoErrors();
    expect($certificate->fresh()->status)->toBe('revoked')
        ->and($certificate->fresh()->notes)->toContain('Xato ma\'lumot');

    $this->actingAs($this->admin)->post(route('certificates.revoke', $certificate), ['reason' => 'Yana'])->assertSessionHasErrors('reason');
    $this->getJson(route('certificates.verify', 'hash-revoke'))->assertJson(['valid' => false]);
    $this->actingAs($this->admin)->get(route('certificates.download-pdf', $certificate))->assertForbidden();
});
