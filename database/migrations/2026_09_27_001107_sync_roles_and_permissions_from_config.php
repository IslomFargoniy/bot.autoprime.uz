<?php

use App\Models\User;
use App\Services\RolePermissionSynchronizer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Make Spatie roles the source of truth for authorization:
     * create roles/permissions from config, fold the duplicate "super_admin"
     * role into "superadmin", keep the legacy "user #1 is superadmin" rule by
     * giving that user the superadmin role, and assign every user the Spatie
     * role matching their `role` column.
     */
    public function up(): void
    {
        RolePermissionSynchronizer::sync();

        $superAdminRole = Role::findByName('superadmin', 'web');

        $legacyRole = Role::where('name', 'super_admin')->where('guard_name', 'web')->first();
        if ($legacyRole) {
            DB::table('users')->whereIn('id', $legacyRole->users()->pluck('id'))->update(['role' => 'superadmin']);
            $legacyRole->delete();
        }

        DB::table('users')->where('id', 1)->update(['role' => $superAdminRole->name]);

        User::query()->each(function (User $user) {
            $user->syncRoles([Role::findOrCreate($user->role ?: 'instructor', 'web')]);
        });
    }

    public function down(): void
    {
        // Role assignments are derived from the `role` column, which is untouched
        // apart from user #1; nothing needs to be reverted.
    }
};
