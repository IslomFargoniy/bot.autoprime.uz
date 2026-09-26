<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

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
     * Atomically deposit funds into this cash register and record ledger transaction.
     */
    public function deposit(
        float $amount,
        string $category = 'payment',
        ?string $description = null,
        $reference = null,
        ?int $userId = null
    ): CashTransaction {
        $amount = abs($amount);
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Kirim summasi 0 dan katta bo'lishi kerak.");
        }

        return DB::transaction(function () use ($amount, $category, $description, $reference, $userId) {
            $locked = self::where('id', $this->id)->lockForUpdate()->firstOrFail();

            $balBefore = (float) $locked->balance;
            $balAfter = $balBefore + $amount;

            $locked->update(['balance' => $balAfter]);
            $this->balance = $balAfter;

            return $locked->recordTransaction(
                type: 'in',
                category: $category,
                amount: $amount,
                balanceBefore: $balBefore,
                balanceAfter: $balAfter,
                description: $description,
                reference: $reference,
                userId: $userId ?? auth()->id()
            );
        });
    }

    /**
     * Atomically withdraw funds from this cash register and record ledger transaction.
     */
    public function withdraw(
        float $amount,
        string $category = 'expense',
        ?string $description = null,
        $reference = null,
        ?int $userId = null
    ): CashTransaction {
        $amount = abs($amount);
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Chiqim summasi 0 dan katta bo'lishi kerak.");
        }

        return DB::transaction(function () use ($amount, $category, $description, $reference, $userId) {
            $locked = self::where('id', $this->id)->lockForUpdate()->firstOrFail();

            if ((float) $locked->balance < $amount) {
                throw new \InvalidArgumentException(
                    "Tanlangan '{$locked->name}' kassasida yetarli mablag' mavjud emas (Mavjud: " . number_format((float) $locked->balance, 0, '', ' ') . " UZS, So'ralgan: " . number_format($amount, 0, '', ' ') . " UZS)."
                );
            }

            $balBefore = (float) $locked->balance;
            $balAfter = $balBefore - $amount;

            $locked->update(['balance' => $balAfter]);
            $this->balance = $balAfter;

            return $locked->recordTransaction(
                type: 'out',
                category: $category,
                amount: $amount,
                balanceBefore: $balBefore,
                balanceAfter: $balAfter,
                description: $description,
                reference: $reference,
                userId: $userId ?? auth()->id()
            );
        });
    }

    /**
     * Atomically transfer funds from this cash register to a target cash register.
     *
     * @return array{out: CashTransaction, in: CashTransaction}
     */
    public function transferTo(
        CashRegister $targetRegister,
        float $amount,
        string $category = 'transfer',
        ?string $description = null,
        $reference = null,
        ?int $userId = null
    ): array {
        $amount = abs($amount);
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Transfer summasi 0 dan katta bo'lishi kerak.");
        }

        if ($this->id === $targetRegister->id) {
            throw new \InvalidArgumentException("Pulni bitta kassaning o'ziga o'tkazib bo'lmaydi.");
        }

        return DB::transaction(function () use ($targetRegister, $amount, $category, $description, $reference, $userId) {
            // Prevent deadlock by locking in consistent ID order
            $firstId = min($this->id, $targetRegister->id);
            $secondId = max($this->id, $targetRegister->id);

            $firstLocked = self::where('id', $firstId)->lockForUpdate()->firstOrFail();
            $secondLocked = self::where('id', $secondId)->lockForUpdate()->firstOrFail();

            $fromLocked = $this->id === $firstId ? $firstLocked : $secondLocked;
            $toLocked = $targetRegister->id === $firstId ? $firstLocked : $secondLocked;

            if ((float) $fromLocked->balance < $amount) {
                throw new \InvalidArgumentException(
                    "Chiqim kassasida ({$fromLocked->name}) yetarli mablag' mavjud emas (Mavjud: " . number_format((float) $fromLocked->balance, 0, '', ' ') . " UZS)."
                );
            }

            $fromBalBefore = (float) $fromLocked->balance;
            $fromBalAfter = $fromBalBefore - $amount;
            $toBalBefore = (float) $toLocked->balance;
            $toBalAfter = $toBalBefore + $amount;

            $fromLocked->update(['balance' => $fromBalAfter]);
            $toLocked->update(['balance' => $toBalAfter]);

            $this->balance = $fromBalAfter;
            $targetRegister->balance = $toBalAfter;

            $outCategory = $category === 'sweep' ? 'sweep_out' : 'transfer_out';
            $inCategory = $category === 'sweep' ? 'sweep_in' : 'transfer_in';

            $outDesc = $description ?? ($category === 'sweep'
                ? "Kassani bo'shatish: {$toLocked->name} ga o'tkazildi"
                : "Transfer chiqim: {$toLocked->name} ga");

            $inDesc = $description ?? ($category === 'sweep'
                ? "Kassa bo'shatishdan qabul: {$fromLocked->name} dan"
                : "Transfer kirim: {$fromLocked->name} dan");

            $txOut = $fromLocked->recordTransaction(
                type: 'out',
                category: $outCategory,
                amount: $amount,
                balanceBefore: $fromBalBefore,
                balanceAfter: $fromBalAfter,
                description: $outDesc,
                reference: $reference,
                userId: $userId ?? auth()->id()
            );

            $txIn = $toLocked->recordTransaction(
                type: 'in',
                category: $inCategory,
                amount: $amount,
                balanceBefore: $toBalBefore,
                balanceAfter: $toBalAfter,
                description: $inDesc,
                reference: $reference,
                userId: $userId ?? auth()->id()
            );

            return [
                'out' => $txOut,
                'in' => $txIn,
            ];
        });
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

