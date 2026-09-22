<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegister extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'cash_register_type_id',
        'name',
        'balance',
        'is_active',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(CashRegisterType::class, 'cash_register_type_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(CashShift::class);
    }

    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(CashTransfer::class, 'from_cash_register_id');
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(CashTransfer::class, 'to_cash_register_id');
    }
}
