<?php

namespace App\Concerns;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

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
}
