<?php

namespace App\Services;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSynchronizer
{
    /**
     * Create every permission and role from config/roles.php, sync each
     * role's permissions to exactly what the config grants it and drop
     * permissions the config no longer defines.
     */
    public static function sync(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (config('roles.permissions') as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        Permission::where('guard_name', 'web')->whereNotIn('name', config('roles.permissions'))->delete();

        foreach (config('roles.roles') as $roleName => $permissions) {
            Role::findOrCreate($roleName, 'web')->syncPermissions($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
