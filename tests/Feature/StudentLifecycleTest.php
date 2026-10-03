<?php

use App\Jobs\SendDrivingReminderJob;
use App\Models\Branch;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Driving;
use App\Models\Group;
use App\Models\Lead;
use App\Models\Student;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\StudentLifecycleService;
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'lifecycle'], ['name' => 'Hayot sikli Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
    $this->instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id]);
});

afterEach(fn () => Carbon::setTestNow());

function lifecycleGroup(array $attributes = []): Group
{
    return Group::create(['name' => 'Guruh '.fake()->unique()->numerify('###'), 'branch_id' => test()->branch->id, 'category' => 'B', ...$attributes]);
}

function lifecycleStudent(array $attributes = []): Student
{
    return Student::factory()->create(['branch_id' => test()->branch->id, ...$attributes]);
}

function lifecycleLesson(Student $student, string $when = '+2 days', ?Contract $contract = null, string $status = 'scheduled'): Driving
{
    $start = Carbon::parse($when);

    return Driving::create([
        'branch_id' => test()->branch->id, 'instructor_id' => test()->instructor->id, 'student_id' => $student->id,
        'contract_id' => $contract?->id, 'start_time' => $start, 'end_time' => $start->copy()->addHour(), 'status' => $status,
    ]);
}

function lifecycleContractType(): ContractType
{
    return ContractType::create(['branch_id' => test()->branch->id, 'name' => 'Tarif '.fake()->unique()->numerify('###'), 'category' => 'B', 'price' => 3000000, 'is_active' => true]);
}

test('cancelling a contract cancels the lessons ahead and frees the group', function () {
    $group = lifecycleGroup();
    $student = lifecycleStudent(['group_id' => $group->id]);
    $contract = openDrivingContract($student, ['group_id' => $group->id]);
    $ahead = lifecycleLesson($student, '+2 days', $contract);
    $done = lifecycleLesson($student, '-2 days', $contract, 'completed');

    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'cancelled'])->assertSessionHasNoErrors();

    expect($ahead->fresh()->status)->toBe('cancelled')
        ->and($done->fresh()->status)->toBe('completed')
        ->and($student->fresh()->group_id)->toBeNull()
        ->and($contract->fresh()->status)->toBe('cancelled');
});

test('a student who drops out loses open contracts, the group and the lessons ahead', function () {
    $group = lifecycleGroup();
    $student = lifecycleStudent(['group_id' => $group->id]);
    $contract = openDrivingContract($student, ['group_id' => $group->id]);
    $ahead = lifecycleLesson($student, '+2 days', $contract);

    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", [
        'full_name' => $student->full_name, 'phone' => $student->phone, 'group_id' => $group->id, 'status' => 'dropped',
    ])->assertSessionHasNoErrors();

    expect($student->fresh()->status)->toBe('dropped')
        ->and($student->fresh()->group_id)->toBeNull()
        ->and($contract->fresh()->status)->toBe('cancelled')
        ->and($ahead->fresh()->status)->toBe('cancelled');
});

test('reminders are sent only for students who are studying', function () {
    Queue::fake();
    $active = lifecycleStudent();
    $dropped = lifecycleStudent(['status' => 'dropped']);
    lifecycleLesson($active, '+24 hours');
    lifecycleLesson($dropped, '+24 hours');

    $this->artisan('app:send-driving-reminders')->assertSuccessful();

    Queue::assertPushed(SendDrivingReminderJob::class, 1);
    Queue::assertPushed(SendDrivingReminderJob::class, fn ($job) => $job->driving->student_id === $active->id);
});

test('freezing a contract cancels the lessons ahead and unfreezing adds the frozen days to its end', function () {
    Carbon::setTestNow('2026-10-10 10:00:00');
    $student = lifecycleStudent();
    $contract = openDrivingContract($student, ['end_date' => '2026-12-31']);
    $ahead = lifecycleLesson($student, '+2 days', $contract);

    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'frozen'])->assertSessionHasNoErrors();
    expect($contract->fresh()->frozen_at->toDateString())->toBe('2026-10-10')
        ->and($ahead->fresh()->status)->toBe('cancelled');

    Carbon::setTestNow('2026-10-15 10:00:00');
    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'active'])->assertSessionHasNoErrors();

    expect($contract->fresh()->status)->toBe('active')
        ->and($contract->fresh()->frozen_at)->toBeNull()
        ->and($contract->fresh()->end_date->toDateString())->toBe('2027-01-05');
});

