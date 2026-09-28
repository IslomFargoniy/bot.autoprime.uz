<?php

use App\Services\RolePermissionSynchronizer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Create every role and permission defined in config/roles.php. Rerun
     * RolesAndPermissionsSeeder (or this sync) whenever that config changes.
     */
    public function up(): void
    {
        RolePermissionSynchronizer::sync();
    }

    public function down(): void
    {
        // Roles and permissions are dropped together with the permission tables.
    }
};
