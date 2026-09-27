<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('current_desktop_session_id')->nullable()->after('status');
            $table->string('current_desktop_device_uuid')->nullable()->after('current_desktop_session_id');
            $table->string('desktop_auth_token', 64)->nullable()->after('current_desktop_device_uuid');
            $table->timestamp('desktop_token_expires_at')->nullable()->after('desktop_auth_token');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'current_desktop_session_id',
                'current_desktop_device_uuid',
                'desktop_auth_token',
                'desktop_token_expires_at',
            ]);
        });
    }
};
