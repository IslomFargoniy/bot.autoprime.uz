<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'from_cash_register_id',
        'to_cash_register_id',
        'cash_shift_id',
        'amount',
        'sent_by_user_id',
        'approved_by_user_id',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function getTransferredByUserIdAttribute(): ?int
    {
        return $this->sent_by_user_id;
    }

    public function setTransferredByUserIdAttribute(?int $value): void
    {
        $this->attributes['sent_by_user_id'] = $value;
    }

    public function fromCashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class, 'from_cash_register_id');
    }

    public function toCashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class, 'to_cash_register_id');
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(CashShift::class, 'cash_shift_id');
    }

    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by_user_id');
    }

    public function transferredBy(): BelongsTo
    {
        return $this->sentBy();
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}
