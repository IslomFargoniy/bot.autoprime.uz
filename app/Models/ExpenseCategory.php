<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    use HasFactory;

    public const VEHICLE_MAINTENANCE = 'vehicle_maintenance';

    public const SALARY = 'salary';

    public const REFUND = 'refund';

    /**
     * Categories the system books by itself, with the name they start out with.
     * They can be renamed but never removed or switched off.
     *
     * @var array<string, string>
     */
    public const SYSTEM_NAMES = [
        self::VEHICLE_MAINTENANCE => "Avtomobil ta'miri va ehtiyot qismlar",
        self::SALARY => 'Xodimlar oylik maoshi',
        self::REFUND => "Talaba to'lovini qaytarish (Refund)",
    ];

    protected $fillable = [
        'branch_id',
        'code',
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Categories shared by every branch plus the ones of the given branch; without a
     * branch (superadmin looking at all of them) every category is visible.
     *
     * @param  Builder<ExpenseCategory>  $query
     * @return Builder<ExpenseCategory>
     */
    public function scopeVisibleInBranch(Builder $query, int|string|null $branchId): Builder
    {
        return $query->when($branchId, fn (Builder $q) => $q->where(
            fn (Builder $branch) => $branch->whereNull('branch_id')->orWhere('branch_id', $branchId)
        ));
    }

    /**
     * The category behind a system code; created with its default name when missing,
     * so a renamed category is still found and never duplicated.
     */
    public static function system(string $code): self
    {
        return self::firstOrCreate(
            ['code' => $code],
            ['name' => self::SYSTEM_NAMES[$code], 'is_active' => true],
        );
    }

    /**
     * Shared (branch-less) categories are the superadmin's to edit; a branch admin
     * edits only the categories of their own branch.
     */
    public function isEditableBy(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $this->branch_id !== null && $this->branch_id === $user->branch_id;
    }

    public function isSystem(): bool
    {
        return $this->code !== null;
    }
}
