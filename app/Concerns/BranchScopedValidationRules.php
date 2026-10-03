<?php

namespace App\Concerns;

use App\Models\Group;
use App\Models\User;
use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\ValidationException;

trait BranchScopedValidationRules
{
    /**
     * An `exists` rule that, for branch-restricted users, only accepts records
     * of their own branch (or shared records without a branch).
     */
    protected function existsInUserBranch(Request $request, string $table, string $column = 'id'): Exists
    {
        $rule = Rule::exists($table, $column);
        $user = $request->user();

        if ($user?->isBranchRestricted()) {
            $rule->where(fn (Builder $query) => $query
                ->where('branch_id', $user->branch_id)
                ->orWhereNull('branch_id'));
        }

        return $rule;
    }

    /**
     * Refuse to put one more student into a group that is already full. Only active students
     * take a seat: graduates and students who dropped out have left the group.
     *
     * @throws ValidationException
     */
    protected function ensureGroupHasRoom(int|string|null $groupId): void
    {
        $group = $groupId ? Group::withCount(['students' => fn ($students) => $students->where('status', 'active')])->find($groupId) : null;

        if ($group && $group->students_count >= $group->max_students) {
            throw ValidationException::withMessages([
                'group_id' => "Guruh to'lgan ({$group->students_count}/{$group->max_students}).",
            ]);
        }
    }

    /**
     * Like existsInUserBranch() for groups, but only accepts active groups
     * (plus the group the record already belongs to, so unrelated edits still save).
     */
    protected function activeGroupInUserBranch(Request $request, ?int $keepGroupId = null): Exists
    {
        $rule = Rule::exists('groups', 'id');
        $user = $request->user();

        $rule->where(function (Builder $query) use ($keepGroupId, $user): void {
            $query->where(function (Builder $active) use ($keepGroupId): void {
                $active->where('is_active', true)->when($keepGroupId, fn (Builder $q) => $q->orWhere('id', $keepGroupId));
            });

            if ($user?->isBranchRestricted()) {
                $query->where(fn (Builder $branch) => $branch
                    ->where('branch_id', $user->branch_id)
                    ->orWhereNull('branch_id'));
            }
        });

        return $rule;
    }

    /**
     * An `exists` rule for a cash register that money is moved out of or paid
     * into by the actor. Switched-off registers are refused. Unlike other records, the
     * central (branch-less) registers belong to the superadmin, so branch-restricted
     * users get their own branch only.
     */
    protected function cashRegisterInUserBranch(Request $request): Exists
    {
        $rule = Rule::exists('cash_registers', 'id')->where('is_active', true);
        $user = $request->user();

        if ($user?->isBranchRestricted()) {
            $rule->where('branch_id', $user->branch_id);
        }

        return $rule;
    }

    /**
     * A rule accepting only a user that holds the given capability permission
     * (drivings.conduct / lessons.teach), whether through the role or granted.
     *
     * @return Closure(string, mixed, Closure(string): void): void
     */
    protected function userWithCapability(string $permission, string $message): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($permission, $message): void {
            if ($value && ! User::find($value)?->checkPermissionTo($permission)) {
                $fail($message);
            }
        };
    }
}
