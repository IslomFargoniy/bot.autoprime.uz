<?php

use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Question;
use App\Models\Student;
use App\Models\Ticket;

/**
 * Seed a ticket with the given number of questions, each with one correct answer.
 */
function seedTicketWithQuestions(int $questionCount, int $ticketNumber = 1): Ticket
{
    $ticket = Ticket::create(['ticket_number' => $ticketNumber, 'title_uz' => "Bilet {$ticketNumber}", 'is_active' => true]);

    foreach (range(1, $questionCount) as $number) {
        $question = Question::create([
            'ticket_id' => $ticket->id,
            'question_number' => $number,
            'question_uz' => "Savol {$number}",
            'question_ru' => "Вопрос {$number}",
            'is_active' => true,
        ]);

        Answer::create(['question_id' => $question->id, 'answer_uz' => "To'g'ri", 'answer_ru' => 'Верно', 'is_correct' => true, 'order' => 1]);
        Answer::create(['question_id' => $question->id, 'answer_uz' => "Noto'g'ri", 'answer_ru' => 'Неверно', 'is_correct' => false, 'order' => 2]);
    }

    return $ticket;
}

/**
 * @param  array<int, array<string, mixed>>  $questions
 * @return array<int, array{question_id: int, answer_id: int}>
 */
function correctAnswersFor(array $questions): array
{
    return collect($questions)->map(fn (array $question) => [
        'question_id' => $question['id'],
        'answer_id' => collect($question['answers'])->firstWhere('is_correct', true)['id'],
    ])->all();
}

beforeEach(function () {
    $this->student = Student::factory()->create(['telegram_id' => '811811']);
    $this->withHeader('X-Telegram-Init-Data', signedTelegramInitData(811811));
});

test('mock exam records the served questions on an open attempt', function () {
    seedTicketWithQuestions(25);

    $response = $this->getJson('/api/tests/exam')->assertSuccessful();

    $attempt = Attempt::find($response->json('attempt_id'));
    expect($attempt->student_id)->toBe($this->student->id)
        ->and($attempt->finished_at)->toBeNull()
        ->and($attempt->answers()->pluck('question_id')->sort()->values()->all())
        ->toBe(collect($response->json('questions'))->pluck('id')->sort()->values()->all());
});

test('mock exam passes with at least 18 correct answers out of the served 20', function () {
    seedTicketWithQuestions(25);
    $exam = $this->getJson('/api/tests/exam')->json();

    $answers = correctAnswersFor($exam['questions']);
    $answers[0]['answer_id'] = null;
    $answers[1]['answer_id'] = null;

    $this->postJson('/api/tests/submit', [
        'attempt_id' => $exam['attempt_id'],
        'attempt_type' => 'random_mock',
        'answers' => $answers,
    ])->assertSuccessful()->assertJson([
        'is_passed' => true,
        'correct_answers' => 18,
        'total_questions' => 20,
    ]);

    expect($this->student->hasPassedMockExam())->toBeTrue();
});

test('mock exam cannot be passed by submitting only a few questions', function () {
    seedTicketWithQuestions(25);
    $exam = $this->getJson('/api/tests/exam')->json();

    $oneCorrectAnswer = array_slice(correctAnswersFor($exam['questions']), 0, 1);

    $this->postJson('/api/tests/submit', [
        'attempt_id' => $exam['attempt_id'],
        'attempt_type' => 'random_mock',
        'answers' => $oneCorrectAnswer,
    ])->assertSuccessful()->assertJson([
        'is_passed' => false,
        'correct_answers' => 1,
        'total_questions' => 20,
    ]);
});

test('duplicate and foreign questions are not counted', function () {
    seedTicketWithQuestions(25);
    $exam = $this->getJson('/api/tests/exam')->json();
    $firstCorrect = correctAnswersFor($exam['questions'])[0];

    $servedIds = collect($exam['questions'])->pluck('id');
    $foreignQuestion = Question::with('answers')->whereNotIn('id', $servedIds)->first();

    $this->postJson('/api/tests/submit', [
        'attempt_id' => $exam['attempt_id'],
        'attempt_type' => 'random_mock',
        'answers' => [
            ...array_fill(0, 20, $firstCorrect),
            ['question_id' => $foreignQuestion->id, 'answer_id' => $foreignQuestion->answers->firstWhere('is_correct', true)->id],
        ],
    ])->assertSuccessful()->assertJson(['correct_answers' => 1, 'is_passed' => false]);
});

