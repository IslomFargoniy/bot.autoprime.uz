<?php

use App\Models\CashRegister;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\DB;

test('the demo data has a continuous cash ledger that ends at every register balance', function () {
    $this->seed(DatabaseSeeder::class);

    foreach (CashRegister::all() as $register) {
        $ledger = DB::table('cash_transactions')->where('cash_register_id', $register->id)
            ->orderBy('transacted_at')->orderBy('id')->get();

        $running = 0.0;
        foreach ($ledger as $row) {
            expect((float) $row->balance_before)->toEqual($running);
            $running = round($running + ($row->type === 'in' ? 1 : -1) * (float) $row->amount, 2);
            expect((float) $row->balance_after)->toEqual($running);
        }

        expect($running)->toEqual((float) $register->balance);
    }
});

test('every demo staff member except the superadmin belongs to a branch', function () {
    $this->seed(DatabaseSeeder::class);

    expect(User::where('role', '!=', 'superadmin')->whereNull('branch_id')->count())->toBe(0)
        ->and(User::all()->every(fn (User $user) => $user->canSignIn()))->toBeTrue();
});
