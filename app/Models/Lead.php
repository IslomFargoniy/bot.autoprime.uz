<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'passport_series' => 'encrypted',
        'passport_number' => 'encrypted',
        'pinfl' => 'encrypted',
        'birth_date' => 'date',
    ];

    public function setPinflAttribute(?string $value): void
    {
        $this->attributes['pinfl'] = $value;
        if (! empty($value)) {
            $this->attributes['pinfl_hash'] = hash_hmac('sha256', $value, (string) config('app.key'));
        } else {
            $this->attributes['pinfl_hash'] = null;
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

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }
}
