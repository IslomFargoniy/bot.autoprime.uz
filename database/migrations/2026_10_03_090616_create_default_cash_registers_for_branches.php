<?php

use App\Models\Branch;
use App\Models\CashRegister;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Active branches that have no cash register at all (opened after the demo data was
     * seeded) could not take a payment; give each one a register per active type.
     */
    public function up(): void
    {
        Branch::where('status', 'active')
            ->whereDoesntHave('cashRegisters')
            ->get()
            ->each(fn (Branch $branch) => CashRegister::createDefaultsForBranch($branch));
    }

    public function down(): void
    {
        // Registers may hold money by now; they are never removed automatically.
    }
};
