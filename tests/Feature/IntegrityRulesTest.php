<?php

use App\Models\Answer;
use App\Models\Attempt;
use App\Models\AttemptAnswer;
use App\Models\Branch;
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
