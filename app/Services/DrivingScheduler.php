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
        if ($student->status !== 'active') {
            return "{$student->full_name} faol o'quvchi emas (holati: {$student->status}).";
        }

        $activeContract = $student->activeContract;
        if (! $activeContract) {
            return "{$student->full_name} talabasining faol shartnomasi yo'q.";
        }

        if (! $activeContract->has_driving) {
            return "{$student->full_name} talabasining shartnomasida amaliy haydash darslari yo'q.";
        }

        $limit = (int) $activeContract->required_driving_lessons;
        if ($limit > 0 && $activeContract->getScheduledOrCompletedDrivingsCount() >= $limit) {
            return "{$student->full_name} uchun shartnoma bo'yicha {$limit} ta darsning hammasi rejalashtirilgan.";
        }

        if (! $activeContract->canAccessDriving()) {
            return "{$student->full_name} talabasi amaliy haydash uchun kamida 75% to'lov qilishi shart (Hozirgi to'lov: {$activeContract->payment_percentage}%).";
        }

        if (! $activeContract->canScheduleDrivingAt(Carbon::parse($startTime))) {
            $formattedDate = $activeContract->end_date ? $activeContract->end_date->format('Y-m-d') : '';

            return "{$student->full_name} talabasining shartnoma muddati tugagan ({$formattedDate}). Mashg'ulot qo'shish uchun shartnoma muddatini uzaytirish kerak.";
        }

        return null;
    }

    /**
     * Why the lesson may not be marked completed now, or null when it may:
     * it must have started and, when the actor is held to the autodrome
     * geofence, they must report a position inside the autodrome radius.
     */
    public function completionRestriction(Driving $driving, CarbonInterface $startTime, bool $requireLocation, mixed $latitude, mixed $longitude): ?string
    {
        if ($startTime->isFuture()) {
            return 'Hali boshlanmagan mashg\'ulotni yakunlab bo\'lmaydi.';
        }

        $autodrome = $driving->autodrome;
        if (! $requireLocation || ! $autodrome) {
            return null;
        }

        if (! is_numeric($latitude) || ! is_numeric($longitude)) {
            return 'Mashg\'ulotni yakunlash uchun joylashuvingizni aniqlash shart.';
        }

        $distance = $this->distanceInMeters((float) $latitude, (float) $longitude, (float) $autodrome->latitude, (float) $autodrome->longitude);

        if ($distance > $autodrome->radius_meters) {
            return 'Siz avtodrom hududida emassiz. Masofangiz: '.round($distance)." metr (Ruxsat etilgan: {$autodrome->radius_meters} metr).";
        }

        return null;
    }

    /**
     * Great-circle distance between two points (Haversine formula) in meters.
     */
    private function distanceInMeters(float $latitudeFrom, float $longitudeFrom, float $latitudeTo, float $longitudeTo): float
    {
        $earthRadius = 6371000;

        $latFrom = deg2rad($latitudeFrom);
        $latTo = deg2rad($latitudeTo);
        $latDelta = $latTo - $latFrom;
        $lonDelta = deg2rad($longitudeTo) - deg2rad($longitudeFrom);

        $angle = 2 * asin(sqrt(sin($latDelta / 2) ** 2 + cos($latFrom) * cos($latTo) * sin($lonDelta / 2) ** 2));

        return $angle * $earthRadius;
    }
}
