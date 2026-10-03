<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\Driving;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

/**
 * Keeps students, contracts, groups and lessons consistent when one of them changes
 * state: a contract that ends, freezes or comes back, a student who drops out.
 * Controllers call these methods inside their own transaction (or none: each method
 * opens one itself) instead of repeating the side effects.
 */
class StudentLifecycleService
{
    /**
     * A contract was cancelled or completed: its coming lessons are cancelled and,
     * unless the student has another open contract, the student leaves the group.
     *
     * @return int number of lessons that were cancelled
     */
    public function contractEnded(Contract $contract): int
    {
        return DB::transaction(function () use ($contract): int {
            $cancelled = $this->cancelUpcomingDrivings($contract);

            $this->releaseGroupWithoutOpenContract($contract->student_id);

            return $cancelled;
        });
    }

    /**
     * A contract was frozen: remember the day, so it can be paid back in days later,
     * and cancel the lessons that were still ahead.
     *
     * @return int number of lessons that were cancelled
     */
    public function contractFrozen(Contract $contract): int
    {
        return DB::transaction(function () use ($contract): int {
            $contract->update(['frozen_at' => today()]);

            return $this->cancelUpcomingDrivings($contract);
        });
    }

    /**
     * A frozen contract is active again: the days it was frozen are added to its end
     * date, otherwise the student would lose them. When the end date was just set by hand
     * (`$extendEndDate` false) it is left as typed.
     */
    public function contractUnfrozen(Contract $contract, bool $extendEndDate = true): void
    {
        if (! $contract->frozen_at) {
            return;
        }

        $frozenDays = (int) $contract->frozen_at->diffInDays(today());

        $contract->update([
            'end_date' => $extendEndDate ? $contract->end_date?->copy()->addDays($frozenDays) : $contract->end_date,
            'frozen_at' => null,
        ]);
    }

    /**
     * A student dropped out: every open contract is cancelled (the debt stays on it, the
     * money side is untouched), the coming lessons are cancelled and the group is left.
     */
    public function studentDropped(Student $student): void
    {
        DB::transaction(function () use ($student): void {
            $student->contracts()
                ->whereIn('status', ['active', 'frozen'])
                ->get()
                ->each(function (Contract $contract): void {
                    $contract->update(['status' => 'cancelled', 'frozen_at' => null]);
                    $this->cancelUpcomingDrivings($contract);
                });

            $student->update(['group_id' => null]);
        });
    }

    /**
     * The student's open contract follows the student's group: the student record is the
     * one source of truth, the contract only mirrors it.
     */
    public function syncContractGroup(Student $student): void
    {
        Contract::where('student_id', $student->id)
            ->whereIn('status', ['active', 'frozen'])
            ->update(['group_id' => $student->group_id]);
    }

    /**
     * Leave the group when no active or frozen contract is left to justify it.
     */
    public function releaseGroupWithoutOpenContract(int $studentId): void
    {
        $hasOpenContract = Contract::where('student_id', $studentId)
            ->whereIn('status', ['active', 'frozen'])
            ->exists();

        if (! $hasOpenContract) {
            Student::whereKey($studentId)->update(['group_id' => null]);
        }
    }

    /**
     * Cancel the lessons of the contract that have not started yet. Lessons from before
     * contracts were linked to them (no contract) count for the student's open contract.
     *
     * @return int number of lessons that were cancelled
     */
    private function cancelUpcomingDrivings(Contract $contract): int
    {
        $drivings = Driving::where('student_id', $contract->student_id)
            ->where('status', 'scheduled')
            ->where('start_time', '>', now())
            ->where(fn ($q) => $q->where('contract_id', $contract->id)->orWhereNull('contract_id'))
            ->get();

        foreach ($drivings as $driving) {
            $driving->update(['status' => 'cancelled']);
            app(TelegramService::class)->sendDrivingCancelledNotification($driving);
        }

        return $drivings->count();
    }
}
