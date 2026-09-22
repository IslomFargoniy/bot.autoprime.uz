<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('base_salary', 12, 2)->default(0)->after('status');
            $table->decimal('driving_hourly_rate', 12, 2)->default(0)->after('base_salary');
            $table->decimal('lesson_rate', 12, 2)->default(0)->after('driving_hourly_rate');
        });

        Schema::table('groups', function (Blueprint $table) {
            $table->foreignId('teacher_id')->nullable()->after('instructor_id')->constrained('users')->nullOnDelete();
            $table->foreignId('course_id')->nullable()->after('teacher_id')->constrained('courses')->nullOnDelete();
            $table->string('category', 20)->default('B')->after('name');
            $table->json('days_of_week')->nullable()->after('category');
            $table->time('start_time')->nullable()->after('days_of_week');
            $table->time('end_time')->nullable()->after('start_time');
            $table->string('room', 100)->nullable()->after('end_time');
            $table->integer('max_students')->default(30)->after('room');
            $table->date('start_date')->nullable()->after('max_students');
            $table->date('end_date')->nullable()->after('start_date');
            $table->boolean('is_active')->default(true)->after('end_date');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->foreignId('registered_by_user_id')->nullable()->after('group_id')->constrained('users')->nullOnDelete();
            $table->string('passport_series', 10)->nullable()->after('phone');
            $table->string('passport_number', 20)->nullable()->after('passport_series');
            $table->text('pinfl')->nullable()->after('passport_number');
            $table->string('pinfl_hash', 64)->nullable()->unique()->after('pinfl');
            $table->date('birth_date')->nullable()->after('pinfl_hash');
            $table->string('address', 500)->nullable()->after('birth_date');
            $table->string('photo_url', 500)->nullable()->after('address');
            $table->string('passport_photo_url', 500)->nullable()->after('photo_url');
            $table->string('medical_certificate_photo_url', 500)->nullable()->after('passport_photo_url');
            $table->date('medical_certificate_date')->nullable()->after('medical_certificate_photo_url');
            $table->bigInteger('telegram_chat_id')->nullable()->after('telegram_id');
            $table->boolean('is_active')->default(true)->after('status');
        });

        Schema::table('drivings', function (Blueprint $table) {
            $table->foreignId('contract_id')->nullable()->after('student_id')->constrained('contracts')->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->after('autodrome_id')->constrained('vehicles')->nullOnDelete();
            $table->date('date')->nullable()->after('vehicle_id');
            $table->text('instructor_comment')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('drivings', function (Blueprint $table) {
            $table->dropForeign(['contract_id']);
            $table->dropForeign(['vehicle_id']);
            $table->dropColumn(['contract_id', 'vehicle_id', 'date', 'instructor_comment']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['registered_by_user_id']);
            $table->dropColumn([
                'registered_by_user_id',
                'passport_series',
                'passport_number',
                'pinfl',
                'pinfl_hash',
                'birth_date',
                'address',
                'photo_url',
                'passport_photo_url',
                'medical_certificate_photo_url',
                'medical_certificate_date',
                'telegram_chat_id',
                'is_active',
            ]);
        });

        Schema::table('groups', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
            $table->dropForeign(['course_id']);
            $table->dropColumn([
                'teacher_id',
                'course_id',
                'category',
                'days_of_week',
                'start_time',
                'end_time',
                'room',
                'max_students',
                'start_date',
                'end_date',
                'is_active',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['base_salary', 'driving_hourly_rate', 'lesson_rate']);
        });
    }
};
