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

    protected $appends = ['type', 'description', 'status', 'is_paid'];

    public function getIsPaidAttribute(): bool
    {
        return $this->payments()->sum('amount') >= (float) $this->amount;
    }

    public function getStatusAttribute(): string
    {
        return $this->is_paid ? 'paid' : 'accrued';
    }

    public function getTypeAttribute(): ?string
    {
        return $this->salary_type;
    }

    public function setTypeAttribute(?string $value): void
    {
        $this->attributes['salary_type'] = $value;
    }

    public function getDescriptionAttribute(): ?string
    {
        return $this->notes;
    }

    public function setDescriptionAttribute(?string $value): void
    {
        $this->attributes['notes'] = $value;
    }

    public function getCalculatedByUserIdAttribute(): ?int
    {
        return $this->created_by_user_id;
    }

    public function setCalculatedByUserIdAttribute(?int $value): void
    {
        $this->attributes['created_by_user_id'] = $value;
    }

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
