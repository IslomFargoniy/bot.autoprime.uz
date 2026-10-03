<?php

namespace App\Exports;

use App\Models\Group;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class GroupStudentsExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    private int $rowNumber = 0;

    public function __construct(public Group $group, public array $filters = []) {}

    public function query()
    {
        $query = $this->group->students()->where('status', 'active')->with('drivings.review');

        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return $query->latest('id');
    }

    public function headings(): array
    {
        return [
            '№',
            'F.I.Sh',
            'Telefon',
            'Jami darslar',
            "O'rtacha reyting",
        ];
    }

    public function map($student): array
    {
        $this->rowNumber++;

        $totalDrivings = $student->drivings->count();
        $reviews = $student->drivings->pluck('review')->filter();
        $avgRating = $reviews->count() > 0 ? round($reviews->avg('rating'), 1).' ⭐' : 'Baholanmagan';

        return [
            $this->rowNumber,
            $student->full_name,
            $student->phone,
            $totalDrivings,
            $avgRating,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
