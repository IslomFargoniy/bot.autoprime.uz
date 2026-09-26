<?php

namespace App\Models;

use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;

/**
 * @property int $id
 * @property int|null $branch_id
 * @property int|null $group_id
 * @property int|null $registered_by_user_id
 * @property string $full_name
 * @property string $phone
 * @property string|null $passport_series
 * @property string|null $passport_number
 * @property string|null $pinfl
 * @property string|null $pinfl_hash
 * @property Carbon|null $birth_date
 * @property string|null $address
 * @property string|null $photo_url
 * @property string|null $passport_photo_url
 * @property string|null $medical_certificate_photo_url
 * @property Carbon|null $medical_certificate_date
 * @property string|null $telegram_id
 * @property int|null $telegram_chat_id
 * @property string $status
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Group|null $group
 * @property-read Contract|null $activeContract
 * @property-read User|null $registeredBy
 */
class Student extends Model
{
    /** @use HasFactory<StudentFactory> */
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'group_id',
        'registered_by_user_id',
        'full_name',
        'phone',
        'passport_series',
        'passport_number',
        'pinfl',
        'pinfl_hash',
        'birth_date',
        'address',
        'photo_url',
        'passport_photo_url',
        'medical_certificate_photo_url',
        'medical_certificate_date',
        'telegram_id',
        'telegram_chat_id',
        'status',
        'is_active',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'medical_certificate_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function setPassportSeriesAttribute(?string $value): void
    {
        $this->attributes['passport_series'] = ! empty($value) ? Crypt::encryptString($value) : null;
    }

    public function getPassportSeriesAttribute(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }
        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    public function setPassportNumberAttribute(?string $value): void
    {
        $this->attributes['passport_number'] = ! empty($value) ? Crypt::encryptString($value) : null;
    }

    public function getPassportNumberAttribute(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }
        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    /**
     * Mutator to automatically calculate blind index HMAC hash on PINFL
     */
    public function setPinflAttribute(?string $value): void
    {
        if (! empty($value)) {
            $this->attributes['pinfl'] = Crypt::encryptString($value);
            $this->attributes['pinfl_hash'] = hash_hmac('sha256', $value, (string) config('app.key'));
        } else {
            $this->attributes['pinfl'] = null;
            $this->attributes['pinfl_hash'] = null;
        }
    }

    public function getPinflAttribute(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }
        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by_user_id');
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    /**
     * @return HasOne<Contract, $this>
     */
    public function activeContract(): HasOne
    {
        return $this->hasOne(Contract::class)->where('status', 'active')->latestOfMany();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function financialHistories(): MorphMany
    {
        return $this->morphMany(FinancialHistory::class, 'entity')->orderBy('transacted_at', 'desc')->orderBy('id', 'desc');
    }

    public function drivings(): HasMany
    {
        return $this->hasMany(Driving::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * @return HasMany<Attempt, $this>
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(Attempt::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }
}
