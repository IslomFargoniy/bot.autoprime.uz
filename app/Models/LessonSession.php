<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LessonSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'group_id',
        'teacher_id',
        'topic',
        'room_number',
        'started_at',
        'ended_at',
        'status',
        'qr_secret_salt',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Generate dynamic QR token valid for a specific 20-second time window.
     */
    public function generateDynamicToken(int $timeWindowSeconds = 20): string
    {
        $step = (int) floor(time() / $timeWindowSeconds);

        return hash_hmac('sha256', "{$this->id}:{$step}", $this->qr_secret_salt);
    }

    /**
     * Validate scanned token within current or immediately previous window (+- 20s leeway).
     */
    public function isValidDynamicToken(string $token, int $timeWindowSeconds = 20): bool
    {
        $currentStep = (int) floor(time() / $timeWindowSeconds);
        for ($s = $currentStep - 1; $s <= $currentStep + 1; $s++) {
            $expected = hash_hmac('sha256', "{$this->id}:{$s}", $this->qr_secret_salt);
            if (hash_equals($expected, $token)) {
                return true;
            }
        }

        return false;
    }
}
