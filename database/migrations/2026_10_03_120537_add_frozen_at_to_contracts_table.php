<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The day a contract was frozen, so the frozen days can be added to its end date
     * when it is activated again.
     */
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->date('frozen_at')->nullable()->after('end_date');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn('frozen_at');
        });
    }
};
