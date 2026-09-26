<?php

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;

test('admin can view vehicles page with cash registers and maintenances', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $branch = Branch::firstOrCreate(['code' => 'test-b1'], ['name' => 'Test Branch', 'status' => 'active']);
    $vehicle = Vehicle::create([
        'branch_id' => $branch->id,
        'plate_number' => '01AAA111',
        'make_model' => 'Cobalt',
        'fuel_type' => 'petrol',
        'status' => 'active',
    ]);

    $response = $this->actingAs($admin)->get('/admin/vehicles');

    $response->assertOk();
});

test('admin can create vehicle maintenance without cash register', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $branch = Branch::firstOrCreate(['code' => 'test-b2'], ['name' => 'Test Branch 2', 'status' => 'active']);
    $vehicle = Vehicle::create([
        'branch_id' => $branch->id,
        'plate_number' => '01BBB222',
        'make_model' => 'Gentra',
        'fuel_type' => 'petrol',
        'status' => 'active',
        'current_mileage' => 10000,
    ]);

    $response = $this->actingAs($admin)->post("/admin/vehicles/{$vehicle->id}/maintenances", [
        'maintenance_type' => 'Moy almashtirish',
        'cost' => 350000,
        'performed_date' => '2026-09-26',
        'odometer' => 15000,
        'notes' => 'Mobil 1 moyi',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('vehicle_maintenances', [
        'vehicle_id' => $vehicle->id,
        'maintenance_type' => 'Moy almashtirish',
        'cost' => 350000,
        'mileage' => 15000,
    ]);
    expect($vehicle->fresh()->current_mileage)->toBe(15000);
});

test('admin can create vehicle maintenance with cash register which creates expense and decrements balance', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $branch = Branch::firstOrCreate(['code' => 'test-b3'], ['name' => 'Test Branch 3', 'status' => 'active']);
    $type = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true]);
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $type->id,
        'name' => 'Test Kassa',
        'balance' => 1000000,
        'is_active' => true,
    ]);
    $vehicle = Vehicle::create([
        'branch_id' => $branch->id,
        'plate_number' => '01CCC333',
        'make_model' => 'Nexia 3',
        'fuel_type' => 'petrol',
        'status' => 'active',
    ]);

    $response = $this->actingAs($admin)->post("/admin/vehicles/{$vehicle->id}/maintenances", [
        'maintenance_type' => 'Tormoz kolodkasi',
        'cost' => 400000,
        'performed_date' => '2026-09-26',
        'cash_register_id' => $register->id,
        'notes' => 'Oldi kolodkalar',
    ]);

    $response->assertRedirect();
    expect((float) $register->fresh()->balance)->toBe(600000.0);

    $maintenance = VehicleMaintenance::where('vehicle_id', $vehicle->id)->first();
    expect($maintenance)->not->toBeNull();
    expect($maintenance->cash_register_id)->toBe($register->id);
    expect($maintenance->expense_id)->not->toBeNull();

    $this->assertDatabaseHas('expenses', [
        'id' => $maintenance->expense_id,
        'cash_register_id' => $register->id,
        'amount' => 400000,
    ]);
});

test('admin cannot create maintenance if cash register has insufficient balance', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $branch = Branch::firstOrCreate(['code' => 'test-b4'], ['name' => 'Test Branch 4', 'status' => 'active']);
    $type = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true]);
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $type->id,
        'name' => 'Kichik Kassa',
        'balance' => 50000,
        'is_active' => true,
    ]);
    $vehicle = Vehicle::create([
        'branch_id' => $branch->id,
        'plate_number' => '01DDD444',
        'make_model' => 'Cobalt',
        'fuel_type' => 'petrol',
        'status' => 'active',
    ]);

    $response = $this->actingAs($admin)->post("/admin/vehicles/{$vehicle->id}/maintenances", [
        'maintenance_type' => 'Akkumulyator',
        'cost' => 700000,
        'performed_date' => '2026-09-26',
        'cash_register_id' => $register->id,
    ]);

    $response->assertSessionHasErrors(['cash_register_id']);
    expect((float) $register->fresh()->balance)->toBe(50000.0);
});

test('admin can delete maintenance which refunds cash register and deletes expense', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $branch = Branch::firstOrCreate(['code' => 'test-b5'], ['name' => 'Test Branch 5', 'status' => 'active']);
    $type = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd', 'is_active' => true]);
    $register = CashRegister::create([
        'branch_id' => $branch->id,
        'cash_register_type_id' => $type->id,
        'name' => 'Qaytarish Kassasi',
        'balance' => 200000,
        'is_active' => true,
    ]);
    $vehicle = Vehicle::create([
        'branch_id' => $branch->id,
        'plate_number' => '01EEE555',
        'make_model' => 'Tracker',
        'fuel_type' => 'petrol',
        'status' => 'active',
    ]);

    $category = ExpenseCategory::firstOrCreate(['name' => "Ta'mir"], ['is_active' => true]);
    $expense = Expense::create([
        'branch_id' => $branch->id,
        'cash_register_id' => $register->id,
        'expense_category_id' => $category->id,
        'user_id' => $admin->id,
        'amount' => 150000,
        'recipient' => 'Tracker',
        'description' => 'Moy',
        'spent_at' => now(),
    ]);

    $maintenance = VehicleMaintenance::create([
        'vehicle_id' => $vehicle->id,
        'cash_register_id' => $register->id,
        'expense_id' => $expense->id,
        'maintenance_type' => 'Moy',
        'cost' => 150000,
        'performed_at' => now(),
    ]);

    $response = $this->actingAs($admin)->delete("/admin/vehicles/{$vehicle->id}/maintenances/{$maintenance->id}");

    $response->assertRedirect();
    expect((float) $register->fresh()->balance)->toBe(350000.0);
    $this->assertDatabaseMissing('vehicle_maintenances', ['id' => $maintenance->id]);
    $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
});
