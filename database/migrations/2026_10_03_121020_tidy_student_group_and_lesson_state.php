<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Brings existing data in line with the rules the app now keeps itself (see
     * StudentLifecycleService); safe to run again.
     *
     * 1. Graduates and students who dropped out have left their group.
     * 2. Students whose contracts all ended no longer have lessons ahead of them.
     * 3. The group on an open contract is the student's own group.
     */
    public function up(): void
    {
        DB::table('students')
            ->whereIn('status', ['graduated', 'dropped'])
            ->whereNotNull('group_id')
            ->update(['group_id' => null]);

        $withoutOpenContract = fn ($students) => $students
            ->from('contracts')
            ->select('contracts.student_id')
            ->groupBy('contracts.student_id')
            ->havingRaw("SUM(CASE WHEN contracts.status IN ('active', 'frozen') THEN 1 ELSE 0 END) = 0");

        DB::table('drivings')
            ->where('status', 'scheduled')
            ->where('start_time', '>', now())
            ->whereIn('student_id', $withoutOpenContract(DB::query()))
            ->update(['status' => 'cancelled', 'updated_at' => now()]);

        // Row by row on purpose: a null-safe comparison in SQL differs between MySQL and SQLite.
        DB::table('contracts')
            ->whereIn('status', ['active', 'frozen'])
            ->orderBy('id')
            ->chunkById(200, function ($contracts): void {
                $studentGroups = DB::table('students')
                    ->whereIn('id', $contracts->pluck('student_id'))
                    ->pluck('group_id', 'id');

                foreach ($contracts as $contract) {
                    $studentGroup = $studentGroups[$contract->student_id] ?? null;
                    $studentGroup = $studentGroup === null ? null : (int) $studentGroup;
                    $contractGroup = $contract->group_id === null ? null : (int) $contract->group_id;

                    if ($contractGroup !== $studentGroup) {
                        DB::table('contracts')->where('id', $contract->id)->update(['group_id' => $studentGroup]);
                    }
                }
            });
    }

    public function down(): void
    {
        // The previous state (graduates still in groups, lessons of ended contracts) is not worth restoring.
    }
};
