<?php

namespace App\Services;

use App\Models\Driving;
use App\Models\Student;
use App\Models\Vehicle;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class DrivingScheduler
{
    /**
     * First scheduling conflict for the given slot, or null when it is free.
     * The instructor, the vehicle and every student must be free; the driving
     * being edited (if any) is ignored.
     *
     * @param  array<int, int|string>  $studentIds
     */
    public function conflictMessage(
        int $instructorId,
        ?Vehicle $vehicle,
        array $studentIds,
        CarbonInterface|string $startTime,
        CarbonInterface|string $endTime,
        ?int $ignoreDrivingId = null,
    ): ?string {
        $overlapping = fn (): Builder => Driving::query()
            ->where('status', 'scheduled')
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->when($ignoreDrivingId, fn (Builder $q) => $q->whereKeyNot($ignoreDrivingId));

        if ($overlapping()->where('instructor_id', $instructorId)->exists()) {
            return 'Instruktor ushbu vaqt oralig\'ida boshqa darsga band (vaqt kesishuvi aniqlandi).';
        }

        if ($vehicle && $overlapping()->where('vehicle_id', $vehicle->id)->exists()) {
            return "Avtomobil ({$vehicle->plate_number}) ushbu vaqt oralig'ida boshqa darsga band.";
        }

        $busyDriving = $overlapping()
            ->whereIn('student_id', $studentIds)
            ->with('student')
            ->first();

        if ($busyDriving && $busyDriving->student) {
            return "{$busyDriving->student->full_name} ushbu vaqt oralig'ida boshqa mashg'ulotga yozilgan.";
        }

        return null;
    }

    /**
     * Why the student may not get a driving lesson at the given time
     * (75% payment rule, cancelled or expired contract), or null when allowed.
     */
    public function studentRestrictionMessage(Student $student, CarbonInterface|string $startTime): ?string
    {
        $activeContract = $student->activeContract;
        if (! $activeContract) {
            return null;
        }

        if ($activeContract->status === 'cancelled') {
            return "{$student->full_name} talabasining shartnomasi bekor qilingan.";
        }

        if ($activeContract->has_driving && ! $activeContract->canAccessDriving()) {
            return "{$student->full_name} talabasi amaliy haydash uchun kamida 75% to'lov qilishi shart (Hozirgi to'lov: {$activeContract->payment_percentage}%).";
        }

        if (! $activeContract->canScheduleDrivingAt(Carbon::parse($startTime))) {
            $formattedDate = $activeContract->end_date ? $activeContract->end_date->format('d.m.Y') : '';

            return "{$student->full_name} talabasining shartnoma muddati tugagan ({$formattedDate}). Mashg'ulot qo'shish uchun shartnoma muddatini uzaytirish kerak.";
        }

        return null;
    }
}
