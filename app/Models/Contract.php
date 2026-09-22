<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function contractType(): BelongsTo
    {
        return $this->belongsTo(ContractType::class);
    }

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
}
