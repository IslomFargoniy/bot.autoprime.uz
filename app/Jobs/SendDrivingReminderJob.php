<?php

namespace App\Jobs;

use App\Models\Driving;
use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendDrivingReminderJob implements ShouldBeUnique, ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 5;

    /**
     * Seconds the uniqueness lock is held (covers the reminder window).
     */
    public int $uniqueFor = 900;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Driving $driving,
        public string $type // '24h' or '2h'
    ) {}

    /**
     * Execute the job.
     */
    public function handle(TelegramService $telegramService): void
    {
        $column = match ($this->type) {
            '24h' => 'reminded_24h_at',
            '2h' => 'reminded_2h_at',
            default => null,
        };

        if (! $column) {
            return;
        }

        // Claim the reminder atomically: only one worker can flip the column from
        // NULL, so concurrent or duplicated jobs never send the same reminder twice.
        $claimed = Driving::whereKey($this->driving->id)
            ->where('status', 'scheduled')
            ->whereNull($column)
            ->update([$column => now()]);

        if ($claimed === 0) {
            return;
        }

        $this->driving->refresh();

        try {
            $this->type === '24h'
                ? $telegramService->sendDriving24hReminder($this->driving)
                : $telegramService->sendDriving2hReminder($this->driving);
        } catch (Throwable $e) {
            // Release the claim so the retry can send it.
            Driving::whereKey($this->driving->id)->update([$column => null]);

            throw $e;
        }
    }

    /**
     * The command runs every minute while a lesson stays in the reminder window;
     * keep only one pending job per driving and reminder type.
     */
    public function uniqueId(): string
    {
        return "{$this->driving->id}:{$this->type}";
    }
}
