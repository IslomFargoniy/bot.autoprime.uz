<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $branch_id
 * @property int $cash_register_type_id
 * @property string $name
 * @property float $balance
 * @property bool $is_active
 * @property-read Branch|null $branch
 * @property-read CashRegisterType|null $type
 */
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

    /**
     * @return BelongsTo<CashRegisterType, $this>
     */
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

    public function openShift(): HasOne
    {
        return $this->hasOne(CashShift::class)->where('status', 'open')->latestOfMany();
    }

    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(CashTransfer::class, 'from_cash_register_id');
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(CashTransfer::class, 'to_cash_register_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(CashTransaction::class)->orderBy('transacted_at', 'desc');
    }

    /**
     * Get or create central/superadmin register for a specific CashRegisterType
     */
    public static function getSuperadminRegisterForType(int $typeId): self
    {
        $reg = self::whereNull('branch_id')
            ->where('cash_register_type_id', $typeId)
            ->first();

        if ($reg) {
            return $reg;
        }

        $type = CashRegisterType::find($typeId);
        $typeName = $type ? $type->name : 'Kassa';

        return self::create([
            'branch_id' => null,
            'cash_register_type_id' => $typeId,
            'name' => "Bosh {$typeName} (Superadmin)",
            'balance' => 0,
            'is_active' => true,
        ]);
    }

    /**
     * Helper to log an immutable ledger transaction with running balance
     */
    public function recordTransaction(
        string $type,
        string $category,
        float $amount,
        float $balanceBefore,
        float $balanceAfter,
        ?string $description = null,
        $reference = null,
        ?int $userId = null
    ): CashTransaction {
        return CashTransaction::create([
            'cash_register_id' => $this->id,
            'type' => $type,
            'category' => $category,
            'amount' => abs($amount),
            'balance_before' => $balanceBefore,
            'balance_after' => $balanceAfter,
            'description' => $description,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference ? $reference->id : null,
            'user_id' => $userId,
            'transacted_at' => now(),
        ]);
    }
}

