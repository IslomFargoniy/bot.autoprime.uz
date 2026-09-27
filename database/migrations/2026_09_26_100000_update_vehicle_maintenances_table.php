<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicle_maintenances', function (Blueprint $table) {
            $table->integer('mileage')->nullable()->default(0)->change();
            if (! Schema::hasColumn('vehicle_maintenances', 'next_due_date')) {
                $table->date('next_due_date')->nullable()->after('performed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vehicle_maintenances', function (Blueprint $table) {
            if (Schema::hasColumn('vehicle_maintenances', 'next_due_date')) {
                $table->dropColumn('next_due_date');
            }
        });
    }
};
