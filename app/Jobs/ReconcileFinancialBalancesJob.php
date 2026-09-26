<?php

namespace App\Jobs;

use App\Models\CashRegister;
use App\Models\CashTransaction;
use App\Models\CashTransfer;
use App\Models\Contract;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Salary;
use App\Models\SalaryPayment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ReconcileFinancialBalancesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info('[Reconciliation] Starting midnight financial balance check...');
        $driftDetected = false;

        // 1. Reconcile Contracts finances
        $contracts = Contract::all();
        foreach ($contracts as $contract) {
            $tuitionPaid = (float) Payment::where('contract_id', $contract->id)
                ->where('payment_type', '!=', 'refund')
                ->sum('amount');
            $refunded = (float) Payment::where('contract_id', $contract->id)
                ->where('payment_type', 'refund')
                ->sum('amount');
            $expectedPaid = max(0, $tuitionPaid - $refunded);
            $final = (float) $contract->final_amount;
            $expectedDebt = max(0, $final - $expectedPaid);
            $expectedOverpaid = max(0, $expectedPaid - $final);

            if (abs((float) $contract->paid_amount - $expectedPaid) > 0.01 || abs((float) $contract->debt_amount - $expectedDebt) > 0.01) {
                Log::warning("[Reconciliation Drift] Contract #{$contract->contract_number} (ID: {$contract->id}) cached paid: {$contract->paid_amount}, expected: {$expectedPaid}. Recalculating.");
                $contract->recalculateFinances();
                $driftDetected = true;
            }
        }

        // 2. Reconcile Cash Register Balances
        $registers = CashRegister::all();
        foreach ($registers as $register) {
            // Tuition payments received (excluding refund records)
            $incomes = (float) Payment::where('cash_register_id', $register->id)
                ->where('payment_type', '!=', 'refund')
                ->sum('amount');

            // All expenses from this register (salaries, vehicle maintenance, direct expenses, and refunds are all in expenses)
            $expenses = (float) Expense::where('cash_register_id', $register->id)->sum('amount');

            // Transfers: received vs sent
            $transfersIn = (float) CashTransfer::where('to_cash_register_id', $register->id)->where('status', 'approved')->sum('amount');
            $transfersOut = (float) CashTransfer::where('from_cash_register_id', $register->id)->where('status', 'approved')->sum('amount');

            $expectedBalance = max(0, $incomes + $transfersIn - $expenses - $transfersOut);

            if (abs((float) $register->balance - $expectedBalance) > 0.01) {
                Log::warning("[Reconciliation Drift] Register #{$register->name} (ID: {$register->id}) cached: {$register->balance}, calculated: {$expectedBalance}. Updating.");
                $register->update(['balance' => $expectedBalance]);
                $driftDetected = true;
            }

            // Cross-check register balance with latest CashTransaction ledger record
            $latestTx = CashTransaction::where('cash_register_id', $register->id)->latest('id')->first();
            if ($latestTx && abs((float) $register->balance - (float) $latestTx->balance_after) > 0.01) {
                Log::warning("[Reconciliation Ledger Mismatch] Register #{$register->name} (ID: {$register->id}) balance: {$register->balance}, latest ledger balance_after: {$latestTx->balance_after}.");
                $driftDetected = true;
            }
        }

        // 3. Reconcile User Salary Balances
        $users = User::all();
        foreach ($users as $u) {
            $accrued = (float) Salary::where('user_id', $u->id)->where('is_deduction', false)->sum('amount');
            $deductions = (float) Salary::where('user_id', $u->id)->where('is_deduction', true)->sum('amount');
            $paid = (float) SalaryPayment::where('user_id', $u->id)->sum('amount');

            $expectedSalaryBalance = max(0, $accrued - $deductions - $paid);

            if (abs((float) $u->salary_balance - $expectedSalaryBalance) > 0.01) {
                Log::warning("[Reconciliation Drift] User #{$u->name} (ID: {$u->id}) cached salary_balance: {$u->salary_balance}, calculated: {$expectedSalaryBalance}. Updating.");
                $u->update(['salary_balance' => $expectedSalaryBalance]);
                $driftDetected = true;
            }
        }

        Log::info('[Reconciliation] Finished financial balance check. Drift found: '.($driftDetected ? 'YES' : 'NO'));
    }
}
