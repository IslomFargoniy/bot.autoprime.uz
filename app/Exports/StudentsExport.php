<?php

namespace App\Exports;

use App\Models\Student;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StudentsExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    private int $rowNumber = 0;

    public function __construct(public array $filters = []) {}

    public function query()
    {
        $query = Student::query()->with(['group', 'drivings.review']);

        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if (! empty($this->filters['group_id'])) {
            $query->where('group_id', $this->filters['group_id']);
        }

        if (! empty($this->filters['branch_id'])) {
            $branchId = $this->filters['branch_id'];
            $query->where(function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)
                    ->orWhereHas('group', function ($gQ) use ($branchId) {
                        $gQ->where('branch_id', $branchId);
                    });
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
            'Guruh',
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
            $student->group ? $student->group->name : 'Guruhsiz',
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