test('an answer belonging to another question is treated as unanswered', function () {
    seedTicketWithQuestions(25);
    $exam = $this->getJson('/api/tests/exam')->json();
    $answers = correctAnswersFor($exam['questions']);
    $answers[0]['answer_id'] = $answers[1]['answer_id'];

    $this->postJson('/api/tests/submit', [
        'attempt_id' => $exam['attempt_id'],
        'attempt_type' => 'random_mock',
        'answers' => $answers,
    ])->assertJson(['correct_answers' => 19]);
});

test('a mock exam can only be submitted once', function () {
    seedTicketWithQuestions(25);
    $exam = $this->getJson('/api/tests/exam')->json();
    $payload = ['attempt_id' => $exam['attempt_id'], 'attempt_type' => 'random_mock', 'answers' => correctAnswersFor($exam['questions'])];

    $this->postJson('/api/tests/submit', $payload)->assertSuccessful();
    $this->postJson('/api/tests/submit', $payload)->assertUnprocessable();

    expect(Attempt::count())->toBe(1);
});

test('a mock exam submitted after the time limit does not pass', function () {
    seedTicketWithQuestions(25);
    $exam = $this->getJson('/api/tests/exam')->json();

    $this->travel(30)->minutes();

    $this->postJson('/api/tests/submit', [
        'attempt_id' => $exam['attempt_id'],
        'attempt_type' => 'random_mock',
        'answers' => correctAnswersFor($exam['questions']),
    ])->assertJson(['correct_answers' => 20, 'is_passed' => false]);
});

test('another student cannot submit someone else\'s exam', function () {
    seedTicketWithQuestions(25);
    $exam = $this->getJson('/api/tests/exam')->json();

    Student::factory()->create(['telegram_id' => '822822']);
    $this->flushSession();

    $this->withHeader('X-Telegram-Init-Data', signedTelegramInitData(822822))
        ->postJson('/api/tests/submit', [
            'attempt_id' => $exam['attempt_id'],
            'attempt_type' => 'random_mock',
            'answers' => correctAnswersFor($exam['questions']),
        ])->assertUnprocessable();
});

test('ticket attempts are graded against every active question of the ticket', function () {
    $ticket = seedTicketWithQuestions(10);
    $questions = $this->getJson("/api/tests/ticket/{$ticket->id}")->json('ticket.questions');

    $this->postJson('/api/tests/submit', [
        'ticket_id' => $ticket->id,
        'attempt_type' => 'ticket_exam',
        'answers' => array_slice(correctAnswersFor($questions), 0, 1),
    ])->assertJson(['total_questions' => 10, 'correct_answers' => 1, 'is_passed' => false]);
});

test('passing a ticket practice does not count as passing the mock exam', function () {
    $ticket = seedTicketWithQuestions(10);
    $questions = $this->getJson("/api/tests/ticket/{$ticket->id}")->json('ticket.questions');

    $this->postJson('/api/tests/submit', [
        'ticket_id' => $ticket->id,
        'attempt_type' => 'ticket_exam',
        'answers' => correctAnswersFor($questions),
    ])->assertJson(['is_passed' => true]);

    expect($this->student->hasPassedMockExam())->toBeFalse();
    $this->getJson('/api/tests/stats')->assertJson(['passed_exam' => false]);
});

test('stats cannot be read for another student via student_id', function () {
    $other = Student::factory()->create();
    Attempt::create([
        'student_id' => $other->id,
        'attempt_type' => 'random_mock',
        'started_at' => now(),
        'finished_at' => now(),
        'is_passed' => true,
    ]);

    $this->getJson("/api/tests/stats?student_id={$other->id}")
        ->assertJson(['has_student' => true, 'total_attempts' => 0]);
});
