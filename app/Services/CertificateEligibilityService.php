<?php

namespace App\Services;

use App\Models\Attempt;
use App\Models\Attendance;
use App\Models\Contract;
use App\Models\Driving;
use Illuminate\Support\Collection;

class CertificateEligibilityService
{
    public const MIN_ATTENDANCE_RATE = 70.0;

    public const DEFAULT_THEORY_LESSONS = 24;

    public const DEFAULT_DRIVING_LESSONS = 10;

    /**
     * Evaluate the four graduation conditions for many contracts with a fixed
     * number of aggregate queries (no per-contract queries).
     *
     * @param  Collection<int, Contract>  $contracts
     * @return array<int, array{debt_ok: bool, attendance_rate: float, attendance_ok: bool, completed_drivings: int, required_drivings: int, driving_ok: bool, passed_exam: bool, is_eligible: bool}>
     */
    public function evaluate(Collection $contracts): array
    {
        $studentIds = $contracts->pluck('student_id')->filter()->unique()->values();

        // Absences must not count towards the attendance rate.
        $attendedLessons = Attendance::whereIn('student_id', $studentIds)
            ->whereIn('status', ['present', 'late'])
            ->selectRaw('student_id, COUNT(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $completedDrivings = Driving::whereIn('student_id', $studentIds)
            ->where('status', 'completed')
            ->selectRaw('student_id, COUNT(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $passedExamStudentIds = Attempt::whereIn('student_id', $studentIds)
            ->where('attempt_type', 'random_mock')
            ->where('is_passed', true)
            ->whereNotNull('finished_at')
            ->distinct()
            ->pluck('student_id')
            ->flip();

        $results = [];
        foreach ($contracts as $contract) {
            $studentId = $contract->student_id;

            $requiredTheory = $contract->required_theory_lessons ?: self::DEFAULT_THEORY_LESSONS;
            $attendanceRate = round(((int) ($attendedLessons[$studentId] ?? 0) / $requiredTheory) * 100, 1);

            $requiredDriving = $contract->required_driving_lessons ?: self::DEFAULT_DRIVING_LESSONS;
            $drivings = (int) ($completedDrivings[$studentId] ?? 0);

            $debtOk = (float) $contract->debt_amount <= 0;
            $attendanceOk = $attendanceRate >= self::MIN_ATTENDANCE_RATE;
            $drivingOk = $drivings >= $requiredDriving;
            $passedExam = isset($passedExamStudentIds[$studentId]);

            $results[$contract->id] = [
                'debt_ok' => $debtOk,
                'attendance_rate' => $attendanceRate,
                'attendance_ok' => $attendanceOk,
                'completed_drivings' => $drivings,
                'required_drivings' => $requiredDriving,
                'driving_ok' => $drivingOk,
                'passed_exam' => $passedExam,
                'is_eligible' => $debtOk && $attendanceOk && $drivingOk && $passedExam,
            ];
        }

        return $results;
    }

    /**
     * @return array{debt_ok: bool, attendance_rate: float, attendance_ok: bool, completed_drivings: int, required_drivings: int, driving_ok: bool, passed_exam: bool, is_eligible: bool}
     */
    public function evaluateOne(Contract $contract): array
    {
        return $this->evaluate(collect([$contract]))[$contract->id];
    }
}
