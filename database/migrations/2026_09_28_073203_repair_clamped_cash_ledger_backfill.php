<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * The 2026_09_26 ledger backfill clamped negative running balances to zero
     * (max(0, ...)), so outflows recorded before the register's opening balance
     * lost the clamped part, and its "initial" entry was computed from that
     * clamped total. The ledger then no longer summed to the real balance and
     * the nightly reconciliation copied the wrong ledger total into the register.
     *
     * For every register whose ledger chain has such gaps: add the lost amount
     * to its opening-balance entry, rebuild balance_before/after in
     * chronological order, and set the cached balance to the repaired ledger.
     */
    public function up(): void
    {
        $registerIds = DB::table('cash_transactions')->distinct()->pluck('cash_register_id');

        foreach ($registerIds as $registerId) {
            DB::transaction(fn () => $this->repairRegister((int) $registerId));
        }
    }

    private function repairRegister(int $registerId): void
    {
        DB::table('cash_registers')->where('id', $registerId)->lockForUpdate()->first();

        $rows = DB::table('cash_transactions')->where('cash_register_id', $registerId)->orderBy('id')->get();

        $lostAmount = 0.0;
        foreach ($rows as $row) {
            $expectedAfter = $row->type === 'in'
                ? (float) $row->balance_before + (float) $row->amount
                : (float) $row->balance_before - (float) $row->amount;
            $lostAmount += (float) $row->balance_after - $expectedAfter;
        }
        $lostAmount = round($lostAmount, 2);

        if (abs($lostAmount) <= 0.01) {
            return;
        }

        $opening = $rows->firstWhere('category', 'initial');
        if ($opening) {
            $newAmount = (float) $opening->amount + $lostAmount;
            DB::table('cash_transactions')->where('id', $opening->id)->update([
                'type' => $newAmount >= 0 ? 'in' : 'out',
                'amount' => abs($newAmount),
            ]);
        } else {
            $firstAt = Carbon::parse($rows->min('transacted_at'))->subSecond();
            DB::table('cash_transactions')->insert([
                'cash_register_id' => $registerId,
                'type' => $lostAmount >= 0 ? 'in' : 'out',
                'category' => 'initial',
                'amount' => abs($lostAmount),
                'balance_before' => 0,
                'balance_after' => 0,
                'description' => "Boshlang'ich qoldiq / Saldo (tarixni tiklash tuzatishi)",
                'transacted_at' => $firstAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $running = 0.0;
        $ordered = DB::table('cash_transactions')->where('cash_register_id', $registerId)
            ->orderBy('transacted_at')->orderBy('id')->get();
        foreach ($ordered as $row) {
            $before = $running;
            $running = round($running + ($row->type === 'in' ? 1 : -1) * (float) $row->amount, 2);
            DB::table('cash_transactions')->where('id', $row->id)->update([
                'balance_before' => $before,
                'balance_after' => $running,
            ]);
        }

        $cached = DB::table('cash_registers')->where('id', $registerId)->value('balance');
        DB::table('cash_registers')->where('id', $registerId)->update(['balance' => $running]);

        Log::info("[Ledger repair] Register #{$registerId}: restored {$lostAmount} lost by the backfill clamp; balance {$cached} -> {$running}.");
    }

    public function down(): void
    {
        // Data repair; the previous (inconsistent) values are not restored.
    }
};
