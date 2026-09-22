<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_user_id');
    }
}
