<?php

use App\Imports\StudentsImport;
use App\Jobs\SendDrivingCreatedNotificationJob;
use App\Jobs\SendDrivingReminderJob;
use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Certificate;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Driving;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Question;
use App\Models\Student;
use App\Models\Ticket;
use App\Models\User;
use App\Services\CertificateEligibilityService;
use App\Services\TelegramService;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'rules'], ['name' => 'Qoidalar Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
    $this->instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id]);
});

/**
 * A fully paid contract that satisfies driving and exam conditions, with the
 * given number of attended and absent theory lessons.
 */
function graduateCandidate(Branch $branch, User $instructor, int $presentLessons, int $absentLessons = 0): Contract
{
    $student = Student::factory()->create(['branch_id' => $branch->id]);
    $contractType = ContractType::firstOrCreate(['name' => 'Bitiruv'], ['branch_id' => $branch->id, 'category' => 'B', 'price' => 1000, 'is_active' => true]);
    $contract = Contract::create([
        'branch_id' => $branch->id, 'student_id' => $student->id, 'contract_type_id' => $contractType->id,
        'contract_number' => 'GR-'.fake()->unique()->numerify('#####'), 'contract_date' => now()->toDateString(),
        'required_theory_lessons' => 10, 'required_driving_lessons' => 1,
        'total_amount' => 1000, 'final_amount' => 1000, 'paid_amount' => 1000, 'debt_amount' => 0,
        'status' => 'active', 'payment_status' => 'paid',
    ]);

    Driving::create(['instructor_id' => $instructor->id, 'student_id' => $student->id, 'start_time' => now()->subDays(2), 'end_time' => now()->subDays(2)->addHour(), 'status' => 'completed']);
    Attempt::create(['student_id' => $student->id, 'attempt_type' => 'random_mock', 'is_passed' => true, 'started_at' => now(), 'finished_at' => now()]);

    $group = Group::create(['name' => 'Bitiruv guruhi', 'branch_id' => $branch->id]);
    foreach (range(1, $presentLessons + $absentLessons) as $i) {
        $session = LessonSession::create(['branch_id' => $branch->id, 'group_id' => $group->id, 'teacher_id' => $instructor->id, 'topic' => "Dars {$i}", 'started_at' => now()->subDays($i), 'qr_secret_salt' => 'x', 'status' => 'finished']);
        Attendance::create(['lesson_session_id' => $session->id, 'student_id' => $student->id, 'status' => $i <= $presentLessons ? 'present' : 'absent', 'scanned_at' => now()]);
    }

    return $contract;
}

test('absences do not count towards certificate attendance', function () {
    $contract = graduateCandidate($this->branch, $this->instructor, presentLessons: 3, absentLessons: 7);

    $result = app(CertificateEligibilityService::class)->evaluateOne($contract);

    expect($result['attendance_rate'])->toEqual(30.0)
        ->and($result['is_eligible'])->toBeFalse();
});

test('a certificate is issued only once per contract', function () {
    $contract = graduateCandidate($this->branch, $this->instructor, presentLessons: 8);

    $this->actingAs($this->admin)->post('/admin/certificates', ['contract_id' => $contract->id])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/admin/certificates', ['contract_id' => $contract->id])->assertSessionHasErrors('contract_id');

    expect(Certificate::where('contract_id', $contract->id)->count())->toBe(1);
});

test('a student cannot be double-booked and a rescheduled lesson is re-checked', function () {
    Queue::fake();
    $otherInstructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id]);
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $slot = ['start_time' => now()->addDays(2)->setTime(10, 0)->toDateTimeString(), 'end_time' => now()->addDays(2)->setTime(11, 0)->toDateTimeString()];

    $this->actingAs($this->admin)->post('/admin/drivings', ['instructor_id' => $this->instructor->id, 'student_ids' => [$student->id], ...$slot])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/admin/drivings', ['instructor_id' => $otherInstructor->id, 'student_ids' => [$student->id], ...$slot])->assertSessionHasErrors('start_time');

    $laterLesson = Driving::create([
        'instructor_id' => $this->instructor->id,
        'student_id' => Student::factory()->create(['branch_id' => $this->branch->id])->id,
        'start_time' => now()->addDays(2)->setTime(14, 0), 'end_time' => now()->addDays(2)->setTime(15, 0), 'status' => 'scheduled',
    ]);

    $this->actingAs($this->admin)->put("/admin/drivings/{$laterLesson->id}", $slot)->assertSessionHasErrors('start_time');
    expect($laterLesson->fresh()->start_time->format('H:i'))->toBe('14:00');
});

