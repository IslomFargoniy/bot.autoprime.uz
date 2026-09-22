<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
        });

        Schema::create('vehicle_maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->string('maintenance_type', 100);
            $table->decimal('cost', 12, 2);
            $table->integer('mileage');
            $table->date('performed_at');
            $table->text('description')->nullable();
            $table->string('invoice_photo_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_maintenances');
        Schema::dropIfExists('vehicles');
    }
};
