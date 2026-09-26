<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property int $cash_register_id
 * @property string $type 'in'|'out'
 * @property string $category 'payment'|'expense'|'transfer_in'|'transfer_out'|'sweep_in'|'sweep_out'|'refund'|'initial'
 * @property float $amount
 * @property float $balance_before
 * @property float $balance_after
 * @property string|null $description
 * @property int|null $reference_id
 * @property string|null $reference_type
 * @property int|null $user_id
 * @property \Illuminate\Support\Carbon $transacted_at
 * @property-read CashRegister $cashRegister
 * @property-read User|null $user
 */
class CashTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_register_id',
        'type',
        'category',
        'amount',
        'balance_before',
        'balance_after',
        'description',
        'reference_id',
        'reference_type',
        'user_id',
        'transacted_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transacted_at' => 'datetime',
    ];

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
