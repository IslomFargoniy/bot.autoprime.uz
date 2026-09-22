<?php

namespace App\Models;

use Database\Factories\DrivingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $instructor_id
 * @property int|null $group_id
 * @property int $student_id
 * @property int|null $contract_id
 * @property int|null $vehicle_id
 * @property Carbon|null $date
 * @property Carbon $start_time
 * @property Carbon $end_time
 * @property string $status
 * @property string|null $instructor_comment
 * @property Carbon|null $reminded_24h_at
 * @property Carbon|null $reminded_2h_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $instructor
 * @property-read Group|null $group
 * @property-read Student $student
 * @property-read Contract|null $contract
 * @property-read Vehicle|null $vehicle
 * @property-read Review|null $review
 * @property-read Autodrome|null $autodrome
 */
class Driving extends Model
{
    /** @use HasFactory<DrivingFactory> */
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'instructor_id',
        'group_id',
        'student_id',
        'contract_id',
        'autodrome_id',
        'vehicle_id',
        'date',
        'start_time',
        'end_time',
        'status',
        'instructor_comment',
        'reminded_24h_at',
        'reminded_2h_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'reminded_24h_at' => 'datetime',
            'reminded_2h_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public function autodrome(): BelongsTo
    {
        return $this->belongsTo(Autodrome::class);
    }
}
