<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('name', 100);
            $table->string('category', 20)->default('B');
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->json('days_of_week')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('room', 100)->nullable();
            $table->integer('max_students')->default(30);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->index(['branch_id', 'is_active'], 'idx_groups_branch_active');
            $table->index(['instructor_id', 'is_active'], 'idx_groups_instructor_active');
            $table->index(['teacher_id', 'is_active'], 'idx_groups_teacher_active');
            $table->index('status', 'idx_groups_status');
        });

        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('groups')->nullOnDelete();
            $table->foreignId('registered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('full_name');
            $table->string('phone', 20)->unique();
            // Passport and PINFL are stored encrypted, hence text columns.
            $table->text('passport_series')->nullable();
            $table->text('passport_number')->nullable();
            $table->text('pinfl')->nullable();
            $table->string('pinfl_hash', 64)->nullable()->unique();
            $table->date('birth_date')->nullable();
            $table->string('address', 500)->nullable();
            $table->string('photo_url', 500)->nullable();
            $table->string('passport_photo_url', 500)->nullable();
            $table->string('medical_certificate_photo_url', 500)->nullable();
            $table->date('medical_certificate_date')->nullable();
            $table->string('telegram_id')->nullable()->unique();
            $table->bigInteger('telegram_chat_id')->nullable();
            $table->enum('status', ['active', 'graduated', 'dropped'])->default('active');
            $table->boolean('is_active')->default(true);
            $table->string('current_desktop_session_id')->nullable();
            $table->string('current_desktop_device_uuid')->nullable();
            $table->string('desktop_auth_token', 64)->nullable();
            $table->timestamp('desktop_token_expires_at')->nullable();
            $table->timestamps();

            $table->index(['branch_id', 'status'], 'idx_students_branch_status');
            $table->index(['group_id', 'status'], 'idx_students_group_status');
            $table->index('full_name', 'idx_students_full_name');
            $table->index('is_active', 'idx_students_is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
        Schema::dropIfExists('groups');
    }
};
