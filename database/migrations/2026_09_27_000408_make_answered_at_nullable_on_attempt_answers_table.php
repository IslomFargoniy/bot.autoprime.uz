<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mock exam questions are recorded as unanswered rows when the exam is
     * served, so the server knows exactly which questions to grade on submit.
     */
    public function up(): void
    {
        Schema::table('attempt_answers', function (Blueprint $table) {
            $table->timestamp('answered_at')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('attempt_answers', function (Blueprint $table) {
            $table->timestamp('answered_at')->nullable(false)->change();
        });
    }
};
