<?php

namespace App\Imports;

use App\Models\Group;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class StudentsImport implements ToCollection, WithHeadingRow
{
    protected $groupId;

    protected $branchId;

    public $importedCount = 0;

    /**
     * Rows skipped because the phone is missing/invalid or the student belongs to another branch.
     */
    public $skippedCount = 0;

    public function __construct($groupId, $branchId = null)
    {
        $this->groupId = $groupId;
        $this->branchId = $branchId;
    }

    public function collection(Collection $rows)
    {
        $targetBranchId = $this->branchId;
        if (! $targetBranchId && $this->groupId) {
            $group = Group::find($this->groupId);
            if ($group && $group->branch_id) {
                $targetBranchId = $group->branch_id;
            }
        }

        // All-or-nothing: a failing row must not leave half of the file imported.
        DB::transaction(function () use ($rows, $targetBranchId) {
            foreach ($rows as $row) {
                // Maatwebsite/Excel uses snake_case keys for headers by default
                $fullName = $row['full_name'] ?? $row['ism'] ?? $row['f_i_sh'] ?? $row['name'] ?? null;
                $phone = Student::normalizePhone((string) ($row['phone'] ?? $row['telefon'] ?? $row['tel'] ?? ''));

                if (! $fullName) {
                    continue;
                }

                // Phone is required and is how students are matched.
                if (! $phone) {
                    $this->skippedCount++;

                    continue;
                }

                $student = Student::where('phone', $phone)->first();

                if ($student) {
                    // Never silently pull a student out of another branch.
                    if ($targetBranchId && $student->branch_id && (int) $student->branch_id !== (int) $targetBranchId) {
                        $this->skippedCount++;

                        continue;
                    }

                    $student->group_id = $this->groupId;
                    $student->full_name = $fullName;
                    $student->branch_id = $student->branch_id ?: $targetBranchId;
                    $student->save();
                } else {
                    Student::create([
                        'full_name' => $fullName,
                        'phone' => $phone,
                        'group_id' => $this->groupId,
                        'branch_id' => $targetBranchId,
                    ]);
                }
                $this->importedCount++;
            }
        });
    }
}
