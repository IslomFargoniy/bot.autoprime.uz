<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContractType extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'category',
        'price',
        'has_theory',
        'has_driving',
        'has_lms',
        'required_driving_lessons',
        'required_theory_lessons',
        'min_theory_payment_percent',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'has_theory' => 'boolean',
        'has_driving' => 'boolean',
        'has_lms' => 'boolean',
        'required_driving_lessons' => 'integer',
        'required_theory_lessons' => 'integer',
        'min_theory_payment_percent' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }
}
