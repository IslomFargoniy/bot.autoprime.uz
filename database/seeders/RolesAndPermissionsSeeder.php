<?php

namespace Database\Seeders;

use App\Services\RolePermissionSynchronizer;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Roles and permissions are defined in config/roles.php.
     */
    public function run(): void
    {
        RolePermissionSynchronizer::sync();
    }
}
