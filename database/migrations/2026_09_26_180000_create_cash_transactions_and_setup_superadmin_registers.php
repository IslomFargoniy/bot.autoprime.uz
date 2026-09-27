<?php

use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\CashTransfer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create cash_transactions table for ledger history with running balance
        if (! Schema::hasTable('cash_transactions')) {
            Schema::create('cash_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
                $table->string('type', 10); // 'in' or 'out'
                $table->string('category', 40); // 'payment', 'expense', 'transfer_in', 'transfer_out', 'sweep_in', 'sweep_out', 'refund', 'initial'
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
        }

        // 2. Ensure Superadmin has a cash register for each CashRegisterType
        $types = CashRegisterType::where('is_active', true)->get();
        foreach ($types as $type) {
            $exists = CashRegister::whereNull('branch_id')
                ->where('cash_register_type_id', $type->id)
                ->first();

            if (! $exists) {
                CashRegister::create([
                    'branch_id' => null,
                    'cash_register_type_id' => $type->id,
                    'name' => 'Bosh ' . $type->name . ' (Superadmin)',
                    'balance' => 0,
                    'is_active' => true,
                ]);
            }
        }

        // 3. Backfill initial historical records if any exist
        $this->backfillHistoricalTransactions();
    }

    protected function backfillHistoricalTransactions(): void
    {
        $registers = CashRegister::all();

        foreach ($registers as $register) {
            // Collect all historical events for this register
            $events = collect();

            // Payments
            $payments = Payment::where('cash_register_id', $register->id)->get();
            foreach ($payments as $payment) {
                $events->push([
                    'type' => 'in',
                    'category' => 'payment',
                    'amount' => (float) $payment->amount,
                    'description' => "To'lov qabul qilindi (#{$payment->receipt_number})",
                    'reference_type' => Payment::class,
                    'reference_id' => $payment->id,
                    'user_id' => $payment->received_by_user_id,
                    'transacted_at' => $payment->paid_at ?? $payment->created_at,
                ]);
            }

            // Expenses
            $expenses = Expense::with('category')->where('cash_register_id', $register->id)->get();
            foreach ($expenses as $expense) {
                $events->push([
                    'type' => 'out',
                    'category' => 'expense',
                    'amount' => (float) $expense->amount,
                    'description' => "Xarajat: " . ($expense->category?->name ?? 'Umumiy') . ($expense->description ? " - {$expense->description}" : ''),
                    'reference_type' => Expense::class,
                    'reference_id' => $expense->id,
                    'user_id' => $expense->user_id,
                    'transacted_at' => $expense->spent_at ?? $expense->created_at,
                ]);
            }

            // Outgoing Transfers
            $transfersOut = CashTransfer::with('toCashRegister')
                ->where('from_cash_register_id', $register->id)
                ->where('status', 'approved')
                ->get();
            foreach ($transfersOut as $tr) {
                $events->push([
                    'type' => 'out',
                    'category' => 'transfer_out',
                    'amount' => (float) $tr->amount,
                    'description' => "Transfer chiqim: " . ($tr->toCashRegister?->name ?? 'Boshqa kassa') . " ga",
                    'reference_type' => CashTransfer::class,
                    'reference_id' => $tr->id,
                    'user_id' => $tr->approved_by_user_id ?? $tr->sent_by_user_id,
                    'transacted_at' => $tr->updated_at ?? $tr->created_at,
                ]);
            }

            // Incoming Transfers
            $transfersIn = CashTransfer::with('fromCashRegister')
                ->where('to_cash_register_id', $register->id)
                ->where('status', 'approved')
                ->get();
            foreach ($transfersIn as $tr) {
                $events->push([
                    'type' => 'in',
                    'category' => 'transfer_in',
                    'amount' => (float) $tr->amount,
                    'description' => "Transfer kirim: " . ($tr->fromCashRegister?->name ?? 'Boshqa kassa') . " dan",
                    'reference_type' => CashTransfer::class,
                    'reference_id' => $tr->id,
                    'user_id' => $tr->approved_by_user_id ?? $tr->sent_by_user_id,
                    'transacted_at' => $tr->updated_at ?? $tr->created_at,
                ]);
            }

            // Sort events by transacted_at
            $sorted = $events->sortBy('transacted_at');

            $runningBalance = 0.0;
            foreach ($sorted as $item) {
                $balBefore = $runningBalance;
                if ($item['type'] === 'in') {
                    $runningBalance += $item['amount'];
                } else {
                    $runningBalance = max(0, $runningBalance - $item['amount']);
                }

                DB::table('cash_transactions')->insert([
                    'cash_register_id' => $register->id,
                    'type' => $item['type'],
                    'category' => $item['category'],
                    'amount' => $item['amount'],
                    'balance_before' => $balBefore,
                    'balance_after' => $runningBalance,
                    'description' => $item['description'],
                    'reference_type' => $item['reference_type'],
                    'reference_id' => $item['reference_id'],
                    'user_id' => $item['user_id'],
                    'transacted_at' => $item['transacted_at'],
                    'created_at' => $item['transacted_at'],
                    'updated_at' => $item['transacted_at'],
                ]);
            }

            // If register balance differs from runningBalance, insert an opening/reconciliation record if needed
            if ($runningBalance != (float) $register->balance && (float) $register->balance > 0) {
                DB::table('cash_transactions')->insert([
                    'cash_register_id' => $register->id,
                    'type' => 'in',
                    'category' => 'initial',
                    'amount' => (float) $register->balance - $runningBalance,
                    'balance_before' => $runningBalance,
                    'balance_after' => (float) $register->balance,
                    'description' => "Boshlang'ich qoldiq / Saldo",
                    'reference_type' => null,
                    'reference_id' => null,
                    'user_id' => null,
                    'transacted_at' => $register->created_at ?? now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
    }
};
