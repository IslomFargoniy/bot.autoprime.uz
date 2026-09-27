<?php

use App\Models\Payment;
use App\Models\Salary;
use App\Models\SalaryPayment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('financial_histories')) {
            Schema::create('financial_histories', function (Blueprint $table) {
                $table->id();
                $table->string('entity_type');
                $table->unsignedBigInteger('entity_id');
                $table->string('type', 10); // 'credit' (+) or 'debit' (-)
                $table->string('category', 40); // 'tuition_payment', 'refund', 'tuition_charge', 'salary_accrual', 'salary_payout', 'bonus', 'kpi', 'fine', 'advance'
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

        $this->backfillHistoricalRecords();
    }

    /**
     * Backfill existing payments and salary payouts to financial histories
     */
    protected function backfillHistoricalRecords(): void
    {
        // 1. Backfill student payments
        $payments = Payment::with(['contract.student'])->orderBy('created_at', 'asc')->get();
        foreach ($payments as $p) {
            $studentId = $p->student_id ?? $p->contract?->student_id;
            if ($studentId) {
                $isRefund = ($p->payment_type === 'refund');
                DB::table('financial_histories')->insert([
                    'entity_type' => Student::class,
                    'entity_id' => $studentId,
                    'type' => $isRefund ? 'debit' : 'credit',
                    'category' => $isRefund ? 'refund' : 'tuition_payment',
                    'amount' => $p->amount,
                    'balance_before' => 0,
                    'balance_after' => 0,
                    'payment_method' => $p->payment_method,
                    'description' => "Shartnoma to'lovi: #{$p->receipt_number}",
                    'reference_type' => Payment::class,
                    'reference_id' => $p->id,
                    'performed_by_user_id' => $p->received_by_user_id,
                    'transacted_at' => $p->paid_at ?? $p->created_at ?? now(),
                    'created_at' => $p->created_at ?? now(),
                    'updated_at' => $p->updated_at ?? now(),
                ]);
            }
        }

        // 2. Backfill employee salary payouts
        $salaryPayments = SalaryPayment::with(['salary'])->orderBy('created_at', 'asc')->get();
        foreach ($salaryPayments as $sp) {
            if ($sp->user_id) {
                DB::table('financial_histories')->insert([
                    'entity_type' => User::class,
                    'entity_id' => $sp->user_id,
                    'type' => 'debit',
                    'category' => 'salary_payout',
                    'amount' => $sp->amount,
                    'balance_before' => 0,
                    'balance_after' => 0,
                    'payment_method' => $sp->payment_method,
                    'description' => "Oylik to'lovi: " . ($sp->salary?->period ? "{$sp->salary->period} oyi" : "kassadan to'lov"),
                    'reference_type' => SalaryPayment::class,
                    'reference_id' => $sp->id,
                    'performed_by_user_id' => $sp->paid_by_user_id,
                    'transacted_at' => $sp->paid_at ?? $sp->created_at ?? now(),
                    'created_at' => $sp->created_at ?? now(),
                    'updated_at' => $sp->updated_at ?? now(),
                ]);
            }
        }

        // 3. Backfill employee salary adjustments / accruals
        $salaries = Salary::orderBy('created_at', 'asc')->get();
        foreach ($salaries as $sal) {
            if ($sal->user_id) {
                $type = $sal->is_deduction ? 'debit' : 'credit';
                $category = match ($sal->salary_type) {
                    'fine' => 'fine',
                    'advance' => 'advance',
                    'bonus' => 'bonus',
                    'kpi' => 'kpi',
                    default => 'salary_accrual',
                };

                DB::table('financial_histories')->insert([
                    'entity_type' => User::class,
                    'entity_id' => $sal->user_id,
                    'type' => $type,
                    'category' => $category,
                    'amount' => $sal->amount,
                    'balance_before' => 0,
                    'balance_after' => 0,
                    'payment_method' => null,
                    'description' => $sal->notes ?: ($category === 'salary_accrual' ? "Oylik hisoblandi ({$sal->period})" : "Qo'shimcha hisob"),
                    'reference_type' => Salary::class,
                    'reference_id' => $sal->id,
                    'performed_by_user_id' => $sal->created_by_user_id,
                    'transacted_at' => $sal->accrued_at ?? $sal->created_at ?? now(),
                    'created_at' => $sal->created_at ?? now(),
                    'updated_at' => $sal->updated_at ?? now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_histories');
    }
};
