<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Answer;
use App\Models\Attempt;
use App\Models\Question;
use App\Models\RoadLine;
use App\Models\Sign;
use App\Models\SignCategory;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TestController extends Controller
{
    /**
     * Display tests dashboard, student attempts, tickets and traffic signs.
     */
    public function index(Request $request): Response
    {
        $query = Attempt::with(['student.branch', 'ticket'])
            ->latest('id');

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->whereHas('student', function ($q) use ($s) {
                $q->where('full_name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        if ($request->filled('status')) {
            if ($request->status === 'passed') {
                $query->where('is_passed', true);
            } elseif ($request->status === 'failed') {
                $query->where('is_passed', false);
            }
        }

        if ($request->filled('type')) {
            $query->where('attempt_type', $request->type);
        }

        $attempts = $query->paginate(20)->withQueryString();

        $stats = [
            'total_tickets' => Ticket::count(),
            'total_questions' => Question::count(),
            'total_signs' => Sign::count(),
            'total_attempts' => Attempt::count(),
            'passed_attempts' => Attempt::where('is_passed', true)->count(),
        ];

        $tickets = Ticket::withCount('questions')
            ->orderBy('ticket_number')
            ->get();

        $signCategories = SignCategory::with('signs')
            ->orderBy('order')
            ->get();

        $roadLines = RoadLine::orderBy('id')->get();

        return Inertia::render('Admin/Tests/Index', [
            'attempts' => $attempts,
            'stats' => $stats,
            'tickets' => $tickets,
            'signCategories' => $signCategories,
            'roadLines' => $roadLines,
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    /**
     * Create a new Ticket.
     */
    public function storeTicket(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ticket_number' => 'required|integer|unique:tickets,ticket_number',
            'title_uz' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        Ticket::create([
            'ticket_number' => $validated['ticket_number'],
            'title_uz' => $validated['title_uz'],
            'title_ru' => 'Билет '.$validated['ticket_number'],
            'title_krill' => 'Билет '.$validated['ticket_number'],
            'title_en' => 'Ticket '.$validated['ticket_number'],
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        return back()->with('success', 'Bilet muvaffaqiyatli yaratildi');
    }

    /**
     * Update an existing Ticket.
     */
    public function updateTicket(Request $request, Ticket $ticket): RedirectResponse
    {
        $validated = $request->validate([
            'ticket_number' => 'required|integer|unique:tickets,ticket_number,'.$ticket->id,
            'title_uz' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $ticket->update($validated);

        return back()->with('success', 'Bilet ma\'lumotlari yangilandi');
    }

    /**
     * Delete a Ticket and its questions.
     */
    public function destroyTicket(Ticket $ticket): RedirectResponse
    {
        DB::transaction(function () use ($ticket) {
            foreach ($ticket->questions as $q) {
                $q->answers()->delete();
                $q->delete();
            }
            $ticket->delete();
        });

        return back()->with('success', 'Bilet va uning barcha savollari o\'chirildi');
    }

    /**
     * Create a Question inside a Ticket with its answer choices.
     */
    public function storeQuestion(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ticket_id' => 'required|exists:tickets,id',
            'question_number' => 'nullable|integer',
            'question_uz' => 'required|string',
            'description_uz' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'image_url' => 'nullable|string',
            'answers' => 'required|array|min:2',
            'answers.*.text' => 'required|string',
            'answers.*.is_correct' => 'required|boolean',
        ]);

        $imageUrl = $validated['image_url'] ?? null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('questions', 'public');
            $imageUrl = '/storage/'.$path;
        }

        $nextNumber = $validated['question_number'] ?? (Question::where('ticket_id', $validated['ticket_id'])->max('question_number') + 1);

        DB::transaction(function () use ($validated, $imageUrl, $nextNumber) {
            $question = Question::create([
                'ticket_id' => $validated['ticket_id'],
                'question_number' => $nextNumber,
                'question_uz' => $validated['question_uz'],
                'question_ru' => $validated['question_uz'],
                'question_krill' => $validated['question_uz'],
                'question_en' => $validated['question_uz'],
                'description_uz' => $validated['description_uz'] ?? '',
                'description_ru' => $validated['description_uz'] ?? '',
                'description_krill' => $validated['description_uz'] ?? '',
                'description_en' => $validated['description_uz'] ?? '',
                'image_url' => $imageUrl,
                'is_active' => true,
            ]);

            foreach ($validated['answers'] as $idx => $ans) {
                Answer::create([
                    'question_id' => $question->id,
                    'answer_uz' => $ans['text'],
                    'answer_ru' => $ans['text'],
                    'answer_krill' => $ans['text'],
                    'answer_en' => $ans['text'],
                    'is_correct' => (bool) $ans['is_correct'],
                    'order' => $idx + 1,
                ]);
            }
        });

        return back()->with('success', 'Savol muvaffaqiyatli saqlandi');
    }

    /**
     * Update an existing Question and its answers.
     */
    public function updateQuestion(Request $request, Question $question): RedirectResponse
    {
        $validated = $request->validate([
            'question_uz' => 'required|string',
            'description_uz' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'image_url' => 'nullable|string',
            'answers' => 'required|array|min:2',
            'answers.*.text' => 'required|string',
            'answers.*.is_correct' => 'required|boolean',
        ]);

        $imageUrl = $question->image_url;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('questions', 'public');
            $imageUrl = '/storage/'.$path;
        } elseif ($request->boolean('remove_image')) {
            $imageUrl = null;
        }

        DB::transaction(function () use ($question, $validated, $imageUrl) {
            $question->update([
                'question_uz' => $validated['question_uz'],
                'description_uz' => $validated['description_uz'] ?? '',
                'image_url' => $imageUrl,
            ]);

            // Re-sync answers
            $question->answers()->delete();
            foreach ($validated['answers'] as $idx => $ans) {
                Answer::create([
                    'question_id' => $question->id,
                    'answer_uz' => $ans['text'],
                    'answer_ru' => $ans['text'],
                    'answer_krill' => $ans['text'],
                    'answer_en' => $ans['text'],
                    'is_correct' => (bool) $ans['is_correct'],
                    'order' => $idx + 1,
                ]);
            }
        });

        return back()->with('success', 'Savol yangilandi');
    }

    /**
     * Delete a Question.
     */
    public function destroyQuestion(Question $question): RedirectResponse
    {
        $question->answers()->delete();
        $question->delete();

        return back()->with('success', 'Savol o\'chirildi');
    }

    /**
     * Create a new Traffic Sign.
     */
    public function storeSign(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:sign_categories,id',
            'sign_number' => 'required|string|max:50',
            'name_uz' => 'required|string|max:255',
            'description_uz' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'image_url' => 'nullable|string',
        ]);

        $imageUrl = $validated['image_url'] ?? null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('signs', 'public');
            $imageUrl = '/storage/'.$path;
        }

        Sign::create([
            'category_id' => $validated['category_id'],
            'sign_number' => $validated['sign_number'],
            'name_uz' => $validated['name_uz'],
            'name_ru' => $validated['name_uz'],
            'name_krill' => $validated['name_uz'],
            'name_en' => $validated['name_uz'],
            'description_uz' => $validated['description_uz'] ?? '',
            'description_ru' => $validated['description_uz'] ?? '',
            'description_krill' => $validated['description_uz'] ?? '',
            'description_en' => $validated['description_uz'] ?? '',
            'image_url' => $imageUrl,
            'order' => Sign::max('order') + 1,
        ]);

        return back()->with('success', 'Yo\'l belgisi qo\'shildi');
    }

    /**
     * Update an existing Traffic Sign.
     */
    public function updateSign(Request $request, Sign $sign): RedirectResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:sign_categories,id',
            'sign_number' => 'required|string|max:50',
            'name_uz' => 'required|string|max:255',
            'description_uz' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'image_url' => 'nullable|string',
        ]);

        $imageUrl = $sign->image_url;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('signs', 'public');
            $imageUrl = '/storage/'.$path;
        } elseif ($request->boolean('remove_image')) {
            $imageUrl = null;
        }

        $sign->update([
            'category_id' => $validated['category_id'],
            'sign_number' => $validated['sign_number'],
            'name_uz' => $validated['name_uz'],
            'description_uz' => $validated['description_uz'] ?? '',
            'image_url' => $imageUrl,
        ]);

        return back()->with('success', 'Yo\'l belgisi yangilandi');
    }

    /**
     * Delete a Traffic Sign.
     */
    public function destroySign(Sign $sign): RedirectResponse
    {
        $sign->delete();

        return back()->with('success', 'Yo\'l belgisi o\'chirildi');
    }

    /**
     * Create a new Road Line.
     */
    public function storeRoadLine(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'line_number' => 'required|string|max:50',
            'name_uz' => 'required|string|max:255',
            'description_uz' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'image_url' => 'nullable|string',
        ]);

        $imageUrl = $validated['image_url'] ?? null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('road_lines', 'public');
            $imageUrl = '/storage/'.$path;
        }

        RoadLine::create([
            'line_number' => $validated['line_number'],
            'name_uz' => $validated['name_uz'],
            'name_ru' => $validated['name_uz'],
            'name_krill' => $validated['name_uz'],
            'name_en' => $validated['name_uz'],
            'description_uz' => $validated['description_uz'] ?? '',
            'description_ru' => $validated['description_uz'] ?? '',
            'description_krill' => $validated['description_uz'] ?? '',
            'description_en' => $validated['description_uz'] ?? '',
            'image_url' => $imageUrl,
        ]);

        return back()->with('success', 'Yo\'l chizig\'i qo\'shildi');
    }

    /**
     * Update an existing Road Line.
     */
    public function updateRoadLine(Request $request, RoadLine $roadLine): RedirectResponse
    {
        $validated = $request->validate([
            'line_number' => 'required|string|max:50',
            'name_uz' => 'required|string|max:255',
            'description_uz' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'image_url' => 'nullable|string',
        ]);

        $imageUrl = $roadLine->image_url;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('road_lines', 'public');
            $imageUrl = '/storage/'.$path;
        } elseif ($request->boolean('remove_image')) {
            $imageUrl = null;
        }

        $roadLine->update([
            'line_number' => $validated['line_number'],
            'name_uz' => $validated['name_uz'],
            'description_uz' => $validated['description_uz'] ?? '',
            'image_url' => $imageUrl,
        ]);

        return back()->with('success', 'Yo\'l chizig\'i yangilandi');
    }

    /**
     * Delete a Road Line.
     */
    public function destroyRoadLine(RoadLine $roadLine): RedirectResponse
    {
        $roadLine->delete();

        return back()->with('success', 'Yo\'l chizig\'i o\'chirildi');
    }

    /**
     * Create a Sign Category.
     */
    public function storeSignCategory(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name_uz' => 'required|string|max:255',
            'order' => 'nullable|integer',
        ]);

        $order = $validated['order'] ?? (SignCategory::max('order') + 1);

        SignCategory::create([
            'name_uz' => $validated['name_uz'],
            'name_ru' => $validated['name_uz'],
            'name_krill' => $validated['name_uz'],
            'name_en' => $validated['name_uz'],
            'slug' => Str::slug($validated['name_uz']),
            'order' => $order,
        ]);

        return back()->with('success', 'Yo\'l belgisi toifasi qo\'shildi');
    }

    /**
     * Update an existing Sign Category.
     */
    public function updateSignCategory(Request $request, SignCategory $signCategory): RedirectResponse
    {
        $validated = $request->validate([
            'name_uz' => 'required|string|max:255',
            'order' => 'nullable|integer',
        ]);

        $signCategory->update($validated);

        return back()->with('success', 'Toifa yangilandi');
    }

    /**
     * Delete a Sign Category.
     */
    public function destroySignCategory(SignCategory $signCategory): RedirectResponse
    {
        DB::transaction(function () use ($signCategory) {
            $signCategory->signs()->delete();
            $signCategory->delete();
        });

        return back()->with('success', 'Toifa va uning belgilari o\'chirildi');
    }
}
