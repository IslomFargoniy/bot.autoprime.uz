<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->integer('ticket_number')->unique();
            $table->string('title_uz');
            $table->string('title_ru')->nullable();
            $table->string('title_krill')->nullable();
            $table->string('title_en')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->integer('question_number');
            $table->text('question_uz');
            $table->text('question_ru');
            $table->text('question_krill')->nullable();
            $table->text('question_en')->nullable();
            $table->text('description_uz')->nullable();
            $table->text('description_ru')->nullable();
            $table->text('description_krill')->nullable();
            $table->text('description_en')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->string('audio_url_uz', 500)->nullable();
            $table->string('audio_url_ru', 500)->nullable();
            $table->string('audio_url_krill', 500)->nullable();
            $table->string('audio_url_en', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->text('answer_uz');
            $table->text('answer_ru');
            $table->text('answer_krill')->nullable();
            $table->text('answer_en')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        Schema::create('sign_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name_uz');
            $table->string('name_ru');
            $table->string('name_krill')->nullable();
            $table->string('name_en')->nullable();
            $table->string('slug')->unique();
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        Schema::create('signs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('sign_categories')->cascadeOnDelete();
            $table->string('sign_number', 50);
            $table->string('name_uz');
            $table->string('name_ru');
            $table->string('name_krill')->nullable();
            $table->string('name_en')->nullable();
            $table->text('description_uz')->nullable();
            $table->text('description_ru')->nullable();
            $table->text('description_krill')->nullable();
            $table->text('description_en')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        Schema::create('road_lines', function (Blueprint $table) {
            $table->id();
            $table->string('line_number', 50);
            $table->string('name_uz');
            $table->string('name_ru');
            $table->string('name_krill')->nullable();
            $table->string('name_en')->nullable();
            $table->text('description_uz')->nullable();
            $table->text('description_ru')->nullable();
            $table->text('description_krill')->nullable();
            $table->text('description_en')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->timestamps();
        });

        Schema::create('attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('tickets')->nullOnDelete();
            $table->enum('attempt_type', ['ticket_exam', 'random_mock', 'marathon', 'mistakes'])->default('random_mock');
            $table->integer('total_questions')->default(20);
            $table->integer('correct_answers')->default(0);
            $table->integer('wrong_answers')->default(0);
            $table->decimal('score_percentage', 5, 2)->default(0);
            $table->boolean('is_passed')->default(false);
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->integer('duration_seconds')->default(0);
            $table->timestamps();
        });

        Schema::create('attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('attempts')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions')->cascadeOnDelete();
            $table->foreignId('answer_id')->nullable()->constrained('answers')->nullOnDelete();
            $table->boolean('is_correct')->default(false);
            $table->timestamp('answered_at');
            $table->integer('duration_seconds')->default(0);
            $table->timestamps();
        });

        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('contracts')->nullOnDelete();
            $table->bigInteger('telegram_id')->nullable();
            $table->string('form_token', 64)->nullable()->unique();
            $table->boolean('is_form_completed')->default(false);
            $table->string('full_name');
            $table->string('phone', 50);
            $table->string('category', 20)->default('B');
            $table->string('preferred_time', 50)->nullable();
            $table->string('passport_series', 10)->nullable();
            $table->string('passport_number', 20)->nullable();
            $table->text('pinfl')->nullable();
            $table->string('pinfl_hash', 64)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('address', 500)->nullable();
            $table->string('photo_url', 500)->nullable();
            $table->string('passport_photo_url', 500)->nullable();
            $table->string('medical_certificate_photo_url', 500)->nullable();
            $table->enum('source', ['telegram_bot', 'website', 'instagram', 'recommendation', 'walk_in'])->default('telegram_bot');
            $table->enum('stage', ['new_lead', 'form_sent', 'form_completed', 'contract_signed', 'rejected'])->default('new_lead');
            $table->text('notes')->nullable();
            $table->text('lost_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
        Schema::dropIfExists('attempt_answers');
        Schema::dropIfExists('attempts');
        Schema::dropIfExists('road_lines');
        Schema::dropIfExists('signs');
        Schema::dropIfExists('sign_categories');
        Schema::dropIfExists('answers');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('tickets');
    }
};
