<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property string $phone
 * @property string|null $telegram_id
 * @property string|null $car_name
 * @property string|null $photo_path
 * @property string $role
 * @property string $status
 * @property float $base_salary
 * @property float $driving_hourly_rate
 * @property float $lesson_rate
 * @property int|null $branch_id
 * @property int|null $groups_count
 * @property-read Branch|null $branch
 */
#[Fillable([
    'branch_id',
    'name',
    'phone',
    'telegram_id',
    'car_name',
    'photo_path',
    'role',
    'status',
    'email',
    'password',
    'base_salary',
    'driving_hourly_rate',
    'lesson_rate',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected $appends = ['photo_url'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (! $this->photo_path) {
            return null;
        }

        return asset('storage/'.$this->photo_path);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'base_salary' => 'decimal:2',
            'driving_hourly_rate' => 'decimal:2',
            'lesson_rate' => 'decimal:2',
        ];
    }

    /**
     * @return HasMany<Group, $this>
     */
    public function groups(): HasMany
    {
        return $this->hasMany(Group::class, 'instructor_id');
    }

    public function taughtGroups(): HasMany
    {
        return $this->hasMany(Group::class, 'teacher_id');
    }

    /**
     * @return HasMany<Driving, $this>
     */
    public function drivings(): HasMany
    {
        return $this->hasMany(Driving::class, 'instructor_id');
    }

    public function salaries(): HasMany
    {
        return $this->hasMany(Salary::class);
    }

    public function salaryPayments(): HasMany
    {
        return $this->hasMany(SalaryPayment::class);
    }

    public function vehicle(): HasOne
    {
        return $this->hasOne(Vehicle::class, 'instructor_id');
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(CashShift::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function lessonSessions(): HasMany
    {
        return $this->hasMany(LessonSession::class, 'teacher_id');
    }
}
