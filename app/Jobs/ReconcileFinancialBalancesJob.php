<?php

namespace App\Jobs;

use App\Models\CashRegister;
use App\Models\Contract;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReconcileFinancialBalancesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Check every cached balance from its source records, using exactly the
     * same rules as the live code:
     *  - contract paid/debt: tuition payments minus refunds
     *  - cash register balance: compared with the cash_transactions ledger
     *    (in - out) and only reported, never overwritten
     *  - salary balance: accruals - deductions - payouts (no clamping)
     * Each correction runs under a row lock and is logged as drift.
     */
    public function handle(): void
    {
        Log::info('[Reconciliation] Starting midnight financial balance check...');

        $driftCount = $this->reconcileContracts()
            + $this->reconcileCashRegisters()
            + $this->reconcileSalaryBalances();

        Log::info("[Reconciliation] Finished financial balance check. Drift corrections: {$driftCount}");
    }

    private function reconcileContracts(): int
    {
        $driftCount = 0;

        Contract::query()
            ->withSum(['payments as tuition_sum' => fn ($q) => $q->where('payment_type', '!=', 'refund')], 'amount')
            ->withSum(['payments as refund_sum' => fn ($q) => $q->where('payment_type', 'refund')], 'amount')
            ->chunkById(200, function ($contracts) use (&$driftCount) {
                foreach ($contracts as $contract) {
                    $expectedPaid = max(0, (float) $contract->getAttribute('tuition_sum') - (float) $contract->getAttribute('refund_sum'));

                    if (abs((float) $contract->paid_amount - $expectedPaid) <= 0.01) {
                        continue;
                    }

                    Log::warning("[Reconciliation Drift] Contract #{$contract->contract_number} (ID: {$contract->id}) cached paid: {$contract->paid_amount}, expected: {$expectedPaid}. Recalculating.");

                    DB::transaction(function () use ($contract) {
                        Contract::whereKey($contract->id)->lockForUpdate()->first()?->recalculateFinances();
                    });
                    $driftCount++;
                }
            });

        return $driftCount;
    }

    private function reconcileCashRegisters(): int
    {
        $driftCount = 0;

        CashRegister::query()->chunkById(200, function ($registers) use (&$driftCount) {
            $registerIds = $registers->pluck('id')->all();
            $ledgerTotals = DB::table('cash_transactions')
                ->whereIn('cash_register_id', $registerIds)
                ->selectRaw("cash_register_id, COUNT(*) as entries, COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as total_in, COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as total_out")
                ->groupBy('cash_register_id')
                ->get()
                ->keyBy('cash_register_id');

            foreach ($registers as $register) {
                $totals = $ledgerTotals->get($register->id);
                if (! $totals || (int) $totals->entries === 0) {
                    continue;
                }

                $expectedBalance = round((float) $totals->total_in - (float) $totals->total_out, 2);
                if (abs((float) $register->balance - $expectedBalance) <= 0.01) {
                    continue;
                }

                // Cash balances are only reported, never overwritten: every live
                // operation updates the balance and the ledger atomically, so a
                // mismatch means the ledger itself is incomplete or wrong (e.g. a
                // bad backfill) and blindly copying it would corrupt real money.
                Log::warning("[Reconciliation Drift] Register {$register->name} (ID: {$register->id}) cached: {$register->balance}, ledger: {$expectedBalance}. Needs manual review; balance left unchanged.");
                $driftCount++;
            }
        });

        return $driftCount;
    }

    private function reconcileSalaryBalances(): int
    {
        $driftCount = 0;

        User::query()
            ->withSum(['salaries as accrued_sum' => fn ($q) => $q->where('is_deduction', false)], 'amount')
            ->withSum(['salaries as deduction_sum' => fn ($q) => $q->where('is_deduction', true)], 'amount')
            ->withSum('salaryPayments as paid_sum', 'amount')
            ->chunkById(200, function ($users) use (&$driftCount) {
                foreach ($users as $user) {
                    $expected = round((float) $user->getAttribute('accrued_sum') - (float) $user->getAttribute('deduction_sum') - (float) $user->getAttribute('paid_sum'), 2);

                    if (abs((float) $user->salary_balance - $expected) <= 0.01) {
                        continue;
                    }

                    $driftCount += (int) DB::transaction(function () use ($user) {
                        $locked = User::whereKey($user->id)->lockForUpdate()->first();
                        if (! $locked) {
                            return false;
                        }

                        // Recompute under the lock so a payout committed meanwhile is included.
                        $expected = round(
                            (float) $locked->salaries()->where('is_deduction', false)->sum('amount')
                            - (float) $locked->salaries()->where('is_deduction', true)->sum('amount')
                            - (float) $locked->salaryPayments()->sum('amount'),
                            2
                        );

                        if (abs((float) $locked->salary_balance - $expected) <= 0.01) {
                            return false;
                        }

                        Log::warning("[Reconciliation Drift] User {$locked->name} (ID: {$locked->id}) cached salary_balance: {$locked->salary_balance}, expected: {$expected}. Updating.");
                        User::whereKey($locked->id)->update(['salary_balance' => $expected]);

                        return true;
                    });
                }
            });

        return $driftCount;
    }
}
