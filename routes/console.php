<?php

use App\Jobs\ReconcileFinancialBalancesJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('app:send-driving-reminders')
    ->everyMinute()
    ->withoutOverlapping();

Schedule::job(new ReconcileFinancialBalancesJob)
    ->dailyAt('00:00')
    ->withoutOverlapping();
