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
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Models\Role;
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
 * @property float $salary_balance
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
    'salary_balance',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected $appends = ['photo_url'];

    /**
     * Mirrors the database default so new models know their role before refresh.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'role' => 'instructor',
    ];

    /**
     * Spatie roles are the source of truth for authorization. The `role` column
     * is kept as the user's single primary-role label, and any change to it is
     * synced to the Spatie role assignment here so the two can never drift.
     */
    protected static function booted(): void
    {
        static::saved(function (User $user): void {
            if (! $user->wasRecentlyCreated && ! $user->wasChanged('role')) {
                return;
            }

            $user->syncRoles($user->role ? [Role::findOrCreate($user->role, 'web')] : []);
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Whether the account may sign in (deactivated staff are locked out).
     */
    public function isActive(): bool
    {
        return $this->status !== 'inactive';
    }

    /**
     * Whether the account may sign in: it must be active and, unless it is a
     * superadmin, assigned to a branch. A branchless staff account would
     * otherwise see every branch, so it stays locked out until assigned.
     */
    public function canSignIn(): bool
    {
        return $this->isActive() && ($this->branch_id !== null || $this->isSuperAdmin());
    }

    /**
     * Whether deleting this user would cascade-delete payroll or lesson history.
     * Such staff should be deactivated (status = inactive) instead.
     */
    public function hasWorkHistory(): bool
    {
        return $this->salaries()->exists()
            || $this->salaryPayments()->exists()
            || $this->drivings()->exists()
            || $this->lessonSessions()->exists();
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('superadmin');
    }

    public function isInstructor(): bool
    {
        return $this->hasRole('instructor');
    }

    /**
     * Whether the user conducts driving lessons (instructor role or the
     * capability granted as an extra permission). Checked on the user's own
     * permissions so the superadmin gate bypass does not turn admins into instructors.
     */
    public function conductsDrivings(): bool
    {
        return $this->checkPermissionTo('drivings.conduct');
    }

    /**
     * Whether the user teaches theory lessons (teacher role or granted capability).
     */
    public function teachesLessons(): bool
    {
        return $this->checkPermissionTo('lessons.teach');
    }

    /**
     * Instructors and teachers only see and act on their own groups, students
     * and lessons, even when granted extra permissions.
     */
    public function worksOnOwnRecordsOnly(): bool
    {
        return $this->hasAnyRole(['instructor', 'teacher']);
    }

    /**
     * Whether the group is taught or driven by this user.
     */
    public function ownsGroup(?Group $group): bool
    {
        return $group !== null && ($group->teacher_id === $this->id || $group->instructor_id === $this->id);
    }

    /**
     * Whether the user may see the student: always, unless restricted to own
     * records, then only students of own groups or own driving lessons.
     */
    public function canSeeStudent(Student $student): bool
    {
        if (! $this->worksOnOwnRecordsOnly()) {
            return true;
        }

        return $this->ownsGroup($student->group)
            || $student->drivings()->where('instructor_id', $this->id)->exists();
    }

    /**
     * Admins and superadmins are not on the payroll.
     */
    public function isSalaried(): bool
    {
        return ! in_array($this->role, config('roles.unsalaried_roles'), true);
    }

    /**
     * The first admin page the user may open, used after login and for the logo.
     */
    public function homeUrl(): string
    {
        $pages = [
            'dashboard.view' => '/admin/dashboard',
            'finance.view' => '/admin/finance',
            'attendance.view' => '/admin/attendance',
            'drivings.view' => '/admin/drivings',
            'students.view' => '/admin/students',
            'crm.view' => '/admin/leads',
            'contracts.view' => '/admin/contracts',
            'salaries.view' => '/admin/salaries',
            'lms.view' => '/admin/courses',
        ];

        foreach ($pages as $permission => $url) {
            if ($this->can($permission)) {
                return $url;
            }
        }

        return '/profile';
    }

    /**
     * Staff other than superadmins only ever work within their own branch
     * (a branch is mandatory for them, see canSignIn()).
     */
    public function isBranchRestricted(): bool
    {
        return ! $this->isSuperAdmin();
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

    public function financialHistories(): MorphMany
    {
        return $this->morphMany(FinancialHistory::class, 'entity')->orderBy('transacted_at', 'desc')->orderBy('id', 'desc');
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
