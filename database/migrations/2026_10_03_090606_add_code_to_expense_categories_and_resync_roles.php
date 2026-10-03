<?php

use App\Services\RolePermissionSynchronizer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Categories the system books by itself get a stable `code`, so renaming one in the
     * UI never makes the code create a duplicate. Also grants the new manage permissions.
     */
    private const SYSTEM_CATEGORIES = [
        'vehicle_maintenance' => "Avtomobil ta'miri va ehtiyot qismlar",
        'salary' => 'Xodimlar oylik maoshi',
        'refund' => "Talaba to'lovini qaytarish (Refund)",
    ];

    public function up(): void
    {
        Schema::table('expense_categories', function (Blueprint $table) {
            $table->string('code', 50)->nullable()->unique()->after('branch_id');
        });

        foreach (self::SYSTEM_CATEGORIES as $code => $name) {
            $id = DB::table('expense_categories')->where('name', $name)->orderBy('id')->value('id');

            if ($id) {
                DB::table('expense_categories')->where('id', $id)->update(['code' => $code]);
            }
        }

        RolePermissionSynchronizer::sync();
    }

    public function down(): void
    {
        Schema::table('expense_categories', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn('code');
        });
    }
};
