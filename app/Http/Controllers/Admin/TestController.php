<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attempt;
use App\Models\Question;
use App\Models\RoadLine;
use App\Models\Sign;
use App\Models\SignCategory;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TestController extends Controller
{
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
}
