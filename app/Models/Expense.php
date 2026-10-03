<?php

namespace App\Models;

use App\Services\DocumentNumberService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'receipt_number',
        'branch_id',
        'cash_register_id',
        'expense_category_id',
        'user_id',
        'amount',
        'recipient',
        'description',
        'receipt_photo_url',
        'spent_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'spent_at' => 'datetime',
    ];

    protected $appends = ['expense_date'];

    protected static function booted(): void
    {
        // Every cash-out gets its own document number, whichever flow creates it.
        static::creating(function (Expense $expense): void {
            if (empty($expense->receipt_number)) {
                $expense->receipt_number = DocumentNumberService::nextExpenseNumber();
            }
        });
    }

    public function getExpenseDateAttribute(): ?string
    {
        return $this->spent_at?->toDateString();
    }

    public function setExpenseDateAttribute($value): void
    {
        $this->attributes['spent_at'] = $value;
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    /**
     * @return BelongsTo<ExpenseCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
