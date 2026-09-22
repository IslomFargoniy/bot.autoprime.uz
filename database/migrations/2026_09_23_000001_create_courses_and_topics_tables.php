<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category', 20)->default('B');
            $table->text('description')->nullable();
            $table->string('thumbnail_url', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title_uz');
            $table->string('title_ru')->nullable();
            $table->string('title_krill')->nullable();
            $table->string('title_en')->nullable();
            $table->text('description')->nullable();
            $table->string('video_url', 500)->nullable();
            $table->integer('duration_minutes')->default(0);
            $table->integer('order_number')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('lesson_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('topic_id')->constrained('topics')->cascadeOnDelete();
            $table->string('title');
            $table->string('file_url', 500);
            $table->string('file_type', 20)->default('pdf');
            $table->string('file_size', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_materials');
        Schema::dropIfExists('topics');
        Schema::dropIfExists('courses');
    }
};
