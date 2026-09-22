<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $branch_id
 * @property int $group_id
 * @property int $teacher_id
 * @property string $topic
 * @property string|null $room_number
 * @property Carbon|null $started_at
 * @property Carbon|null $ended_at
 * @property string $status
 * @property string $qr_secret_salt
 * @property-read Branch|null $branch
 * @property-read Group|null $group
 * @property-read User|null $teacher
 * @property-read Collection<int, Attendance> $attendances
 */
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

    /**
     * @return BelongsTo<Branch, $this>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * @return BelongsTo<Group, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Generate full dynamic QR token string (e.g. SESSION:1:hash)
     */
    public function generateQrToken(int $timeWindowSeconds = 20): string
    {
        $hash = $this->generateDynamicToken($timeWindowSeconds);

        return "SESSION:{$this->id}:{$hash}";
    }

    /**
     * Validate scanned QR token string and return LessonSession instance if valid.
     */
    public static function validateQrToken(string $qrToken, int $timeWindowSeconds = 20): ?self
    {
        if (! str_starts_with($qrToken, 'SESSION:')) {
            return null;
        }

        $parts = explode(':', $qrToken);
        if (count($parts) !== 3) {
            return null;
        }

        $sessionId = (int) $parts[1];
        $hash = $parts[2];

        $session = self::find($sessionId);
        if (! $session) {
            return null;
        }

        if (! $session->isValidDynamicToken($hash, $timeWindowSeconds)) {
            return null;
        }

        return $session;
    }

    /**
     * Generate dynamic QR token valid for a specific 20-second time window.
     */
    public function generateDynamicToken(int $timeWindowSeconds = 20): string
    {
        $step = (int) floor(time() / $timeWindowSeconds);
        $salt = (string) ($this->qr_secret_salt ?: config('app.key'));

        return hash_hmac('sha256', "{$this->id}:{$step}", $salt);
    }

    /**
     * Validate scanned token within current or immediately previous window (+- 20s leeway).
     */
    public function isValidDynamicToken(string $token, int $timeWindowSeconds = 20): bool
    {
        $currentStep = (int) floor(time() / $timeWindowSeconds);
        $salt = (string) ($this->qr_secret_salt ?: config('app.key'));

        for ($s = $currentStep - 1; $s <= $currentStep + 1; $s++) {
            $expected = hash_hmac('sha256', "{$this->id}:{$s}", $salt);
            if (hash_equals($expected, $token)) {
                return true;
            }
        }

        return false;
    }
}
