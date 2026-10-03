<?php

use App\Services\RolePermissionSynchronizer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * `students.create` is gone: students now come from a lead or a contract only, so the
     * permission is dropped from every role.
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
