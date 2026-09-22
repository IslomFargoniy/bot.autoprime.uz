<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Salary extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'user_id',
        'created_by_user_id',
        'period',
        'salary_type',
        'amount',
        'is_deduction',
        'lessons_or_hours_count',
        'notes',
        'accrued_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_deduction' => 'boolean',
        'lessons_or_hours_count' => 'integer',
        'accrued_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function calculatedBy(): BelongsTo
    {
        return $this->createdBy();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalaryPayment::class);
    }

    public function salaryPayments(): HasMany
    {
        return $this->payments();
    }
}
