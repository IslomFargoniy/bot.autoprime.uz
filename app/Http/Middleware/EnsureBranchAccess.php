<?php

namespace App\Http\Middleware;

use App\Models\CashTransfer;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBranchAccess
{
    /**
     * Reject requests where a branch-restricted user targets a route-bound
     * record that belongs to a different branch. Records without a branch
     * (shared/global data) remain accessible. A submitted branch_id is pinned
     * to the user's own branch, and staff without a branch are locked out.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Branch scoping treats "no branch" as "all branches", so staff without a
        // branch would see every branch. Only superadmins may work unassigned.
        if ($user && ! $user->isSuperAdmin() && $user->branch_id === null) {
            abort(403, 'Sizga filial biriktirilmagan. Iltimos, Superadmin bilan bog\'laning.');
        }

        if ($user && $user->isBranchRestricted()) {
            foreach ($request->route()?->parameters() ?? [] as $parameter) {
                if (! $parameter instanceof Model) {
                    continue;
                }

                $recordBranchId = $this->branchIdOf($parameter);

                if ($recordBranchId !== null && $recordBranchId !== (int) $user->branch_id) {
                    abort(403, 'Bu yozuv boshqa filialga tegishli.');
                }
            }

            // Branch-restricted users can never create or move records into another branch.
            if (! $request->isMethodSafe() && $request->filled('branch_id')) {
                $request->merge(['branch_id' => $user->branch_id]);
            }
        }

        return $next($request);
    }

    private function branchIdOf(Model $record): ?int
    {
        if ($record instanceof CashTransfer) {
            $branchId = $record->fromCashRegister?->branch_id;

            return $branchId !== null ? (int) $branchId : null;
        }

        $branchId = $record->getAttribute('branch_id');

        return $branchId !== null ? (int) $branchId : null;
    }
}
