<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Dashboard & KPI & Audit
            'dashboard.view',
            'kpi.view',
            'audit.view',

            // Branches & Users
            'branches.view',
            'branches.manage',
            'users.view',
            'users.manage',
            'roles.manage',

            // Students & Groups
            'students.view',
            'students.create',
            'students.edit',
            'students.delete',
            'groups.view',
            'groups.manage',

            // Contracts & Certificates
            'contracts.view',
            'contracts.create',
            'contracts.edit',
            'contracts.print',
            'contract_types.manage',
            'certificates.view',
            'certificates.create',
            'certificates.print',

            // Finance & Cash
            'finance.view',
            'cash_registers.view',
            'payments.create',
            'payments.edit',
            'expenses.create',
            'expense_categories.manage',
            'cash_shifts.close',
            'cash_transfers.create',
            'cash_transfers.approve',
            'admin_treasury.manage',

            // Salaries
            'salaries.view',
            'salaries.accrue',
            'salaries.pay',

            // Attendance
            'attendance.view',
            'attendance.start_session',
            'attendance.mark_manual',
            'attendance.export',

            // Drivings & Autodromes
            'drivings.view',
            'drivings.manage',
            'autodromes.manage',
            'reviews.view',

            // LMS & Tests
            'lms.view',
            'lms.manage_materials',
            'tickets.manage',
            'attempts.view',

            // CRM & Fleet
            'crm.view',
            'leads.manage',
            'fleet.view',
            'fleet.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // 1. Super Admin
        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all());

        $superAdminAlt = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $superAdminAlt->syncPermissions(Permission::all());

        // 2. Admin
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions([
            'dashboard.view',
            'kpi.view',
            'branches.view',
            'users.view',
            'users.manage',
            'students.view',
            'students.create',
            'students.edit',
            'students.delete',
            'groups.view',
            'groups.manage',
            'contracts.view',
            'contracts.create',
            'contracts.edit',
            'contracts.print',
            'contract_types.manage',
            'certificates.view',
            'certificates.create',
            'certificates.print',
            'finance.view',
            'cash_registers.view',
            'payments.create',
            'payments.edit',
            'expenses.create',
            'expense_categories.manage',
            'cash_shifts.close',
            'cash_transfers.create',
            'salaries.view',
            'salaries.accrue',
            'salaries.pay',
            'attendance.view',
            'attendance.start_session',
            'attendance.mark_manual',
            'attendance.export',
            'drivings.view',
            'drivings.manage',
            'autodromes.manage',
            'reviews.view',
            'lms.view',
            'lms.manage_materials',
            'tickets.manage',
            'attempts.view',
            'crm.view',
            'leads.manage',
            'fleet.view',
            'fleet.manage',
        ]);

        // 3. Accountant
        $accountant = Role::firstOrCreate(['name' => 'accountant', 'guard_name' => 'web']);
        $accountant->syncPermissions([
            'dashboard.view',
            'kpi.view',
            'finance.view',
            'cash_registers.view',
            'payments.create',
            'payments.edit',
            'expenses.create',
            'expense_categories.manage',
            'cash_shifts.close',
            'cash_transfers.create',
            'salaries.view',
            'salaries.accrue',
            'salaries.pay',
            'contracts.view',
            'contracts.print',
        ]);

        // 4. Reception
        $reception = Role::firstOrCreate(['name' => 'reception', 'guard_name' => 'web']);
        $reception->syncPermissions([
            'dashboard.view',
            'students.view',
            'students.create',
            'students.edit',
            'groups.view',
            'contracts.view',
            'contracts.create',
            'contracts.print',
            'certificates.view',
            'certificates.create',
            'certificates.print',
            'payments.create',
            'crm.view',
            'leads.manage',
        ]);

        // 5. Kassir
        $kassir = Role::firstOrCreate(['name' => 'kassir', 'guard_name' => 'web']);
        $kassir->syncPermissions([
            'finance.view',
            'cash_registers.view',
            'payments.create',
            'expenses.create',
            'cash_shifts.close',
            'cash_transfers.create',
            'salaries.pay',
        ]);

        // 6. Teacher
        $teacher = Role::firstOrCreate(['name' => 'teacher', 'guard_name' => 'web']);
        $teacher->syncPermissions([
            'attendance.view',
            'attendance.start_session',
            'attendance.mark_manual',
            'lms.view',
            'groups.view',
            'students.view',
        ]);

        // 7. Instructor
        $instructor = Role::firstOrCreate(['name' => 'instructor', 'guard_name' => 'web']);
        $instructor->syncPermissions([
            'drivings.view',
            'drivings.manage',
        ]);
    }
}
