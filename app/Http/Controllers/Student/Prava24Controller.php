<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Attempt;
use App\Models\AttemptAnswer;
use App\Models\Question;
use App\Models\RoadLine;
use App\Models\SignCategory;
use App\Models\Student;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Prava24Controller extends Controller
{
    /**
     * Resolve student from Telegram initData, session, or request param.
     */
    protected function resolveStudent(Request $request): ?Student
    {
        $telegramId = null;

        $initData = $request->header('X-Telegram-Init-Data')
            ?? $request->input('initData')
            ?? $request->query('_auth')
            ?? $request->session()->get('tg_init_data');

        if ($initData) {
            parse_str($initData, $parsedData);
            if (isset($parsedData['user'])) {
                $tgUser = json_decode($parsedData['user'], true);
                $telegramId = $tgUser['id'] ?? null;
            }
        }

        if (! $telegramId && $request->filled('student_id')) {
            return Student::find($request->student_id);
        }

        if (! $telegramId && (app()->environment('local') || config('app.debug'))) {
            $telegramId = $request->query('test_telegram_id');
        }

        if (! $telegramId && $request->user()) {
            $telegramId = $request->user()->telegram_id;
        }

        if (! $telegramId) {
            return null;
        }

        return Student::where('telegram_id', (string) $telegramId)->first();
    }

    /**
     * Get all active tickets with question counts.
     */
    public function getTickets(): JsonResponse
    {
        $tickets = Ticket::where('is_active', true)
            ->withCount('questions')
            ->orderBy('ticket_number')
            ->get(['id', 'ticket_number', 'title_uz', 'title_ru', 'title_krill', 'title_en', 'description', 'is_active']);

        return response()->json([
            'success' => true,
            'tickets' => $tickets,
        ]);
    }

    /**
     * Get specific ticket questions with answers.
     */
    public function getTicketQuestions(Ticket $ticket): JsonResponse
    {
        $questions = Question::where('ticket_id', $ticket->id)
            ->where('is_active', true)
            ->with(['answers' => function ($q) {
                $q->orderBy('order');
            }])
            ->orderBy('question_number')
            ->get();

        return response()->json([
            'success' => true,
            'ticket' => $ticket,
            'questions' => $questions,
        ]);
    }

    /**
     * Get 20 random questions for internal mock exam.
     */
    public function getMockExam(): JsonResponse
    {
        $questions = Question::where('is_active', true)
            ->with(['answers' => function ($q) {
                $q->orderBy('order');
            }])
            ->inRandomOrder()
            ->take(20)
            ->get();

        return response()->json([
            'success' => true,
            'exam_title' => 'Prava24 Ichki Nazorat Imtihoni',
            'duration_minutes' => 25,
            'total_questions' => $questions->count(),
            'passing_score' => 18,
            'questions' => $questions,
        ]);
    }

    /**
     * Submit exam or ticket practice answers.
     */
    public function submitAttempt(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => 'nullable|integer',
            'ticket_id' => 'nullable|exists:tickets,id',
            'attempt_type' => 'required|in:ticket_exam,random_mock,marathon,mistakes',
            'duration_seconds' => 'nullable|integer',
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|exists:questions,id',
            'answers.*.answer_id' => 'nullable|exists:answers,id',
        ]);

        $student = $this->resolveStudent($request);
        $studentId = $student?->id ?? $validated['student_id'] ?? null;
        $userId = $request->user()?->id ?? null;

        $userAnswers = $validated['answers'];
        $totalQuestions = count($userAnswers);
        $correctCount = 0;
        $wrongCount = 0;
        $details = [];

        foreach ($userAnswers as $item) {
            $questionId = $item['question_id'];
            $selectedAnswerId = $item['answer_id'] ?? null;

            $question = Question::with('answers')->find($questionId);
            $correctAnswer = $question?->answers->firstWhere('is_correct', true);

            $isCorrect = false;
            if ($selectedAnswerId && $correctAnswer && $selectedAnswerId == $correctAnswer->id) {
                $isCorrect = true;
                $correctCount++;
            } else {
                $wrongCount++;
            }

            $details[] = [
                'question_id' => $questionId,
                'selected_answer_id' => $selectedAnswerId,
                'correct_answer_id' => $correctAnswer?->id,
                'is_correct' => $isCorrect,
                'description_uz' => $question?->description_uz,
            ];
        }

        $scorePercentage = $totalQuestions > 0 ? round(($correctCount / $totalQuestions) * 100, 2) : 0;

        // Passing condition: 18 out of 20 for mock exam, or >= 90%
        $isPassed = false;
        if ($validated['attempt_type'] === 'random_mock') {
            $isPassed = ($correctCount >= 18 && $totalQuestions >= 20) || ($scorePercentage >= 90.0);
        } else {
            $isPassed = $scorePercentage >= 90.0;
        }

        $duration = (int) ($validated['duration_seconds'] ?? 0);

        $attempt = Attempt::create([
            'student_id' => $studentId,
            'user_id' => $userId,
            'ticket_id' => $validated['ticket_id'] ?? null,
            'attempt_type' => $validated['attempt_type'],
            'total_questions' => $totalQuestions,
            'correct_answers' => $correctCount,
            'wrong_answers' => $wrongCount,
            'score_percentage' => $scorePercentage,
            'is_passed' => $isPassed,
            'started_at' => now()->subSeconds($duration),
            'finished_at' => now(),
            'duration_seconds' => $duration,
        ]);

        foreach ($details as $d) {
            AttemptAnswer::create([
                'attempt_id' => $attempt->id,
                'question_id' => $d['question_id'],
                'answer_id' => $d['selected_answer_id'],
                'is_correct' => $d['is_correct'],
                'answered_at' => now(),
                'duration_seconds' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'attempt_id' => $attempt->id,
            'is_passed' => $isPassed,
            'score_percentage' => $scorePercentage,
            'correct_answers' => $correctCount,
            'wrong_answers' => $wrongCount,
            'total_questions' => $totalQuestions,
            'duration_seconds' => $duration,
            'details' => $details,
        ]);
    }

    /**
     * Get traffic signs categorized and road lines.
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
     * Get student attempts statistics.
     */
    public function getStudentStats(Request $request): JsonResponse
    {
        $student = $this->resolveStudent($request);

        if (! $student) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found',
            ], 404);
        }

        $attempts = Attempt::where('student_id', $student->id)
            ->with('ticket')
            ->orderBy('created_at', 'desc')
            ->take(15)
            ->get();

        $passedCount = Attempt::where('student_id', $student->id)->where('is_passed', true)->count();
        $totalAttempts = Attempt::where('student_id', $student->id)->count();

        return response()->json([
            'success' => true,
            'has_passed_exam' => $passedCount > 0,
            'total_attempts' => $totalAttempts,
            'passed_attempts' => $passedCount,
            'recent_attempts' => $attempts,
        ]);
    }
}
