<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Driving;
use App\Models\Review;
use App\Models\Student;
use App\Models\User;
use App\Services\BranchSessionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $from = $request->input('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to = $request->input('to', Carbon::now()->format('Y-m-d'));

        $fromDate = Carbon::now()->startOfMonth();
        $toDate = Carbon::now()->endOfDay();
        if ($from) {
            try {
                $fromDate = preg_match('/^\d{2}-\d{2}-\d{4}$/', $from)
                    ? Carbon::createFromFormat('d-m-Y', $from)->startOfDay()
                    : Carbon::parse($from)->startOfDay();
            } catch (\Exception $e) {
            }
        }
        if ($to) {
            try {
                $toDate = preg_match('/^\d{2}-\d{2}-\d{4}$/', $to)
                    ? Carbon::createFromFormat('d-m-Y', $to)->endOfDay()
                    : Carbon::parse($to)->endOfDay();
            } catch (\Exception $e) {
            }
        }

        $user = $request->user();
        $isInstructor = $user->worksOnOwnRecordsOnly();

        $branchId = BranchSessionService::getActiveBranchId($request);

        $totalStudents = Student::when($branchId, fn ($q) => $q->inBranch($branchId))
            ->visibleTo($user)
            ->count();

        // Ensure reviews only belong to drivings
        $periodAvgRating = Review::whereBetween('created_at', [$fromDate, $toDate])
            ->when($branchId || $isInstructor, function ($query) use ($branchId, $isInstructor, $user) {
                $query->whereHas('driving', function ($q) use ($branchId, $isInstructor, $user) {
                    if ($branchId) {
                        $q->where('branch_id', $branchId);
                    }
                    if ($isInstructor) {
                        $q->where('instructor_id', $user->id);
                    }
                });
            })
            ->avg('rating') ?? 0;

        $periodKpi = round(($periodAvgRating / 5) * 100, 1);

        $drivingsQuery = Driving::whereBetween('start_time', [$fromDate, $toDate])
            ->when($branchId, function ($query) use ($branchId) {
                $query->where('branch_id', $branchId);
            })
            ->when($isInstructor, function ($query) use ($user) {
                $query->where('instructor_id', $user->id);
            });

        $drivingStats = (clone $drivingsQuery)
            ->selectRaw('DATE(start_time) as date_val, status, COUNT(*) as count')
            ->groupBy('date_val', 'status')
            ->get();

        $periodDrivingsCount = (int) $drivingStats->sum('count');
        $completedPeriodDrivings = (int) $drivingStats->where('status', 'completed')->sum('count');

        $completionRate = $periodDrivingsCount > 0
            ? round(($completedPeriodDrivings / $periodDrivingsCount) * 100, 1)
            : 0;

        // Group by "Y-m-d_status" for O(1) fast lookup
        $metricsLookup = [];
        foreach ($drivingStats as $stat) {
            $metricsLookup[$stat->date_val.'_'.$stat->status] = (int) $stat->count;
        }

        $chartData = [];
        $currentDate = $fromDate->copy();

        // Limit to prevent huge arrays if user selects a massive range
        $maxDays = 90;
        $daysAdded = 0;

        while ($currentDate->lte($toDate) && $daysAdded < $maxDays) {
            $dateFormatted = $currentDate->format('Y-m-d');
            $dateDb = $currentDate->format('Y-m-d');

            $chartData[] = [
                'date' => $dateFormatted,
                'Rejada' => $metricsLookup[$dateDb.'_scheduled'] ?? 0,
                'Tugagan' => $metricsLookup[$dateDb.'_completed'] ?? 0,
                'Bekor_qilingan' => $metricsLookup[$dateDb.'_cancelled'] ?? 0,
            ];

            $currentDate->addDay();
            $daysAdded++;
        }

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Dashboard/Index', [
            'metrics' => [
                'totalStudents' => $totalStudents,
                'todayKpi' => $periodKpi,
                'monthlyDrivingsCount' => $periodDrivingsCount,
                'completionRate' => $completionRate,
            ],
            'chartData' => $chartData,
            'branches' => $branches,
            'filters' => [
                'from' => $from,
                'to' => $to,
                'branch_id' => $branchId,
            ],
        ]);
    }
}
