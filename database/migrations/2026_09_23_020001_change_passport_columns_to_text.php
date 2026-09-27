<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->text('passport_series')->nullable()->change();
            $table->text('passport_number')->nullable()->change();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->text('passport_series')->nullable()->change();
            $table->text('passport_number')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('passport_series', 10)->nullable()->change();
            $table->string('passport_number', 20)->nullable()->change();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->string('passport_series', 10)->nullable()->change();
            $table->string('passport_number', 20)->nullable()->change();
        });
    }
};