test('an end date typed while unfreezing is kept as typed', function () {
    Carbon::setTestNow('2026-10-10 10:00:00');
    $contract = openDrivingContract(lifecycleStudent(), ['end_date' => '2026-12-31']);

    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'frozen'])->assertSessionHasNoErrors();
    Carbon::setTestNow('2026-10-15 10:00:00');
    $this->actingAs($this->admin)->put("/admin/contracts/{$contract->id}", ['status' => 'active', 'end_date' => '2027-02-01'])->assertSessionHasNoErrors();

    expect($contract->fresh()->end_date->toDateString())->toBe('2027-02-01')->and($contract->fresh()->frozen_at)->toBeNull();
});

test('completing a contract through the lifecycle frees the group', function () {
    $group = lifecycleGroup();
    $student = lifecycleStudent(['group_id' => $group->id, 'status' => 'graduated']);
    $contract = openDrivingContract($student, ['status' => 'completed']);

    app(StudentLifecycleService::class)->contractEnded($contract);

    expect($student->fresh()->group_id)->toBeNull();
});

test('a graduate gets a new contract and is active again, in the chosen group', function () {
    $student = lifecycleStudent(['status' => 'graduated']);
    openDrivingContract($student, ['status' => 'completed']);
    $group = lifecycleGroup();

    $this->actingAs($this->admin)->post('/admin/contracts', [
        'student_id' => $student->id, 'contract_type_id' => lifecycleContractType()->id, 'group_id' => $group->id,
    ])->assertSessionHasNoErrors();

    $contract = Contract::where('student_id', $student->id)->where('status', 'active')->firstOrFail();

    expect($student->fresh()->status)->toBe('active')
        ->and($student->fresh()->group_id)->toBe($group->id)
        ->and($contract->group_id)->toBe($group->id);
});

test('a student who dropped out is reactivated before getting a contract', function () {
    $student = lifecycleStudent(['status' => 'dropped']);

    $this->actingAs($this->admin)->post('/admin/contracts', [
        'student_id' => $student->id, 'contract_type_id' => lifecycleContractType()->id,
    ])->assertSessionHasErrors('student_id');

    expect(Contract::where('student_id', $student->id)->exists())->toBeFalse();
});

test('a new contract with another group moves the student there, never leaves them split', function () {
    $old = lifecycleGroup();
    $new = lifecycleGroup();
    $student = lifecycleStudent(['group_id' => $old->id]);

    $this->actingAs($this->admin)->post('/admin/contracts', [
        'student_id' => $student->id, 'contract_type_id' => lifecycleContractType()->id, 'group_id' => $new->id,
    ])->assertSessionHasNoErrors();

    expect($student->fresh()->group_id)->toBe($new->id)
        ->and(Contract::where('student_id', $student->id)->value('group_id'))->toBe($new->id);
});

test('moving a student to another group moves the open contract with them', function () {
    $old = lifecycleGroup();
    $new = lifecycleGroup();
    $student = lifecycleStudent(['group_id' => $old->id]);
    $contract = openDrivingContract($student, ['group_id' => $old->id]);

    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", [
        'full_name' => $student->full_name, 'phone' => $student->phone, 'group_id' => $new->id,
    ])->assertSessionHasNoErrors();

    expect($contract->fresh()->group_id)->toBe($new->id);
});

test('an inactive student cannot be put into a group', function () {
    $student = lifecycleStudent(['status' => 'dropped']);

    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", [
        'full_name' => $student->full_name, 'phone' => $student->phone, 'group_id' => lifecycleGroup()->id,
    ])->assertSessionHasErrors('group_id');
});

test('group seats are taken by active students only', function () {
    $group = lifecycleGroup(['max_students' => 1]);
    lifecycleStudent(['group_id' => $group->id, 'status' => 'graduated']);
    $newcomer = lifecycleStudent();

    $this->actingAs($this->admin)->put("/admin/students/{$newcomer->id}", [
        'full_name' => $newcomer->full_name, 'phone' => $newcomer->phone, 'group_id' => $group->id,
    ])->assertSessionHasNoErrors();

    $another = lifecycleStudent();
    $this->actingAs($this->admin)->put("/admin/students/{$another->id}", [
        'full_name' => $another->full_name, 'phone' => $another->phone, 'group_id' => $group->id,
    ])->assertSessionHasErrors('group_id');
});

