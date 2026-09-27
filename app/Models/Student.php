<?php

namespace App\Models;

use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Builder;
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
        'current_desktop_session_id',
        'current_desktop_device_uuid',
        'desktop_auth_token',
        'desktop_token_expires_at',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'medical_certificate_date' => 'date',
        'is_active' => 'boolean',
        'desktop_token_expires_at' => 'datetime',
    ];

    /**
     * Desktop session credentials are only ever compared on the server.
     *
     * @var list<string>
     */
    protected $hidden = [
        'current_desktop_session_id',
        'current_desktop_device_uuid',
        'desktop_auth_token',
        'desktop_token_expires_at',
    ];

    /**
     * Students of a branch: assigned directly or through a group of that branch.
     * Every list and counter must use this so the numbers agree.
     *
     * @param  Builder<Student>  $query
     */
    public function scopeInBranch(Builder $query, int|string $branchId): void
    {
        $query->where(fn (Builder $q) => $q
            ->where('branch_id', $branchId)
            ->orWhereHas('group', fn (Builder $group) => $group->where('branch_id', $branchId)));
    }

    /**
     * Canonical phone format (+998XXXXXXXXX) so manual entry, imports and lead
     * conversion all match the same student instead of creating duplicates.
     */
    public static function normalizePhone(?string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $phone);
        if ($digits === '') {
            return null;
        }

        if (strlen($digits) === 9) {
            $digits = '998'.$digits;
        }

        return '+'.$digits;
    }

    public function setPhoneAttribute(?string $value): void
    {
        $this->attributes['phone'] = self::normalizePhone($value);
    }

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

    /**
     * @return BelongsTo<Branch, $this>
     */
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

    /**
     * Whether deleting this student would cascade-delete contracts, payments,
     * certificates or lesson history.
     */
    public function hasHistory(): bool
    {
        return $this->contracts()->exists()
            || $this->payments()->exists()
            || $this->certificates()->exists()
            || $this->attendances()->exists()
            || $this->drivings()->exists();
    }

    /**
     * Whether the student passed the server-graded internal mock exam, which is
     * the only attempt type that counts toward certificate eligibility.
     */
    public function hasPassedMockExam(): bool
    {
        return $this->attempts()
            ->where('attempt_type', 'random_mock')
            ->where('is_passed', true)
            ->whereNotNull('finished_at')
            ->exists();
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }
}
