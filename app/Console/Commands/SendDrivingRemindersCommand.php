<?php

namespace App\Console\Commands;

use App\Jobs\SendDrivingReminderJob;
use App\Models\Driving;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendDrivingRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:send-driving-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send 24-hour and 2-hour reminder notifications to students for scheduled driving lessons';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = Carbon::now();

        // 1. Process 24-hour reminders (for lessons starting in 23 to 25 hours)
        $drivings24h = Driving::where('status', 'scheduled')
            ->whereHas('student', fn ($student) => $student->where('status', 'active'))
            ->whereNull('reminded_24h_at')
            ->whereBetween('start_time', [
                $now->copy()->addHours(23),
                $now->copy()->addHours(25),
            ])
            ->get();

        $count24h = 0;
        foreach ($drivings24h as $driving) {
            SendDrivingReminderJob::dispatch($driving, '24h');
            $count24h++;
        }

        // 2. Process 2-hour reminders (for lessons starting in 110 to 130 minutes)
        $drivings2h = Driving::where('status', 'scheduled')
            ->whereHas('student', fn ($student) => $student->where('status', 'active'))
            ->whereNull('reminded_2h_at')
            ->whereBetween('start_time', [
                $now->copy()->addMinutes(110),
                $now->copy()->addMinutes(130),
            ])
            ->get();

        $count2h = 0;
        foreach ($drivings2h as $driving) {
            SendDrivingReminderJob::dispatch($driving, '2h');
            $count2h++;
        }

        $this->info("Driving reminders processed. 24h dispatched: {$count24h}, 2h dispatched: {$count2h}.");

        return self::SUCCESS;
    }
}
