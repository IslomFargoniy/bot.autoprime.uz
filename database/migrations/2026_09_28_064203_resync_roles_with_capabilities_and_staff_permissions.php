<?php

use App\Services\RolePermissionSynchronizer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Apply the reworked role defaults from config/roles.php: capability
     * permissions (drivings.conduct, lessons.teach), unused permissions
     * removed and per-role default changes.
     */
    public function up(): void
    {
        RolePermissionSynchronizer::sync();
    }

    public function down(): void
    {
        // Role permissions always mirror config/roles.php; nothing to revert.
    }
};
