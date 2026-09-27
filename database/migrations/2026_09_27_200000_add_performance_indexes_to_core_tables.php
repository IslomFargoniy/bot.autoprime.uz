<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to add optimized composite and single-column indexes.
     */
    public function up(): void
    {
        // 1. Users table indexes
        Schema::table('users', function (Blueprint $table) {
            $table->index(['role', 'status'], 'idx_users_role_status');
            $table->index(['branch_id', 'role'], 'idx_users_branch_role');
        });

        // 2. Students table indexes
        Schema::table('students', function (Blueprint $table) {
            $table->index(['branch_id', 'status'], 'idx_students_branch_status');
            $table->index(['group_id', 'status'], 'idx_students_group_status');
            $table->index('full_name', 'idx_students_full_name');
            $table->index('is_active', 'idx_students_is_active');
        });

        // 3. Groups table indexes
        Schema::table('groups', function (Blueprint $table) {
            $table->index(['branch_id', 'is_active'], 'idx_groups_branch_active');
            $table->index(['instructor_id', 'is_active'], 'idx_groups_instructor_active');
            $table->index(['teacher_id', 'is_active'], 'idx_groups_teacher_active');
            $table->index('status', 'idx_groups_status');
        });

        // 4. Drivings table indexes (Critical for conflict scheduling, payroll & reminder jobs)
        Schema::table('drivings', function (Blueprint $table) {
            $table->index(['status', 'start_time', 'end_time'], 'idx_drivings_schedule_window');
            $table->index(['instructor_id', 'status', 'start_time'], 'idx_drivings_instructor_calc');
            $table->index(['student_id', 'status'], 'idx_drivings_student_status');
            $table->index(['branch_id', 'status', 'start_time'], 'idx_drivings_branch_date');
            $table->index(['vehicle_id', 'status', 'start_time'], 'idx_drivings_vehicle_status');
            $table->index(['status', 'reminded_24h_at', 'start_time'], 'idx_drivings_reminder_24h');
            $table->index(['status', 'reminded_2h_at', 'start_time'], 'idx_drivings_reminder_2h');
        });

        // 5. Contracts table indexes
        Schema::table('contracts', function (Blueprint $table) {
            $table->index(['student_id', 'status'], 'idx_contracts_student_status');
            $table->index(['branch_id', 'status'], 'idx_contracts_branch_status');
            $table->index(['status', 'debt_amount'], 'idx_contracts_status_debt');
            $table->index('payment_status', 'idx_contracts_payment_status');
        });

        // 6. Payments table indexes
        Schema::table('payments', function (Blueprint $table) {
            $table->index(['contract_id', 'payment_type'], 'idx_payments_contract_type');
            $table->index(['student_id', 'payment_type'], 'idx_payments_student_type');
            $table->index(['cash_register_id', 'paid_at'], 'idx_payments_register_date');
            $table->index(['branch_id', 'paid_at'], 'idx_payments_branch_date');
            $table->index('payment_method', 'idx_payments_method');
        });

        // 7. Expenses table indexes
        Schema::table('expenses', function (Blueprint $table) {
            $table->index(['cash_register_id', 'spent_at'], 'idx_expenses_register_date');
            $table->index(['branch_id', 'spent_at'], 'idx_expenses_branch_date');
            $table->index('expense_category_id', 'idx_expenses_category');
        });

        // 8. Salaries table indexes
        Schema::table('salaries', function (Blueprint $table) {
            $table->index(['user_id', 'period', 'salary_type'], 'idx_salaries_user_period_type');
            $table->index(['user_id', 'is_deduction'], 'idx_salaries_user_deduction');
            $table->index(['branch_id', 'period'], 'idx_salaries_branch_period');
        });

        // 9. Salary payments table indexes
        Schema::table('salary_payments', function (Blueprint $table) {
            $table->index(['salary_id', 'paid_at'], 'idx_salary_payments_salary_date');
            $table->index(['user_id', 'paid_at'], 'idx_salary_payments_user_date');
            $table->index(['cash_register_id', 'paid_at'], 'idx_salary_payments_register_date');
        });

        // 10. Lesson sessions table indexes
        Schema::table('lesson_sessions', function (Blueprint $table) {
            $table->index(['group_id', 'started_at'], 'idx_lesson_sessions_group_date');
            $table->index(['teacher_id', 'status', 'started_at'], 'idx_lesson_sessions_teacher_date');
            $table->index(['branch_id', 'status', 'started_at'], 'idx_lesson_sessions_branch_status');
        });

        // 11. Attendances table indexes
        Schema::table('attendances', function (Blueprint $table) {
            $table->index(['student_id', 'status'], 'idx_attendances_student_status');
            $table->index(['lesson_session_id', 'status'], 'idx_attendances_session_status');
            $table->index('scanned_at', 'idx_attendances_scanned_at');
        });

        // 12. Leads table indexes
        Schema::table('leads', function (Blueprint $table) {
            $table->index(['telegram_id', 'stage'], 'idx_leads_telegram_stage');
            $table->index(['branch_id', 'stage'], 'idx_leads_branch_stage');
            $table->index(['stage', 'created_at'], 'idx_leads_stage_date');
            $table->index('source', 'idx_leads_source');
        });

        // 13. Attempts table indexes
        Schema::table('attempts', function (Blueprint $table) {
            $table->index(['student_id', 'attempt_type', 'is_passed'], 'idx_attempts_student_exam_passed');
            $table->index('ticket_id', 'idx_attempts_ticket_id');
            $table->index(['attempt_type', 'is_passed'], 'idx_attempts_type_passed');
        });

        // 14. Vehicles table indexes
        Schema::table('vehicles', function (Blueprint $table) {
            $table->index(['instructor_id', 'status'], 'idx_vehicles_instructor_status');
            $table->index(['branch_id', 'status'], 'idx_vehicles_branch_status');
        });

        // 15. Vehicle maintenances table indexes
        Schema::table('vehicle_maintenances', function (Blueprint $table) {
            $table->index(['vehicle_id', 'performed_at'], 'idx_vehicle_maintenances_performed');
            $table->index('next_due_date', 'idx_vehicle_maintenances_due_date');
        });

        // 16. Reviews table indexes
        Schema::table('reviews', function (Blueprint $table) {
            $table->index('rating', 'idx_reviews_rating');
        });

        // 17. Certificates table indexes
        Schema::table('certificates', function (Blueprint $table) {
            $table->index(['student_id', 'status'], 'idx_certificates_student_status');
            $table->index(['branch_id', 'issued_date'], 'idx_certificates_branch_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropIndex('idx_certificates_student_status');
            $table->dropIndex('idx_certificates_branch_date');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex('idx_reviews_rating');
        });

        Schema::table('vehicle_maintenances', function (Blueprint $table) {
            $table->dropIndex('idx_vehicle_maintenances_performed');
            $table->dropIndex('idx_vehicle_maintenances_due_date');
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropIndex('idx_vehicles_instructor_status');
            $table->dropIndex('idx_vehicles_branch_status');
        });

        Schema::table('attempts', function (Blueprint $table) {
            $table->dropIndex('idx_attempts_student_exam_passed');
            $table->dropIndex('idx_attempts_ticket_id');
            $table->dropIndex('idx_attempts_type_passed');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex('idx_leads_telegram_stage');
            $table->dropIndex('idx_leads_branch_stage');
            $table->dropIndex('idx_leads_stage_date');
            $table->dropIndex('idx_leads_source');
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex('idx_attendances_student_status');
            $table->dropIndex('idx_attendances_session_status');
            $table->dropIndex('idx_attendances_scanned_at');
        });

        Schema::table('lesson_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_lesson_sessions_group_date');
            $table->dropIndex('idx_lesson_sessions_teacher_date');
            $table->dropIndex('idx_lesson_sessions_branch_status');
        });

        Schema::table('salary_payments', function (Blueprint $table) {
            $table->dropIndex('idx_salary_payments_salary_date');
            $table->dropIndex('idx_salary_payments_user_date');
            $table->dropIndex('idx_salary_payments_register_date');
        });

        Schema::table('salaries', function (Blueprint $table) {
            $table->dropIndex('idx_salaries_user_period_type');
            $table->dropIndex('idx_salaries_user_deduction');
            $table->dropIndex('idx_salaries_branch_period');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex('idx_expenses_register_date');
            $table->dropIndex('idx_expenses_branch_date');
            $table->dropIndex('idx_expenses_category');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('idx_payments_contract_type');
            $table->dropIndex('idx_payments_student_type');
            $table->dropIndex('idx_payments_register_date');
            $table->dropIndex('idx_payments_branch_date');
            $table->dropIndex('idx_payments_method');
        });

        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex('idx_contracts_student_status');
            $table->dropIndex('idx_contracts_branch_status');
            $table->dropIndex('idx_contracts_status_debt');
            $table->dropIndex('idx_contracts_payment_status');
        });

        Schema::table('drivings', function (Blueprint $table) {
            $table->dropIndex('idx_drivings_schedule_window');
            $table->dropIndex('idx_drivings_instructor_calc');
            $table->dropIndex('idx_drivings_student_status');
            $table->dropIndex('idx_drivings_branch_date');
            $table->dropIndex('idx_drivings_vehicle_status');
            $table->dropIndex('idx_drivings_reminder_24h');
            $table->dropIndex('idx_drivings_reminder_2h');
        });

        Schema::table('groups', function (Blueprint $table) {
            $table->dropIndex('idx_groups_branch_active');
            $table->dropIndex('idx_groups_instructor_active');
            $table->dropIndex('idx_groups_teacher_active');
            $table->dropIndex('idx_groups_status');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex('idx_students_branch_status');
            $table->dropIndex('idx_students_group_status');
            $table->dropIndex('idx_students_full_name');
            $table->dropIndex('idx_students_is_active');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_role_status');
            $table->dropIndex('idx_users_branch_role');
        });
    }
};