test('booking several students is all-or-nothing', function () {
    Queue::fake();
    $paidStudent = Student::factory()->create(['branch_id' => $this->branch->id]);
    $unpaidStudent = Student::factory()->create(['branch_id' => $this->branch->id]);
    $contractType = ContractType::firstOrCreate(['name' => 'Haydash'], ['branch_id' => $this->branch->id, 'category' => 'B', 'price' => 1000, 'has_driving' => true, 'is_active' => true]);
    Contract::create([
        'branch_id' => $this->branch->id, 'student_id' => $unpaidStudent->id, 'contract_type_id' => $contractType->id,
        'contract_number' => 'UNPAID-1', 'contract_date' => now()->toDateString(), 'has_driving' => true,
        'total_amount' => 1000, 'final_amount' => 1000, 'paid_amount' => 0, 'debt_amount' => 1000,
        'status' => 'active', 'payment_status' => 'unpaid',
    ]);

    $this->actingAs($this->admin)->post('/admin/drivings', [
        'instructor_id' => $this->instructor->id,
        'student_ids' => [$paidStudent->id, $unpaidStudent->id],
        'start_time' => now()->addDays(3)->setTime(10, 0)->toDateTimeString(),
        'end_time' => now()->addDays(3)->setTime(11, 0)->toDateTimeString(),
    ])->assertSessionHasErrors('student_ids');

    expect(Driving::count())->toBe(0);
    Queue::assertNotPushed(SendDrivingCreatedNotificationJob::class);
});

test('instructors follow the same booking rules and only book their own students', function () {
    Queue::fake();
    $ownGroup = Group::create(['name' => 'Mening guruhim', 'branch_id' => $this->branch->id, 'instructor_id' => $this->instructor->id]);
    $foreignGroup = Group::create(['name' => 'Boshqa guruh', 'branch_id' => $this->branch->id]);
    $foreignStudent = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $foreignGroup->id]);
    $ownStudent = Student::factory()->create(['branch_id' => $this->branch->id, 'group_id' => $ownGroup->id]);
    $slot = ['start_time' => now()->addDays(2)->setTime(9, 0)->toDateTimeString(), 'end_time' => now()->addDays(2)->setTime(10, 0)->toDateTimeString()];

    $this->actingAs($this->instructor)->post('/instructor/driving', ['group_id' => $foreignGroup->id, 'student_id' => $foreignStudent->id, ...$slot])->assertSessionHasErrors('student_id');

    $this->actingAs($this->instructor)->post('/instructor/driving', ['group_id' => $ownGroup->id, 'student_id' => $ownStudent->id, ...$slot])->assertSessionHasNoErrors();
    $this->actingAs($this->instructor)->post('/instructor/driving', ['group_id' => $ownGroup->id, 'student_id' => $ownStudent->id, ...$slot])->assertSessionHasErrors('start_time');

    expect(Driving::count())->toBe(1);
});

test('only scheduling fields changing triggers an update notification', function () {
    $telegram = $this->mock(TelegramService::class);
    $telegram->shouldReceive('sendDrivingUpdatedNotification')->never();
    $driving = Driving::create([
        'instructor_id' => $this->instructor->id, 'student_id' => Student::factory()->create()->id,
        'start_time' => now()->addDays(2)->setTime(10, 0), 'end_time' => now()->addDays(2)->setTime(11, 0), 'status' => 'scheduled',
    ]);

    $this->actingAs($this->admin)->put("/admin/drivings/{$driving->id}", ['latitude' => 41.3, 'longitude' => 69.2])->assertSessionHasNoErrors();
});

