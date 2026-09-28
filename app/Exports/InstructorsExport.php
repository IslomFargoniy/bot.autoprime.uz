<?php

namespace App\Exports;

use App\Models\User;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InstructorsExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    private int $rowNumber = 0;

    public function __construct(public array $filters = []) {}

    public function collection()
    {
        $query = User::permission('drivings.conduct')->orderBy('id', 'desc');

        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('car_name', 'like', "%{$search}%");
            });
        }

        if (! empty($this->filters['branch_id'])) {
            $query->where('branch_id', $this->filters['branch_id']);
        }

        $from = $this->filters['from'] ?? null;
        $to = $this->filters['to'] ?? null;

        $drivingsQuery = function ($dQuery) use ($from, $to) {
            $dQuery->with('review');
            if ($from) {
                try {
                    $fromDate = preg_match('/^\d{2}-\d{2}-\d{4}$/', $from)
                        ? Carbon::createFromFormat('d-m-Y', $from)->startOfDay()
                        : Carbon::parse($from)->startOfDay();
                    $dQuery->where('start_time', '>=', $fromDate);
                } catch (\Exception $e) {
                }
            }
            if ($to) {
                try {
                    $toDate = preg_match('/^\d{2}-\d{2}-\d{4}$/', $to)
                        ? Carbon::createFromFormat('d-m-Y', $to)->endOfDay()
                        : Carbon::parse($to)->endOfDay();
                    $dQuery->where('start_time', '<=', $toDate);
                } catch (\Exception $e) {
                }
            }
        };

        $items = $query->withCount('groups')
            ->with([
                'groups' => fn ($gQuery) => $gQuery->withCount('students'),
                'drivings' => $drivingsQuery,
            ])
            ->get();

        return $items->sortByDesc(function ($instructor) {
            $reviews = $instructor->drivings->pluck('review')->filter();
            $totalReviews = $reviews->count();
            $totalScore = (int) $reviews->sum('rating');
            $maxScore = $totalReviews * 5;

            return $maxScore > 0 ? ($totalScore / $maxScore) * 100 : 0;
        })->values();
    }

    public function headings(): array
    {
        return [
            '№',
            'F.I.Sh',
            'Telefon',
            'Biriktirilgan mashina',
            'Guruhlar soni',
            'O\'quvchilar soni',
            'O\'tkazilgan darslar',
            'O\'rtacha reyting',
            'KPI (%)',
        ];
    }

    public function map($instructor): array
    {
        $this->rowNumber++;

        $studentsCount = $instructor->groups->sum('students_count');
        $completedDrivings = $instructor->drivings->where('status', 'completed')->count();

        $reviews = $instructor->drivings->pluck('review')->filter();
        $totalReviews = $reviews->count();
        $totalScore = (int) $reviews->sum('rating');
        $maxScore = $totalReviews * 5;

        $averageRating = $totalReviews > 0 ? round($reviews->avg('rating'), 1).' ⭐' : 'Baholanmagan';
        $kpiPercentage = $maxScore > 0 ? round(($totalScore / $maxScore) * 100, 1).'%' : '0%';

        return [
            $this->rowNumber,
            $instructor->name,
            $instructor->phone,
            $instructor->car_name ?: 'Biriktirilmagan',
            $instructor->groups_count,
            $studentsCount,
            $completedDrivings,
            $averageRating,
            $kpiPercentage,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
