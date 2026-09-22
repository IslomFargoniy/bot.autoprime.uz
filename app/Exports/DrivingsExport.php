<?php

namespace App\Exports;

use App\Models\Driving;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DrivingsExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithStyles
{
    private int $rowNumber = 0;

    public function __construct(public array $filters = []) {}

    public function query()
    {
        $query = Driving::query()->with(['student', 'group', 'instructor', 'autodrome', 'review']);

        if (! empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if (! empty($this->filters['status']) && $this->filters['status'] !== 'all') {
            $query->where('status', $this->filters['status']);
        }

        $from = $this->filters['from'] ?? null;
        $to = $this->filters['to'] ?? null;

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

        if (! empty($this->filters['instructor_id'])) {
            $query->where('instructor_id', $this->filters['instructor_id']);
        }

        if (! empty($this->filters['branch_id'])) {
            $query->where('branch_id', $this->filters['branch_id']);
        }

        return $query->orderBy('start_time', 'desc');
    }

    public function headings(): array
    {
        return [
            '№',
            "O'quvchi F.I.Sh",
            'Guruh',
            'Instruktor',
            'Avtodrom',
            'Boshlanish vaqti',
            'Tugash vaqti',
            'Holati',
            'Baho',
            'Sabablar (Teglar)',
            'Matnli izoh',
        ];
    }

    public function map($driving): array
    {
        $this->rowNumber++;

        $statusText = match ($driving->status) {
            'completed' => 'Yakunlangan',
            'scheduled' => 'Rejalashtirilgan',
            'cancelled' => 'Bekor qilingan',
            default => $driving->status,
        };

        $rating = $driving->review ? "{$driving->review->rating} ⭐" : 'Baholanmagan';
        $tags = $driving->review && ! empty($driving->review->reason_tags) ? implode(', ', $driving->review->reason_tags) : '';
        $comment = $driving->review->comment ?? '';

        return [
            $this->rowNumber,
            $driving->student ? $driving->student->full_name : "Noma'lum",
            $driving->group ? $driving->group->name : 'Guruhsiz',
            $driving->instructor ? $driving->instructor->name : 'Biriktirilmagan',
            $driving->autodrome ? $driving->autodrome->name : 'Kiritilmagan',
            $driving->start_time ? $driving->start_time->format('d.m.Y H:i') : '',
            $driving->end_time ? $driving->end_time->format('H:i') : '',
            $statusText,
            $rating,
            $tags,
            $comment,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
