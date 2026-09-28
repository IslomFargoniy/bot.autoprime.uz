<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use App\Services\BranchSessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $branches = [];
        if ($user = $request->user()) {
            if ($user->relationLoaded('branch') === false && $user->branch_id) {
                $user->load('branch');
            }
            if (Schema::hasTable('branches')) {
                $branches = Branch::where('status', 'active')
                    ->select(['id', 'name', 'code'])
                    ->orderBy('name')
                    ->get();
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'permissions' => $user?->isSuperAdmin()
                    ? config('roles.permissions')
                    : ($user?->getAllPermissions()->pluck('name')->values()->all() ?? []),
                'is_super_admin' => (bool) $user?->isSuperAdmin(),
                'home_url' => $user?->homeUrl(),
            ],
            'branches' => $branches,
            'filters' => array_merge([
                'branch_id' => BranchSessionService::getActiveBranchId($request),
            ], $request->only(['search', 'from', 'to'])),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
