<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Give every expense a document number, like payments already have.
     */
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('receipt_number', 100)->nullable()->unique()->after('id');
        });

        // Existing rows get EXP-OLD-{id} so they can never collide with the
        // EXP-{Ymd}-{seq} numbers handed out from now on.
        DB::table('expenses')->whereNull('receipt_number')->orderBy('id')->each(function (object $expense): void {
            DB::table('expenses')->where('id', $expense->id)->update([
                'receipt_number' => 'EXP-OLD-'.str_pad((string) $expense->id, 5, '0', STR_PAD_LEFT),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropUnique(['receipt_number']);
            $table->dropColumn('receipt_number');
        });
    }
};