test('a reminder job is claimed once even when dispatched twice', function () {
    $telegram = Mockery::mock(TelegramService::class);
    $telegram->shouldReceive('sendDriving24hReminder')->once();
    $driving = Driving::create([
        'instructor_id' => $this->instructor->id, 'student_id' => Student::factory()->create()->id,
        'start_time' => now()->addDay(), 'end_time' => now()->addDay()->addHour(), 'status' => 'scheduled',
    ]);

    (new SendDrivingReminderJob($driving, '24h'))->handle($telegram);
    (new SendDrivingReminderJob($driving, '24h'))->handle($telegram);

    expect($driving->fresh()->reminded_24h_at)->not->toBeNull();
});

test('editing a question keeps answer ids and requires exactly one correct answer', function () {
    $ticket = Ticket::create(['ticket_number' => 1, 'title_uz' => 'Bilet 1', 'is_active' => true]);
    $question = Question::create(['ticket_id' => $ticket->id, 'question_number' => 1, 'question_uz' => 'Savol', 'question_ru' => 'Вопрос', 'is_active' => true]);
    $first = Answer::create(['question_id' => $question->id, 'answer_uz' => 'A', 'answer_ru' => 'A-ru', 'is_correct' => true, 'order' => 1]);
    $second = Answer::create(['question_id' => $question->id, 'answer_uz' => 'B', 'answer_ru' => 'B-ru', 'is_correct' => false, 'order' => 2]);

    $this->actingAs($this->admin)->put("/admin/tests/questions/{$question->id}", [
        'question_uz' => 'Savol',
        'answers' => [['text' => 'A', 'is_correct' => true], ['text' => 'B', 'is_correct' => true]],
    ])->assertSessionHasErrors('answers');

    $this->actingAs($this->admin)->put("/admin/tests/questions/{$question->id}", [
        'question_uz' => 'Savol',
        'answers' => [['text' => 'A2', 'is_correct' => false], ['text' => 'B2', 'is_correct' => true]],
    ])->assertSessionHasNoErrors();

    expect($first->fresh()->answer_uz)->toBe('A2')
        ->and($first->fresh()->answer_ru)->toBe('A-ru')
        ->and($second->fresh()->is_correct)->toBeTrue()
        ->and(Answer::where('question_id', $question->id)->count())->toBe(2);
});

test('student phones are normalized so manual entry and import match the same student', function () {
    $this->actingAs($this->admin)->post('/admin/students', ['full_name' => 'Ali', 'phone' => '90 123 45 67'])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/admin/students', ['full_name' => 'Ali 2', 'phone' => '+998901234567'])->assertSessionHasErrors('phone');

    $group = Group::create(['name' => 'Import', 'branch_id' => $this->branch->id]);
    $import = new StudentsImport($group->id, $this->branch->id);
    $import->collection(collect([
        ['full_name' => 'Ali Valiyev', 'phone' => '998901234567'],
        ['full_name' => 'Telefonsiz', 'phone' => null],
    ]));

    expect(Student::count())->toBe(1)
        ->and(Student::first()->phone)->toBe('+998901234567')
        ->and(Student::first()->group_id)->toBe($group->id)
        ->and($import->importedCount)->toBe(1)
        ->and($import->skippedCount)->toBe(1);
});

test('import does not pull a student out of another branch', function () {
    $otherBranch = Branch::firstOrCreate(['code' => 'rules-2'], ['name' => 'Boshqa', 'status' => 'active']);
    $student = Student::factory()->create(['branch_id' => $otherBranch->id, 'phone' => '+998907654321']);
    $group = Group::create(['name' => 'Import', 'branch_id' => $this->branch->id]);

    $import = new StudentsImport($group->id, $this->branch->id);
    $import->collection(collect([['full_name' => 'Boshqa filial', 'phone' => '+998907654321']]));

    expect($student->fresh()->group_id)->toBeNull()
        ->and($import->skippedCount)->toBe(1);
});

test('dashboard student count matches the branch student list', function () {
    $groupInBranch = Group::create(['name' => 'Filial guruhi', 'branch_id' => $this->branch->id]);
    Student::factory()->create(['branch_id' => $this->branch->id]);
    Student::factory()->create(['branch_id' => null, 'group_id' => $groupInBranch->id]);

    $listed = $this->actingAs($this->admin)->get('/admin/students')->inertiaProps('students.total');
    $counted = Student::inBranch($this->branch->id)->count();

    expect($counted)->toBe(2)->and($listed)->toBe($counted);
});
