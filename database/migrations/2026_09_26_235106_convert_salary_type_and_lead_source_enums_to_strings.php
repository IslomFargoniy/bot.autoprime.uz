<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The application writes salary types (bonus, kpi, fine) and lead sources
     * (reception_manual) that the original enum columns rejected, so these
     * columns become plain strings validated at the application layer.
     */
    public function up(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            $table->string('salary_type', 40)->default('base_salary')->change();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->string('source', 40)->default('telegram_bot')->change();
        });
    }

    public function down(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            $table->enum('salary_type', ['base_salary', 'driving_hourly_rate', 'lesson_rate', 'bonus_kpi', 'penalty', 'advance'])->default('base_salary')->change();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->enum('source', ['telegram_bot', 'website', 'instagram', 'recommendation', 'walk_in'])->default('telegram_bot')->change();
        });
    }
};