test('converting a lead of a graduate reuses the student and fills only the empty details', function () {
    $student = lifecycleStudent(['status' => 'graduated', 'phone' => '+998901112233', 'address' => 'Eski manzil']);
    $lead = Lead::create([
        'branch_id' => $this->branch->id, 'full_name' => 'Boshqa Ism', 'phone' => '+998901112233', 'address' => 'Yangi manzil',
        'passport_series' => 'AB', 'source' => 'walk_in', 'stage' => 'new_lead',
    ]);

    $this->actingAs($this->admin)->post(route('leads.convert', $lead), ['contract_type_id' => lifecycleContractType()->id])->assertSessionHasNoErrors();

    expect(Student::count())->toBe(1)
        ->and($student->fresh()->status)->toBe('active')
        ->and($student->fresh()->address)->toBe('Eski manzil')
        ->and($student->fresh()->passport_series)->toBe('AB')
        ->and($lead->fresh()->student_id)->toBe($student->id)
        ->and(Contract::where('student_id', $student->id)->where('status', 'active')->exists())->toBeTrue();
});

test('a lead with a known PINFL but a new phone is the same student', function () {
    $student = lifecycleStudent(['status' => 'graduated', 'phone' => '+998901112233', 'pinfl' => '32005980123456']);
    $lead = Lead::create([
        'branch_id' => $this->branch->id, 'full_name' => 'Yangi Telefon', 'phone' => '+998907776655', 'pinfl' => '32005980123456',
        'source' => 'walk_in', 'stage' => 'new_lead',
    ]);

    $this->actingAs($this->admin)->post(route('leads.convert', $lead), ['contract_type_id' => lifecycleContractType()->id])->assertSessionHasNoErrors();

    expect(Student::count())->toBe(1)->and($student->fresh()->phone)->toBe('+998901112233')
        ->and(Contract::where('student_id', $student->id)->exists())->toBeTrue();
});

test('a lead whose phone and PINFL belong to two students is refused with a message, not an error page', function () {
    lifecycleStudent(['phone' => '+998901112233']);
    lifecycleStudent(['phone' => '+998905554433', 'pinfl' => '32005980123456']);
    $lead = Lead::create([
        'branch_id' => $this->branch->id, 'full_name' => 'Aralash', 'phone' => '+998901112233', 'pinfl' => '32005980123456',
        'source' => 'walk_in', 'stage' => 'new_lead',
    ]);

    $this->actingAs($this->admin)->post(route('leads.convert', $lead), ['contract_type_id' => lifecycleContractType()->id])->assertSessionHasErrors('phone');

    expect(Contract::count())->toBe(0);
});

test('a new lead with a Telegram ID that another student owns gets a message, not an error page', function () {
    lifecycleStudent(['telegram_id' => '777000111']);
    $lead = Lead::create([
        'branch_id' => $this->branch->id, 'full_name' => 'Yangi', 'phone' => '+998901119999', 'telegram_id' => '777000111',
        'source' => 'telegram_bot', 'stage' => 'form_completed',
    ]);

    $this->actingAs($this->admin)->post(route('leads.convert', $lead), ['contract_type_id' => lifecycleContractType()->id])->assertSessionHasErrors('phone');
});

test('lessons cannot be booked with an inactive instructor or a vehicle in repair', function () {
    $student = lifecycleStudent();
    openDrivingContract($student);
    $payload = fn (array $extra = []) => [
        'instructor_id' => $this->instructor->id, 'student_ids' => [$student->id],
        'start_time' => now()->addDays(2)->setTime(10, 0)->toDateTimeString(), 'end_time' => now()->addDays(2)->setTime(11, 0)->toDateTimeString(), ...$extra,
    ];

    $repair = Vehicle::create(['branch_id' => $this->branch->id, 'make_model' => 'Cobalt', 'plate_number' => '01A123BC', 'status' => 'maintenance']);
    $this->actingAs($this->admin)->post('/admin/drivings', $payload(['vehicle_id' => $repair->id]))->assertSessionHasErrors('vehicle_id');

    $this->instructor->update(['status' => 'inactive']);
    $this->actingAs($this->admin)->post('/admin/drivings', $payload())->assertSessionHasErrors('instructor_id');

    expect(Driving::count())->toBe(0);
});

