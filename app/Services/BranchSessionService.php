<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BranchSessionService
{
    /**
     * Get the active branch ID for the current request,
     * maintaining persistent state across sessions and navigations.
     */
    public static function getActiveBranchId(?Request $request = null): ?string
    {
        $user = $request ? $request->user() : auth()->user();
        if (! $user) {
            return null;
        }

        // Every non-superadmin staff member is strictly restricted to their assigned branch
        if ($user->isBranchRestricted()) {
            return (string) $user->branch_id;
        }

        // Read from session first, fallback to Cache for persistent state
        $val = session('selected_branch_id') ?? Cache::get("user:{$user->id}:selected_branch_id");

        if ($val === 'all' || empty($val)) {
            return null;
        }

        return (string) $val;
    }

    /**
     * Set or clear the active branch for a user.
     */
    public static function setActiveBranchId($user, ?string $branchId): void
    {
        if (! $user) {
            return;
        }

        if ($branchId !== null && $branchId !== '' && $branchId !== 'all') {
            session(['selected_branch_id' => (string) $branchId]);
            Cache::put("user:{$user->id}:selected_branch_id", (string) $branchId, 86400 * 30);
        } else {
            session(['selected_branch_id' => 'all']);
            Cache::put("user:{$user->id}:selected_branch_id", 'all', 86400 * 30);
        }

        session()->save();
    }
}
