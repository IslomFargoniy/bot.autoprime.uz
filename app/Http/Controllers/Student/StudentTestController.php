<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Attempt;
use App\Models\AttemptAnswer;
use App\Models\Question;
use App\Models\RoadLine;
use App\Models\SignCategory;
use App\Models\Ticket;
use App\Services\MiniAppStudentResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StudentTestController extends Controller
{
    public const MOCK_EXAM_QUESTIONS = 20;

    public const MOCK_EXAM_PASSING_SCORE = 18;

    public const MOCK_EXAM_DURATION_MINUTES = 25;

    /**
     * Seconds accepted after the exam time limit to absorb network latency.
     */
    public const MOCK_EXAM_GRACE_SECONDS = 60;

    /**
     * Get all active tickets with question counts.
     */
    public function getTickets(): JsonResponse
    {
        $tickets = Ticket::where('is_active', true)
            ->withCount('questions')
            ->orderBy('ticket_number')
            ->get();

        return response()->json([
            'success' => true,
            'tickets' => $tickets,
        ]);
    }

    /**
     * Get questions for a specific ticket.
     */
    public function getTicketQuestions(Ticket $ticket): JsonResponse
    {
        $ticket->load([
            'questions' => function ($q) {
                $q->where('is_active', true)
                    ->with(['answers' => function ($ans) {
                        $ans->orderBy('order');
                    }])
                    ->orderBy('question_number');
            },
        ]);

        return response()->json([
            'success' => true,
            'ticket' => $ticket,
        ]);
    }

    /**
     * Start an internal mock exam: pick random questions and record them on a
     * new attempt so the submission can only be graded against these questions.
     */
    public function getMockExam(Request $request): JsonResponse
    {
        $student = MiniAppStudentResolver::resolve($request);

        $questions = Question::where('is_active', true)
            ->with(['answers' => function ($ans) {
                $ans->orderBy('order');
            }])
            ->inRandomOrder()
            ->limit(self::MOCK_EXAM_QUESTIONS)
            ->get();

        $attempt = DB::transaction(function () use ($student, $request, $questions) {
            $attempt = Attempt::create([
                'student_id' => $student?->id,
                'user_id' => $request->user()?->id,
                'attempt_type' => 'random_mock',
                'total_questions' => $questions->count(),
                'started_at' => now(),
            ]);

            foreach ($questions as $question) {
                AttemptAnswer::create([
                    'attempt_id' => $attempt->id,
                    'question_id' => $question->id,
                ]);
            }

            return $attempt;
        });

        return response()->json([
            'success' => true,
            'attempt_id' => $attempt->id,
            'exam_title' => 'Ichki Nazorat Imtihoni',
            'duration_minutes' => self::MOCK_EXAM_DURATION_MINUTES,
            'total_questions' => self::MOCK_EXAM_QUESTIONS,
            'passing_score' => self::MOCK_EXAM_PASSING_SCORE,
            'questions' => $questions,
        ]);
    }

    /**
     * Submit an attempt, evaluate score, and persist result.
     */
    public function submitAttempt(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'attempt_id' => 'required_if:attempt_type,random_mock,exam|nullable|integer',
            'ticket_id' => 'required_if:attempt_type,ticket_exam,ticket|nullable|exists:tickets,id',
            'attempt_type' => 'required|in:ticket_exam,random_mock,marathon,mistakes,exam,ticket',
            'duration_seconds' => 'nullable|integer|min:0',
            'answers' => 'required|array|max:200',
            'answers.*.question_id' => 'required|integer',
            'answers.*.answer_id' => 'nullable|integer',
        ]);

        $attemptType = match ($validated['attempt_type']) {
            'exam' => 'random_mock',
            'ticket' => 'ticket_exam',
            default => $validated['attempt_type'],
        };

        $student = MiniAppStudentResolver::resolve($request);

        // First submitted answer per question wins; later duplicates are ignored.
        $submittedAnswers = collect($validated['answers'])
            ->unique('question_id')
            ->mapWithKeys(fn (array $item) => [(int) $item['question_id'] => isset($item['answer_id']) ? (int) $item['answer_id'] : null]);

        if ($attemptType === 'random_mock') {
            return $this->submitMockExam($request, (int) $validated['attempt_id'], $student?->id, $submittedAnswers);
        }

        $questionIds = $attemptType === 'ticket_exam'
            ? Question::where('ticket_id', $validated['ticket_id'])->where('is_active', true)->pluck('id')
            : $submittedAnswers->keys();

        $questions = Question::with('answers')->whereIn('id', $questionIds)->get();
        $graded = $this->grade($questions, $submittedAnswers);
        $duration = (int) ($validated['duration_seconds'] ?? 0);

        $attempt = DB::transaction(function () use ($student, $request, $validated, $attemptType, $graded, $duration) {
            $attempt = Attempt::create([
                'student_id' => $student?->id,
                'user_id' => $request->user()?->id,
                'ticket_id' => $validated['ticket_id'] ?? null,
                'attempt_type' => $attemptType,
                'total_questions' => $graded['total'],
                'correct_answers' => $graded['correct'],
                'wrong_answers' => $graded['wrong'],
                'score_percentage' => $graded['score'],
                'is_passed' => $graded['score'] >= 90.0,
                'started_at' => now()->subSeconds($duration),
                'finished_at' => now(),
                'duration_seconds' => $duration,
            ]);

            foreach ($graded['details'] as $detail) {
                AttemptAnswer::create([
                    'attempt_id' => $attempt->id,
                    'question_id' => $detail['question_id'],
                    'answer_id' => $detail['selected_answer_id'],
                    'is_correct' => $detail['is_correct'],
                    'answered_at' => now(),
                ]);
            }

            return $attempt;
        });

        return $this->attemptResponse($attempt, $graded['details']);
    }

    /**
     * Grade a served mock exam exactly once, against the questions stored on it.
     *
     * @param  Collection<int, int|null>  $submittedAnswers
     */
    private function submitMockExam(Request $request, int $attemptId, ?int $studentId, Collection $submittedAnswers): JsonResponse
    {
        $result = DB::transaction(function () use ($attemptId, $studentId, $submittedAnswers) {
            $attempt = Attempt::where('id', $attemptId)
                ->where('attempt_type', 'random_mock')
                ->whereNull('finished_at')
                ->lockForUpdate()
                ->first();

            if (! $attempt || (int) $attempt->student_id !== (int) $studentId) {
                return null;
            }

            $servedRows = $attempt->answers()->get();
            $questions = Question::with('answers')->whereIn('id', $servedRows->pluck('question_id'))->get();
            $graded = $this->grade($questions, $submittedAnswers);

            $duration = (int) $attempt->started_at->diffInSeconds(now());
            $withinTimeLimit = $duration <= self::MOCK_EXAM_DURATION_MINUTES * 60 + self::MOCK_EXAM_GRACE_SECONDS;

            foreach ($graded['details'] as $detail) {
                $servedRows->firstWhere('question_id', $detail['question_id'])?->update([
                    'answer_id' => $detail['selected_answer_id'],
                    'is_correct' => $detail['is_correct'],
                    'answered_at' => $detail['selected_answer_id'] ? now() : null,
                ]);
            }

            $attempt->update([
                'total_questions' => $graded['total'],
                'correct_answers' => $graded['correct'],
                'wrong_answers' => $graded['wrong'],
                'score_percentage' => $graded['score'],
                'is_passed' => $withinTimeLimit && $graded['correct'] >= self::MOCK_EXAM_PASSING_SCORE,
                'finished_at' => now(),
                'duration_seconds' => $duration,
            ]);

            return ['attempt' => $attempt, 'details' => $graded['details']];
        });

        if (! $result) {
            return response()->json([
                'success' => false,
                'message' => 'Imtihon topilmadi yoki allaqachon topshirilgan.',
            ], 422);
        }

        return $this->attemptResponse($result['attempt'], $result['details']);
    }

    /**
     * Grade submitted answers against the given questions. A selected answer
     * only counts when it belongs to its question; unanswered questions are wrong.
     *
     * @param  Collection<int, Question>  $questions
     * @param  Collection<int, int|null>  $submittedAnswers
     * @return array{total: int, correct: int, wrong: int, score: float, details: array<int, array<string, mixed>>}
     */
    private function grade(Collection $questions, Collection $submittedAnswers): array
    {
        $details = [];
        $correctCount = 0;

        foreach ($questions as $question) {
            $selectedAnswerId = $submittedAnswers->get($question->id);
            if ($selectedAnswerId && ! $question->answers->contains('id', $selectedAnswerId)) {
                $selectedAnswerId = null;
            }

            $correctAnswer = $question->answers->firstWhere('is_correct', true);
            $isCorrect = $selectedAnswerId !== null && $correctAnswer && $selectedAnswerId === $correctAnswer->id;
            if ($isCorrect) {
                $correctCount++;
            }

            $details[] = [
                'question_id' => $question->id,
                'selected_answer_id' => $selectedAnswerId,
                'correct_answer_id' => $correctAnswer?->id,
                'is_correct' => $isCorrect,
                'description_uz' => $question->description_uz,
            ];
        }

        $total = count($details);

        return [
            'total' => $total,
            'correct' => $correctCount,
            'wrong' => $total - $correctCount,
            'score' => $total > 0 ? round(($correctCount / $total) * 100, 2) : 0.0,
            'details' => $details,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $details
     */
    private function attemptResponse(Attempt $attempt, array $details): JsonResponse
    {
        return response()->json([
            'success' => true,
            'attempt_id' => $attempt->id,
            'is_passed' => $attempt->is_passed,
            'score_percentage' => (float) $attempt->score_percentage,
            'correct_answers' => $attempt->correct_answers,
            'wrong_answers' => $attempt->wrong_answers,
            'total_questions' => $attempt->total_questions,
            'duration_seconds' => $attempt->duration_seconds,
            'details' => $details,
        ]);
    }

    /**
     * Get traffic signs and road lines grouped by categories.
     */
    public function getSigns(): JsonResponse
    {
        $categories = SignCategory::with(['signs' => function ($q) {
            $q->orderBy('order');
        }])
            ->orderBy('order')
            ->get();

        $roadLines = RoadLine::orderBy('id')->get();

        return response()->json([
            'success' => true,
            'categories' => $categories,
            'road_lines' => $roadLines,
        ]);
    }

    /**
     * Get student exam attempts history and certificate eligibility stats.
     */
    public function getStudentStats(Request $request): JsonResponse
    {
        $student = MiniAppStudentResolver::resolve($request);

        if (! $student) {
            return response()->json([
                'success' => true,
                'has_student' => false,
                'passed_exam' => false,
                'total_attempts' => 0,
                'attempts' => [],
            ]);
        }

        $attempts = Attempt::where('student_id', $student->id)
            ->whereNotNull('finished_at')
            ->with('ticket')
            ->latest('id')
            ->limit(30)
            ->get();

        return response()->json([
            'success' => true,
            'has_student' => true,
            'passed_exam' => $student->hasPassedMockExam(),
            'total_attempts' => $attempts->count(),
            'attempts' => $attempts,
        ]);
    }
}
