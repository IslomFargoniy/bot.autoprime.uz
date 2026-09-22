<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $branch_id
 * @property int $student_id
 * @property int $contract_id
 * @property int|null $group_id
 * @property int|null $issued_by_user_id
 * @property string $certificate_number
 * @property string|null $series
 * @property string $category
 * @property int $theory_score
 * @property string $practical_status
 * @property float $attendance_rate
 * @property Carbon|null $issued_date
 * @property string $qr_verify_hash
 * @property string $status
 * @property string|null $file_url
 * @property-read Branch|null $branch
 * @property-read Student|null $student
 * @property-read Contract|null $contract
 * @property-read Group|null $group
 * @property-read User|null $issuedBy
 */
class Certificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'student_id',
        'contract_id',
        'group_id',
        'issued_by_user_id',
        'certificate_number',
        'series',
        'category',
        'theory_score',
        'practical_status',
        'attendance_rate',
        'issued_date',
        'qr_verify_hash',
        'status',
        'file_url',
    ];

    protected $casts = [
        'theory_score' => 'integer',
        'attendance_rate' => 'decimal:2',
        'issued_date' => 'date',
    ];

    /**
     * @return BelongsTo<Branch, $this>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<Contract, $this>
     */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /**
     * @return BelongsTo<Group, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_user_id');
    }
}
