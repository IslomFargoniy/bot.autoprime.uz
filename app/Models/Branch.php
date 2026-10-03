<?php

namespace App\Models;

use App\Support\Phone;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'code', 'phone', 'address', 'status'])]
class Branch extends Model
{
    use HasFactory;

    public function setPhoneAttribute(?string $value): void
    {
        $this->attributes['phone'] = Phone::normalize($value);
    }

    /**
     * @return HasMany<CashRegister, $this>
     */
    public function cashRegisters(): HasMany
    {
        return $this->hasMany(CashRegister::class);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * @return HasMany<Group, $this>
     */
    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }

    /**
     * @return HasMany<Student, $this>
     */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    /**
     * @return HasMany<Autodrome, $this>
     */
    public function autodromes(): HasMany
    {
        return $this->hasMany(Autodrome::class);
    }

    /**
     * @return HasMany<Driving, $this>
     */
    public function drivings(): HasMany
    {
        return $this->hasMany(Driving::class);
    }

    /**
     * Whether the branch still owns people, lessons or money records; deleting it
     * would cascade-delete them, so such branches must be deactivated instead.
     * Registers only count when they hold money or have a history: the empty ones
     * created automatically go away together with the branch.
     */
    public function hasDependentRecords(): bool
    {
        return $this->users()->exists()
            || $this->students()->exists()
            || $this->groups()->exists()
            || Contract::where('branch_id', $this->id)->exists()
            || Payment::where('branch_id', $this->id)->exists()
            || $this->cashRegisters()->get()->contains(
                fn (CashRegister $register) => (float) $register->balance !== 0.0 || $register->hasHistory()
            );
    }
}
