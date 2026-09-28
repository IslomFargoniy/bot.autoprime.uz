<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_register_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 50)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('cash_register_type_id')->constrained('cash_register_types');
            $table->string('name', 100);
            $table->decimal('balance', 14, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('contracts')->nullOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('cash_register_id')->constrained('cash_registers');
            $table->foreignId('received_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('payment_type', 50)->default('contract_tuition');
            $table->string('payment_method', 50)->default('cash');
            $table->string('receipt_number', 100)->unique();
            $table->text('comment')->nullable();
            $table->timestamp('paid_at');
            $table->timestamps();

            $table->index(['contract_id', 'payment_type'], 'idx_payments_contract_type');
            $table->index(['student_id', 'payment_type'], 'idx_payments_student_type');
            $table->index(['cash_register_id', 'paid_at'], 'idx_payments_register_date');
            $table->index(['branch_id', 'paid_at'], 'idx_payments_branch_date');
            $table->index('payment_method', 'idx_payments_method');
        });

        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('cash_register_id')->constrained('cash_registers');
            $table->foreignId('expense_category_id')->constrained('expense_categories');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('recipient')->nullable();
            $table->text('description')->nullable();
            $table->string('receipt_photo_url', 500)->nullable();
            $table->timestamp('spent_at');
            $table->timestamps();

            $table->index(['cash_register_id', 'spent_at'], 'idx_expenses_register_date');
            $table->index(['branch_id', 'spent_at'], 'idx_expenses_branch_date');
            $table->index('expense_category_id', 'idx_expenses_category');
        });

        Schema::create('cash_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained('cash_registers');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->decimal('opening_balance', 14, 2)->default(0);
            $table->decimal('total_income', 14, 2)->default(0);
            $table->decimal('total_expense', 14, 2)->default(0);
            $table->decimal('closing_balance', 14, 2)->default(0);
            $table->decimal('transferred_to_admin', 14, 2)->default(0);
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('cash_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_cash_register_id')->constrained('cash_registers');
            $table->foreignId('to_cash_register_id')->constrained('cash_registers');
            $table->foreignId('cash_shift_id')->nullable()->constrained('cash_shifts')->nullOnDelete();
            $table->decimal('amount', 14, 2);
            $table->foreignId('sent_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Immutable cash ledger: every balance change of a register, with the running balance.
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
            $table->string('type', 10); // in | out
            $table->string('category', 40); // payment, expense, transfer_in/out, sweep_in/out, refund, initial ...
            $table->decimal('amount', 14, 2);
            $table->decimal('balance_before', 14, 2)->default(0);
            $table->decimal('balance_after', 14, 2)->default(0);
            $table->string('description', 500)->nullable();
            $table->nullableMorphs('reference');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transacted_at')->useCurrent();
            $table->timestamps();

            $table->index(['cash_register_id', 'transacted_at']);
            $table->index(['category']);
        });

        // Per-student / per-employee money history (tuition, refunds, salary accruals and payouts).
        Schema::create('financial_histories', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->string('type', 10); // credit | debit
            $table->string('category', 40);
            $table->decimal('amount', 14, 2);
            $table->decimal('balance_before', 14, 2)->default(0);
            $table->decimal('balance_after', 14, 2)->default(0);
            $table->string('payment_method', 30)->nullable();
            $table->string('description', 500)->nullable();
            $table->nullableMorphs('reference');
            $table->foreignId('performed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transacted_at')->useCurrent();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id', 'transacted_at']);
            $table->index(['category']);
            $table->index(['transacted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_histories');
        Schema::dropIfExists('cash_transactions');
        Schema::dropIfExists('cash_transfers');
        Schema::dropIfExists('cash_shifts');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('cash_registers');
        Schema::dropIfExists('cash_register_types');
    }
};
