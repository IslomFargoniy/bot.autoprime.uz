<?php

use App\Services\RolePermissionSynchronizer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Re-sync roles after config/roles.php changed (admins no longer hold
     * branches.view, the branches page is superadmin only; admins now hold
     * cash_transfers.approve).
     */
    public function up(): void
    {
        RolePermissionSynchronizer::sync();
    }

    public function down(): void
    {
        // Permissions are always derived from config/roles.php.
    }
};
