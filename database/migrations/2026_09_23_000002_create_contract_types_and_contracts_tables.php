<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('name');
            $table->string('category', 20)->default('B');
            $table->decimal('price', 12, 2);
            $table->boolean('has_theory')->default(true);
            $table->boolean('has_driving')->default(true);
            $table->boolean('has_lms')->default(true);
            $table->integer('required_driving_lessons')->default(10);
            $table->integer('required_theory_lessons')->default(24);
            $table->decimal('min_theory_payment_percent', 5, 2)->default(30.00);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('contract_type_id')->nullable()->constrained('contract_types')->nullOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('groups')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('contract_number', 50)->unique();
            $table->date('contract_date');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('has_theory')->default(true);
            $table->boolean('has_driving')->default(true);
            $table->boolean('has_lms')->default(true);
            $table->integer('required_driving_lessons')->default(10);
            $table->integer('required_theory_lessons')->default(24);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('final_amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('debt_amount', 12, 2)->default(0);
            $table->decimal('overpaid_amount', 12, 2)->default(0);
            $table->enum('status', ['active', 'completed', 'cancelled', 'frozen'])->default('active');
            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid');
            $table->text('terms')->nullable();
            $table->string('file_url', 500)->nullable();
            $table->timestamps();
        });

        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('contracts')->nullOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('groups')->nullOnDelete();
            $table->foreignId('issued_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('certificate_number', 50)->unique();
            $table->string('series', 10)->default('AF');
            $table->string('category', 10)->default('B');
            $table->integer('theory_score')->default(0);
            $table->string('practical_status', 50)->default('passed');
            $table->decimal('attendance_rate', 5, 2)->default(0);
            $table->date('issued_date');
            $table->string('qr_verify_hash', 255)->unique();
            $table->enum('status', ['issued', 'revoked'])->default('issued');
            $table->string('file_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
        Schema::dropIfExists('contracts');
        Schema::dropIfExists('contract_types');
    }
};
