<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('autodromes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('name');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->integer('radius_meters')->default(100);
            $table->timestamps();
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('make_model');
            $table->string('plate_number', 50)->unique();
            $table->enum('fuel_type', ['petrol', 'gas_methane', 'gas_propane', 'diesel', 'electric'])->default('petrol');
            $table->integer('current_mileage')->default(0);
            $table->integer('last_oil_change_mileage')->default(0);
            $table->integer('next_oil_change_mileage')->default(0);
            $table->date('insurance_expiry_date')->nullable();
            $table->date('gas_inspection_expiry_date')->nullable();
            $table->date('mot_expiry_date')->nullable();
            $table->enum('status', ['active', 'maintenance', 'out_of_service'])->default('active');
            $table->timestamps();

            $table->index(['instructor_id', 'status'], 'idx_vehicles_instructor_status');
            $table->index(['branch_id', 'status'], 'idx_vehicles_branch_status');
        });

        Schema::create('vehicle_maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->foreignId('cash_register_id')->nullable()->constrained('cash_registers')->nullOnDelete();
            $table->foreignId('expense_id')->nullable()->constrained('expenses')->nullOnDelete();
            $table->string('maintenance_type', 100);
            $table->decimal('cost', 12, 2);
            $table->integer('mileage')->nullable()->default(0);
            $table->date('performed_at');
            $table->date('next_due_date')->nullable();
            $table->text('description')->nullable();
            $table->string('invoice_photo_url', 500)->nullable();
            $table->timestamps();

            $table->index(['vehicle_id', 'performed_at'], 'idx_vehicle_maintenances_performed');
            $table->index('next_due_date', 'idx_vehicle_maintenances_due_date');
        });

        Schema::create('drivings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('instructor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('groups')->nullOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('contracts')->nullOnDelete();
            $table->foreignId('autodrome_id')->nullable()->constrained('autodromes')->nullOnDelete();
            $table->foreignId('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
            $table->date('date')->nullable();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
            $table->timestamp('reminded_24h_at')->nullable();
            $table->timestamp('reminded_2h_at')->nullable();
            $table->text('instructor_comment')->nullable();
            $table->timestamps();

            $table->index(['status', 'start_time', 'end_time'], 'idx_drivings_schedule_window');
            $table->index(['instructor_id', 'status', 'start_time'], 'idx_drivings_instructor_calc');
            $table->index(['student_id', 'status'], 'idx_drivings_student_status');
            $table->index(['branch_id', 'status', 'start_time'], 'idx_drivings_branch_date');
            $table->index(['vehicle_id', 'status', 'start_time'], 'idx_drivings_vehicle_status');
            $table->index(['status', 'reminded_24h_at', 'start_time'], 'idx_drivings_reminder_24h');
            $table->index(['status', 'reminded_2h_at', 'start_time'], 'idx_drivings_reminder_2h');
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driving_id')->unique()->constrained('drivings')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->json('reason_tags')->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index('rating', 'idx_reviews_rating');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('drivings');
        Schema::dropIfExists('vehicle_maintenances');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('autodromes');
    }
};
