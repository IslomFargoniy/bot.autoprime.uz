<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $branch_id
 * @property int $student_id
 * @property int|null $contract_type_id
 * @property int|null $group_id
 * @property int|null $created_by_user_id
 * @property string $contract_number
 * @property Carbon|null $contract_date
 * @property Carbon|null $start_date
 * @property Carbon|null $end_date
 * @property bool $has_theory
 * @property bool $has_driving
 * @property bool $has_lms
 * @property int|null $required_driving_lessons
 * @property int|null $required_theory_lessons
 * @property float $total_amount
 * @property float $discount_amount
 * @property float $final_amount
 * @property float $paid_amount
 * @property float $debt_amount
 * @property float $overpaid_amount
 * @property string $status
 * @property string $payment_status
 * @property-read float $payment_percentage
 * @property-read string $payment_badge_color
 * @property-read Student|null $student
 * @property-read ContractType|null $contractType
 * @property-read Group|null $group
 * @property-read User|null $createdBy
 */
class Contract extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'student_id',
        'contract_type_id',
        'group_id',
        'created_by_user_id',
        'contract_number',
        'contract_date',
        'start_date',
        'end_date',
        'has_theory',
        'has_driving',
        'has_lms',
        'required_driving_lessons',
        'required_theory_lessons',
        'total_amount',
        'discount_amount',
        'final_amount',
        'paid_amount',
        'debt_amount',
        'overpaid_amount',
        'status',
        'payment_status',
        'terms',
        'file_url',
    ];

    protected $casts = [
        'contract_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'has_theory' => 'boolean',
        'has_driving' => 'boolean',
        'has_lms' => 'boolean',
        'required_driving_lessons' => 'integer',
        'required_theory_lessons' => 'integer',
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'debt_amount' => 'decimal:2',
        'overpaid_amount' => 'decimal:2',
    ];

    protected $appends = [
        'payment_percentage',
        'payment_badge_color',
    ];

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
     * @return BelongsTo<ContractType, $this>
     */
    public function contractType(): BelongsTo
    {
        return $this->belongsTo(ContractType::class);
    }

    /**
     * @return BelongsTo<Group, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function drivings(): HasMany
    {
        return $this->hasMany(Driving::class);
    }

    public function certificate(): HasOne
    {
        return $this->hasOne(Certificate::class);
    }

    /**
     * Update paid, debt and overpaid amounts based on payments.
     */
    public function recalculateFinances(): void
    {
        $paid = (float) $this->payments()->sum('amount');
        $final = (float) $this->final_amount;

        $debt = max(0, $final - $paid);
        $overpaid = max(0, $paid - $final);

        $paymentStatus = 'unpaid';
        if ($paid >= $final) {
            $paymentStatus = 'paid';
        } elseif ($paid > 0) {
            $paymentStatus = 'partial';
        }

        $this->update([
            'paid_amount' => $paid,
            'debt_amount' => $debt,
            'overpaid_amount' => $overpaid,
            'payment_status' => $paymentStatus,
        ]);
    }

    /**
     * Get calculated payment percentage
     */
    public function getPaymentPercentageAttribute(): float
    {
        $final = (float) $this->final_amount;
        if ($final <= 0) {
            return 100.0;
        }

        return round(((float) $this->paid_amount / $final) * 100, 1);
    }

    /**
     * Get payment status badge color name
     * 0% = white, <50% = red, 50-74.9% = yellow, 75%+ = green
     */
    public function getPaymentBadgeColorAttribute(): string
    {
        $pct = $this->payment_percentage;
        if ($pct <= 0) {
            return 'white';
        }
        if ($pct < 50) {
            return 'red';
        }
        if ($pct < 75) {
            return 'yellow';
        }

        return 'green';
    }

    /**
     * Check if student can attend theory classes (min theory payment met)
     */
    public function canAccessTheory(): bool
    {
        if (! $this->has_theory) {
            return false;
        }

        $minPercent = (float) ($this->contractType ? $this->contractType->min_theory_payment_percent : 30.0);

        return $this->payment_percentage >= $minPercent;
    }

    /**
     * Check if student can attend driving classes (75% min payment met)
     */
    public function canAccessDriving(): bool
    {
        if (! $this->has_driving) {
            return false;
        }

        return $this->payment_percentage >= 75.0;
    }
}
