<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property string $entity_type
 * @property int $entity_id
 * @property string $type 'credit'|'debit'
 * @property string $category 'tuition_payment'|'refund'|'tuition_charge'|'discount'|'salary_accrual'|'salary_payout'|'bonus'|'kpi'|'fine'|'advance'
 * @property float $amount
 * @property float $balance_before
 * @property float $balance_after
 * @property string|null $payment_method
 * @property string|null $description
 * @property string|null $reference_type
 * @property int|null $reference_id
 * @property int|null $performed_by_user_id
 * @property \Illuminate\Support\Carbon $transacted_at
 * @property-read Model $entity
 * @property-read Model|null $reference
 * @property-read User|null $performedBy
 */
class FinancialHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'entity_type',
        'entity_id',
        'type',
        'category',
        'amount',
        'balance_before',
        'balance_after',
        'payment_method',
        'description',
        'reference_type',
        'reference_id',
        'performed_by_user_id',
        'transacted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transacted_at' => 'datetime',
    ];

    public function entity(): MorphTo
    {
        return $this->morphTo();
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by_user_id');
    }

    /**
     * Record a financial transaction history entry for a student
     */
    public static function recordForStudent(Student $student, array $data): self
    {
        return self::create([
            'entity_type' => Student::class,
            'entity_id' => $student->id,
            'type' => $data['type'] ?? 'credit',
            'category' => $data['category'] ?? 'tuition_payment',
            'amount' => $data['amount'] ?? 0,
            'balance_before' => $data['balance_before'] ?? 0,
            'balance_after' => $data['balance_after'] ?? 0,
            'payment_method' => $data['payment_method'] ?? null,
            'description' => $data['description'] ?? null,
            'reference_type' => isset($data['reference']) ? get_class($data['reference']) : ($data['reference_type'] ?? null),
            'reference_id' => isset($data['reference']) ? $data['reference']->id : ($data['reference_id'] ?? null),
            'performed_by_user_id' => $data['performed_by_user_id'] ?? null,
            'transacted_at' => $data['transacted_at'] ?? now(),
        ]);
    }

    /**
     * Record a financial transaction history entry for an employee/user
     */
    public static function recordForUser(User $user, array $data): self
    {
        return self::create([
            'entity_type' => User::class,
            'entity_id' => $user->id,
            'type' => $data['type'] ?? 'credit',
            'category' => $data['category'] ?? 'salary_accrual',
            'amount' => $data['amount'] ?? 0,
            'balance_before' => $data['balance_before'] ?? 0,
            'balance_after' => $data['balance_after'] ?? 0,
            'payment_method' => $data['payment_method'] ?? null,
            'description' => $data['description'] ?? null,
            'reference_type' => isset($data['reference']) ? get_class($data['reference']) : ($data['reference_type'] ?? null),
            'reference_id' => isset($data['reference']) ? $data['reference']->id : ($data['reference_id'] ?? null),
            'performed_by_user_id' => $data['performed_by_user_id'] ?? null,
            'transacted_at' => $data['transacted_at'] ?? now(),
        ]);
    }
}
