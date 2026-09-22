<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('period', 20); // YYYY-MM
            $table->enum('salary_type', ['base_salary', 'driving_hourly_rate', 'lesson_rate', 'bonus_kpi', 'penalty', 'advance'])->default('base_salary');
            $table->decimal('amount', 12, 2);
            $table->boolean('is_deduction')->default(false);
            $table->integer('lessons_or_hours_count')->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('accrued_at');
            $table->timestamps();
        });

        Schema::create('salary_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_id')->nullable()->constrained('salaries')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cash_register_id')->constrained('cash_registers');
            $table->foreignId('paid_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('payment_method', 50)->default('cash');
            $table->text('comment')->nullable();
            $table->timestamp('paid_at');
            $table->timestamps();
        });

        Schema::create('lesson_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('topic');
            $table->string('room_number', 50)->nullable();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->enum('status', ['active', 'finished', 'cancelled'])->default('active');
            $table->string('qr_secret_salt', 255);
            $table->timestamps();
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_session_id')->constrained('lesson_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->timestamp('scanned_at');
            $table->enum('status', ['present', 'late', 'absent'])->default('present');
            $table->boolean('is_manual')->default(false);
            $table->foreignId('marked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('manual_reason')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->unique(['lesson_session_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('lesson_sessions');
        Schema::dropIfExists('salary_payments');
        Schema::dropIfExists('salaries');
    }
};
