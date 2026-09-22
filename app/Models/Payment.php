<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $branch_id
 * @property int $contract_id
 * @property int $student_id
 * @property int $cash_register_id
 * @property int|null $received_by_user_id
 * @property float $amount
 * @property string $payment_type
 * @property string $payment_method
 * @property string $receipt_number
 * @property string|null $comment
 * @property Carbon|null $paid_at
 * @property-read Branch|null $branch
 * @property-read Contract|null $contract
 * @property-read Student|null $student
 * @property-read CashRegister|null $cashRegister
 * @property-read User|null $receivedBy
 */
class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'contract_id',
        'student_id',
        'cash_register_id',
        'received_by_user_id',
        'amount',
        'payment_type',
        'payment_method',
        'receipt_number',
        'comment',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Branch, $this>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * @return BelongsTo<Contract, $this>
     */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<CashRegister, $this>
     */
    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }
}
