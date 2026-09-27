<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class Lead extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'assigned_user_id',
        'student_id',
        'contract_id',
        'telegram_id',
        'form_token',
        'is_form_completed',
        'full_name',
        'phone',
        'category',
        'preferred_time',
        'passport_series',
        'passport_number',
        'pinfl',
        'pinfl_hash',
        'birth_date',
        'address',
        'photo_url',
        'passport_photo_url',
        'medical_certificate_photo_url',
        'source',
        'stage',
        'notes',
        'lost_reason',
    ];

    protected $casts = [
        'is_form_completed' => 'boolean',
        'birth_date' => 'date',
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

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function convertedStudent(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }
}