test('a lesson can be moved inside the contract period even at the lesson limit, but not past its end', function () {
    $student = lifecycleStudent();
    $contract = openDrivingContract($student, ['required_driving_lessons' => 1, 'end_date' => now()->addDays(5)->toDateString()]);
    $lesson = lifecycleLesson($student, '+1 day', $contract);
    $move = fn (int $days) => $this->actingAs($this->admin)->put("/admin/drivings/{$lesson->id}", [
        'start_time' => now()->addDays($days)->setTime(10, 0)->toDateTimeString(), 'end_time' => now()->addDays($days)->setTime(11, 0)->toDateTimeString(),
    ]);

    $move(3)->assertSessionHasNoErrors();
    expect($lesson->fresh()->start_time->isSameDay(now()->addDays(3)))->toBeTrue();

    $move(10)->assertSessionHasErrors('start_time');
    expect($lesson->fresh()->start_time->isSameDay(now()->addDays(3)))->toBeTrue();
});

test('the student list shows the ones who study unless another status is asked for', function () {
    $active = lifecycleStudent();
    $graduate = lifecycleStudent(['status' => 'graduated']);
    $dropped = lifecycleStudent(['status' => 'dropped']);
    $withoutContract = lifecycleStudent();
    foreach ([$active, $graduate, $dropped] as $student) {
        openDrivingContract($student);
    }

    $ids = fn (string $query) => collect($this->actingAs($this->admin)->get("/admin/students{$query}")->inertiaProps('students.data'))->pluck('id')->sort()->values()->all();

    expect($ids(''))->toBe(collect([$active->id, $withoutContract->id])->sort()->values()->all())
        ->and($ids('?status=graduated'))->toBe([$graduate->id])
        ->and($ids('?status=dropped'))->toBe([$dropped->id])
        ->and($ids('?status=all'))->toHaveCount(4)
        ->and($ids('?without_contract=1'))->toBe([$withoutContract->id]);
});

test('students can no longer be created by hand, and the picker offers the active ones', function () {
    $this->actingAs($this->admin)->post('/admin/students', ['full_name' => 'Qo\'lda', 'phone' => '+998901234567'])->assertStatus(405);
    expect(Student::count())->toBe(0);

    $active = lifecycleStudent(['full_name' => 'Faol Talaba']);
    lifecycleStudent(['full_name' => 'Faol Bitirgan', 'status' => 'graduated']);

    $names = fn (string $query) => collect($this->actingAs($this->admin)->getJson("/admin/students/search-api?q=Faol{$query}")->json())->pluck('full_name')->sort()->values()->all();

    expect($names(''))->toBe([$active->full_name])->and($names('&status=all'))->toHaveCount(2);
});

test('the debtors filter leaves out cancelled contracts', function () {
    $open = openDrivingContract(lifecycleStudent(), ['paid_amount' => 0, 'debt_amount' => 500000, 'payment_status' => 'unpaid']);
    openDrivingContract(lifecycleStudent(), ['status' => 'cancelled', 'paid_amount' => 0, 'debt_amount' => 500000, 'payment_status' => 'unpaid']);

    $ids = collect($this->actingAs($this->admin)->get('/admin/contracts?has_debt=1')->inertiaProps('contracts.data'))->pluck('id')->all();

    expect($ids)->toBe([$open->id]);
});

test('the tidy migration frees graduates, cancels lessons of ended contracts and aligns contract groups', function () {
    $group = lifecycleGroup();
    $other = lifecycleGroup();

    $graduate = lifecycleStudent(['status' => 'graduated', 'group_id' => $group->id]);
    $endedStudent = lifecycleStudent();
    openDrivingContract($endedStudent, ['status' => 'cancelled']);
    $orphanLesson = lifecycleLesson($endedStudent);
    $liveStudent = lifecycleStudent(['group_id' => $group->id]);
    $liveContract = openDrivingContract($liveStudent, ['group_id' => $other->id]);
    $liveLesson = lifecycleLesson($liveStudent, '+2 days', $liveContract);

    (require database_path('migrations/2026_10_03_121020_tidy_student_group_and_lesson_state.php'))->up();

    expect($graduate->fresh()->group_id)->toBeNull()
        ->and($orphanLesson->fresh()->status)->toBe('cancelled')
        ->and($liveLesson->fresh()->status)->toBe('scheduled')
        ->and($liveContract->fresh()->group_id)->toBe($group->id);
});
