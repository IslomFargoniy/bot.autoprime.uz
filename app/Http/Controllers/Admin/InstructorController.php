<?php

namespace App\Http\Controllers\Admin;

use App\Exports\InstructorsExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Driving;
use App\Models\User;
use App\Services\BranchSessionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class InstructorController extends Controller
{
    public function export(Request $request)
    {
        $filters = $request->all();
        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $filters['branch_id'] = $targetBranchId;
        }

        return Excel::download(new InstructorsExport($filters), 'instruktorlar.xlsx');
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $query = User::with('branch')->where('role', 'instructor')->orderBy('id', 'desc');

        $targetBranchId = BranchSessionService::getActiveBranchId($request);
        if ($targetBranchId) {
            $query->where('branch_id', $targetBranchId);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('car_name', 'like', "%{$search}%");
            });
        }

        $from = $request->input('from', Carbon::now()->startOfMonth()->format('d-m-Y'));
        $to = $request->input('to', Carbon::now()->format('d-m-Y'));

        $drivingsQuery = function ($query) use ($from, $to) {
            $query->with('review');
            if ($from) {
                try {
                    $fromDate = preg_match('/^\d{2}-\d{2}-\d{4}$/', $from)
                        ? Carbon::createFromFormat('d-m-Y', $from)->startOfDay()
                        : Carbon::parse($from)->startOfDay();
                    $query->where('start_time', '>=', $fromDate);
                } catch (\Exception $e) {
                }
            }
            if ($to) {
                try {
                    $toDate = preg_match('/^\d{2}-\d{2}-\d{4}$/', $to)
                        ? Carbon::createFromFormat('d-m-Y', $to)->endOfDay()
                        : Carbon::parse($to)->endOfDay();
                    $query->where('start_time', '<=', $toDate);
                } catch (\Exception $e) {
                }
            }
        };

        $perPage = $request->get('per_page', '25');

        $items = $query->withCount('groups')
            ->with([
                'groups' => fn ($gQuery) => $gQuery->withCount('students'),
                'drivings' => $drivingsQuery,
            ])
            ->get();

        $transformed = $items->map(function (User $instructor) {
            $studentsCount = $instructor->groups->sum('students_count');
            $totalDrivings = $instructor->drivings->count();
            $completedDrivings = $instructor->drivings->where('status', 'completed')->count();
            $scheduledDrivings = $instructor->drivings->where('status', 'scheduled')->count();

            $reviews = $instructor->drivings->pluck('review')->filter();
            $totalReviews = $reviews->count();
            $totalScore = (int) $reviews->sum('rating');
            $maxScore = $totalReviews * 5;

            $averageRating = $totalReviews > 0 ? $reviews->avg('rating') : 0;
            $kpiPercentage = $maxScore > 0 ? ($totalScore / $maxScore) * 100 : 0;

            $allTags = $reviews->pluck('reason_tags')->flatten()->filter();

            $negativeTagsCount = $allTags->filter(function ($tag) {
                return in_array($tag, ['⏰ Kechikdi', '🗣 Muomala yomon', '🚗 Mashina nosoz', '⏳ Vaqtidan kam o\'tildi']);
            })->count();

            $isLowRating = $totalReviews > 0 && $averageRating <= 3;
            $needsAttention = $isLowRating || $negativeTagsCount >= 3;

            return [
                'id' => $instructor->id,
                'name' => $instructor->name,
                'phone' => $instructor->phone,
                'telegram_id' => $instructor->telegram_id,
                'car_name' => $instructor->car_name,
                'photo_url' => $instructor->photo_url,
                'branch_id' => $instructor->branch_id,
                'branch' => $instructor->branch ? ['id' => $instructor->branch->id, 'name' => $instructor->branch->name] : null,
                'groups_count' => $instructor->groups_count,
                'students_count' => $studentsCount,
                'total_drivings' => $totalDrivings,
                'completed_drivings' => $completedDrivings,
                'scheduled_drivings' => $scheduledDrivings,
                'reviewed_drivings' => $totalReviews,
                'total_score' => $totalScore,
                'average_rating' => $averageRating > 0 ? round($averageRating, 2) : 0,
                'kpi_percentage' => round($kpiPercentage, 1),
                'negative_tags_count' => $negativeTagsCount,
                'is_low_rating' => $isLowRating,
                'needs_attention' => $needsAttention,
            ];
        })->sortByDesc('kpi_percentage')->values();

        $page = LengthAwarePaginator::resolveCurrentPage();
        $perPageInt = $perPage === 'all' ? max($transformed->count(), 1) : (int) $perPage;

        $paginatedItems = $transformed->slice(($page - 1) * $perPageInt, $perPageInt)->values();

        $instructors = new LengthAwarePaginator(
            $paginatedItems,
            $transformed->count(),
            $perPageInt,
            $page,
            ['path' => LengthAwarePaginator::resolveCurrentPath(), 'query' => $request->query()]
        );

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Instructors/Index', [
            'instructors' => $instructors,
            'branches' => $branches,
            'filters' => [
                'search' => $request->search,
                'branch_id' => $targetBranchId,
                'from' => $from,
                'to' => $to,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    public function show(Request $request, User $instructor): Response
    {
        $instructor->loadCount('groups');

        $drivings = Driving::with(['student.group', 'autodrome', 'review'])
            ->where('instructor_id', $instructor->id)
            ->orderBy('start_time', 'desc')
            ->get();

        $reviews = $drivings->pluck('review')->filter();
        $totalReviews = $reviews->count();
        $totalScore = (int) $reviews->sum('rating');
        $maxScore = $totalReviews * 5;
        $averageRating = $totalReviews > 0 ? round($reviews->avg('rating'), 2) : 0;
        $kpiPercentage = $maxScore > 0 ? round(($totalScore / $maxScore) * 100, 1) : 0;

        $allTags = $reviews->pluck('reason_tags')->flatten()->filter()->values();
        $tagCounts = $allTags->countBy()->map(function ($count, $tag) use ($totalReviews) {
            return [
                'tag' => $tag,
                'count' => $count,
                'percentage' => $totalReviews > 0 ? round(($count / $totalReviews) * 100, 1) : 0,
            ];
        })->values()->sortByDesc('count')->values();

        $ratingDistribution = [];
        for ($star = 5; $star >= 1; $star--) {
            $count = $reviews->where('rating', $star)->count();
            $ratingDistribution[] = [
                'stars' => $star,
                'count' => $count,
                'percentage' => $totalReviews > 0 ? round(($count / $totalReviews) * 100, 1) : 0,
            ];
        }

        return Inertia::render('Admin/Instructors/Show', [
            'instructor' => [
                'id' => $instructor->id,
                'name' => $instructor->name,
                'phone' => $instructor->phone,
                'telegram_id' => $instructor->telegram_id,
                'car_name' => $instructor->car_name,
                'photo_url' => $instructor->photo_url,
                'groups_count' => $instructor->groups_count,
            ],
            'stats' => [
                'total_drivings' => $drivings->count(),
                'completed_drivings' => $drivings->where('status', 'completed')->count(),
                'scheduled_drivings' => $drivings->where('status', 'scheduled')->count(),
                'cancelled_drivings' => $drivings->where('status', 'cancelled')->count(),
                'total_reviews' => $totalReviews,
                'average_rating' => $averageRating,
                'kpi_percentage' => $kpiPercentage,
                'tag_counts' => $tagCounts,
                'rating_distribution' => $ratingDistribution,
            ],
            'drivings' => $drivings,
        ]);
    }

    public function store(Request $request)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:users',
            'telegram_id' => 'nullable|string|unique:users',
            'car_name' => 'nullable|string|max:255',
            'branch_id' => 'nullable|exists:branches,id',
            'photo' => 'nullable|image|max:5120',
            'password' => 'required|string|min:6',
        ]);

        $user = $request->user();
        $branchId = ($user->role === 'admin' && $user->branch_id) ? $user->branch_id : ($validated['branch_id'] ?? $user->branch_id);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('instructors', 'public');
        }

        User::create([
            'branch_id' => $branchId,
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'telegram_id' => $validated['telegram_id'] ?? null,
            'car_name' => $validated['car_name'] ?? null,
            'photo_path' => $photoPath,
            'password' => Hash::make($validated['password']),
            'role' => 'instructor',
        ]);

        return redirect()->back();
    }

    public function update(Request $request, User $instructor)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:users,phone,'.$instructor->id,
            'telegram_id' => 'nullable|string|unique:users,telegram_id,'.$instructor->id,
            'car_name' => 'nullable|string|max:255',
            'branch_id' => 'nullable|exists:branches,id',
            'photo' => 'nullable|image|max:5120',
            'password' => 'nullable|string|min:6',
        ]);

        if ($request->hasFile('photo')) {
            if ($instructor->photo_path) {
                Storage::disk('public')->delete($instructor->photo_path);
            }
            $validated['photo_path'] = $request->file('photo')->store('instructors', 'public');
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $instructor->update($validated);

        return redirect()->back();
    }

    public function destroy(User $instructor, Request $request)
    {
        if ($request->user()->role === 'instructor') {
            abort(403, 'Instruktorlar faqat mashg\'ulotlar (drivings) bo\'limida amaliyot bajara oladi.');
        }

        if ($instructor->photo_path) {
            Storage::disk('public')->delete($instructor->photo_path);
        }

        $instructor->delete();

        return redirect()->back();
    }
}
