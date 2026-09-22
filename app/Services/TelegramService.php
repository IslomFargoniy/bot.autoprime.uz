<?php

namespace App\Services;

use App\Models\Driving;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use SergiX44\Nutgram\Nutgram;
use SergiX44\Nutgram\Telegram\Types\Internal\InputFile;
use SergiX44\Nutgram\Telegram\Types\Keyboard\InlineKeyboardButton;
use SergiX44\Nutgram\Telegram\Types\Keyboard\InlineKeyboardMarkup;

class TelegramService
{
    public function __construct(protected ?Nutgram $bot = null) {}

    protected function getBot(): ?Nutgram
    {
        if ($this->bot) {
            return $this->bot;
        }

        try {
            return app(Nutgram::class);
        } catch (\Throwable $e) {
            Log::warning('TelegramService Nutgram bot instance could not be resolved: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Send notification when a driving lesson is scheduled.
     */
    public function sendDrivingCreatedNotification(Driving $driving): void
    {
        $bot = $this->getBot();
        if (! $bot) {
            return;
        }

        $driving->loadMissing(['student', 'instructor', 'autodrome']);
        $student = $driving->student;
        $instructor = $driving->instructor;
        $autodrome = $driving->autodrome;

        if (! $student || ! $student->telegram_id) {
            return;
        }

        $dateFormatted = Carbon::parse($driving->start_time)->format('d.m.Y');
        $startTime = Carbon::parse($driving->start_time)->format('H:i');
        $endTime = Carbon::parse($driving->end_time)->format('H:i');

        $text = "🚗 <b>Yangi amaliy mashg'ulot belgilandi!</b>\n\n";
        $text .= "📅 <b>Sana:</b> {$dateFormatted}\n";
        $text .= "⏰ <b>Vaqt:</b> {$startTime} - {$endTime}\n";
        if ($instructor) {
            $text .= "👨‍🏫 <b>Instruktor:</b> {$instructor->name}\n";
            if ($instructor->car_name) {
                $text .= "🚗 <b>Mashina:</b> {$instructor->car_name}\n";
            }
            if ($instructor->phone) {
                $text .= "📞 <b>Tel:</b> {$instructor->phone}\n";
            }
        }
        if ($autodrome) {
            $text .= "📍 <b>Avtodrom:</b> {$autodrome->name}\n";
        }

        $photoFile = null;
        if ($instructor && $instructor->photo_path) {
            $fullPath = storage_path('app/public/'.$instructor->photo_path);
            if (file_exists($fullPath)) {
                $photoFile = InputFile::make($fullPath);
            }
        }

        try {
            if ($photoFile) {
                $bot->sendPhoto(
                    photo: $photoFile,
                    chat_id: $student->telegram_id,
                    caption: $text,
                    parse_mode: 'HTML'
                );
            } else {
                $bot->sendMessage(
                    text: $text,
                    chat_id: $student->telegram_id,
                    parse_mode: 'HTML'
                );
            }

            if ($autodrome && $autodrome->latitude && $autodrome->longitude) {
                $bot->sendLocation(
                    latitude: (float) $autodrome->latitude,
                    longitude: (float) $autodrome->longitude,
                    chat_id: $student->telegram_id
                );
            }
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram driving created notification to student {$student->id}: ".$e->getMessage());
        }

        // Also notify instructor if assigned
        $this->sendDrivingCreatedInstructorNotification($driving);
    }

    /**
     * Send notification to instructor when a new driving lesson is scheduled.
     */
    public function sendDrivingCreatedInstructorNotification(Driving $driving): void
    {
        $bot = $this->getBot();
        if (! $bot) {
            return;
        }

        $driving->loadMissing(['student.group', 'instructor', 'autodrome']);
        $student = $driving->student;
        $instructor = $driving->instructor;
        $autodrome = $driving->autodrome;

        if (! $instructor || ! $instructor->telegram_id) {
            return;
        }

        $dateFormatted = Carbon::parse($driving->start_time)->format('d.m.Y');
        $startTime = Carbon::parse($driving->start_time)->format('H:i');
        $endTime = Carbon::parse($driving->end_time)->format('H:i');

        $text = "📝 <b>Yangi amaliy mashg'ulot biriktirildi!</b>\n\n";
        $text .= "📅 <b>Sana:</b> {$dateFormatted}\n";
        $text .= "⏰ <b>Vaqt:</b> {$startTime} - {$endTime}\n";
        if ($student) {
            $text .= "👤 <b>O'quvchi:</b> {$student->full_name}\n";
            if ($student->group) {
                $text .= "👥 <b>Guruh:</b> {$student->group->name}\n";
            }
            if ($student->phone) {
                $text .= "📞 <b>Tel:</b> {$student->phone}\n";
            }
        }
        if ($autodrome) {
            $text .= "📍 <b>Avtodrom:</b> {$autodrome->name}\n";
        }
        $text .= "\n📸 <i>Eslatma: Mashg'ulot o'tkazilganda rasm yuklashni unutmang.</i>";

        try {
            $bot->sendMessage(
                text: $text,
                chat_id: $instructor->telegram_id,
                parse_mode: 'HTML'
            );
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram driving notification to instructor {$instructor->id}: ".$e->getMessage());
        }
    }

    /**
     * Send notification & rating prompt when a driving lesson is completed.
     */
    public function sendLessonRatingPrompt(Driving $driving): void
    {
        $bot = $this->getBot();
        if (! $bot) {
            return;
        }

        $driving->loadMissing(['student', 'instructor']);
        $student = $driving->student;
        $instructor = $driving->instructor;

        if (! $student || ! $student->telegram_id) {
            return;
        }

        $text = "✅ <b>Mashg'ulotingiz yakunlandi!</b>\n\n";
        if ($instructor) {
            $text .= "👨‍🏫 <b>Instruktor:</b> {$instructor->name}\n";
            if ($instructor->phone) {
                $text .= "📞 <b>Tel:</b> {$instructor->phone}\n";
            }
            $text .= "\n";
        }
        $text .= "Iltimos, mashg'ulot sifatini baholang (1-5):";

        $keyboard = InlineKeyboardMarkup::make();
        for ($i = 1; $i <= 5; $i++) {
            $keyboard->addRow(
                InlineKeyboardButton::make(str_repeat('⭐', $i), callback_data: "rate:{$driving->id}:{$i}")
            );
        }

        try {
            $bot->sendMessage(
                text: $text,
                chat_id: $student->telegram_id,
                parse_mode: 'HTML',
                reply_markup: $keyboard
            );
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram driving rating prompt to student {$student->id}: ".$e->getMessage());
        }
    }

    /**
     * Send notification when a driving lesson time or details are updated.
     */
    public function sendDrivingUpdatedNotification(Driving $driving): void
    {
        $bot = $this->getBot();
        if (! $bot) {
            return;
        }

        $driving->loadMissing(['student', 'instructor', 'autodrome']);
        $student = $driving->student;
        $instructor = $driving->instructor;
        $autodrome = $driving->autodrome;

        if (! $student || ! $student->telegram_id) {
            return;
        }

        $dateFormatted = Carbon::parse($driving->start_time)->format('d.m.Y');
        $startTime = Carbon::parse($driving->start_time)->format('H:i');
        $endTime = Carbon::parse($driving->end_time)->format('H:i');

        $text = "⚠️ <b>Mashg'ulotingiz vaqti o'zgartirildi!</b>\n\n";
        $text .= "📅 <b>Yangi sana:</b> {$dateFormatted}\n";
        $text .= "⏰ <b>Yangi vaqt:</b> {$startTime} - {$endTime}\n";
        if ($instructor) {
            $text .= "👨‍🏫 <b>Instruktor:</b> {$instructor->name}\n";
            if ($instructor->car_name) {
                $text .= "🚗 <b>Mashina:</b> {$instructor->car_name}\n";
            }
            if ($instructor->phone) {
                $text .= "📞 <b>Tel:</b> {$instructor->phone}\n";
            }
        }
        if ($autodrome) {
            $text .= "📍 <b>Avtodrom:</b> {$autodrome->name}\n";
        }

        try {
            $bot->sendMessage(
                text: $text,
                chat_id: $student->telegram_id,
                parse_mode: 'HTML'
            );
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram driving updated notification to student {$student->id}: ".$e->getMessage());
        }
    }

    /**
     * Send notification when a driving lesson is cancelled.
     */
    public function sendDrivingCancelledNotification(Driving $driving): void
    {
        $bot = $this->getBot();
        if (! $bot) {
            return;
        }

        $driving->loadMissing(['student', 'instructor']);
        $student = $driving->student;
        $instructor = $driving->instructor;

        if (! $student || ! $student->telegram_id) {
            return;
        }

        $dateFormatted = Carbon::parse($driving->start_time)->format('d.m.Y');
        $startTime = Carbon::parse($driving->start_time)->format('H:i');
        $endTime = Carbon::parse($driving->end_time)->format('H:i');

        $text = "❌ <b>Mashg'ulotingiz bekor qilindi / o'chirildi</b>\n\n";
        $text .= "📅 <b>Sana:</b> {$dateFormatted}\n";
        $text .= "⏰ <b>Vaqt:</b> {$startTime} - {$endTime}\n";
        if ($instructor) {
            $text .= "👨‍🏫 <b>Instruktor:</b> {$instructor->name}\n";
        }

        try {
            $bot->sendMessage(
                text: $text,
                chat_id: $student->telegram_id,
                parse_mode: 'HTML'
            );
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram driving cancelled notification to student {$student->id}: ".$e->getMessage());
        }
    }

    /**
     * Send reminder notification to student 24 hours before a driving lesson.
     */
    public function sendDriving24hReminder(Driving $driving): void
    {
        $bot = $this->getBot();
        if (! $bot) {
            return;
        }

        $driving->loadMissing(['student', 'instructor', 'autodrome']);
        $student = $driving->student;
        $instructor = $driving->instructor;
        $autodrome = $driving->autodrome;

        if (! $student || ! $student->telegram_id) {
            return;
        }

        $dateFormatted = Carbon::parse($driving->start_time)->format('d.m.Y');
        $startTime = Carbon::parse($driving->start_time)->format('H:i');
        $endTime = Carbon::parse($driving->end_time)->format('H:i');

        $text = "⏰ <b>Eslatma: Ertaga amaliy mashg'ulotingiz bor!</b>\n\n";
        $text .= "📅 <b>Sana:</b> {$dateFormatted}\n";
        $text .= "⏰ <b>Vaqt:</b> {$startTime} - {$endTime}\n";
        if ($instructor) {
            $text .= "👨‍🏫 <b>Instruktor:</b> {$instructor->name}\n";
            if ($instructor->car_name) {
                $text .= "🚗 <b>Mashina:</b> {$instructor->car_name}\n";
            }
            if ($instructor->phone) {
                $text .= "📞 <b>Tel:</b> {$instructor->phone}\n";
            }
        }
        if ($autodrome) {
            $text .= "📍 <b>Avtodrom:</b> {$autodrome->name}\n";
        }
        $text .= "\n<i>Mashg'ulotga o'z vaqtida yetib kelishingizni so'raymiz!</i>";

        try {
            $bot->sendMessage(
                text: $text,
                chat_id: $student->telegram_id,
                parse_mode: 'HTML'
            );
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram 24h driving reminder to student {$student->id}: ".$e->getMessage());
        }
    }

    /**
     * Send reminder notification to student 2 hours before a driving lesson.
     */
    public function sendDriving2hReminder(Driving $driving): void
    {
        $bot = $this->getBot();
        if (! $bot) {
            return;
        }

        $driving->loadMissing(['student', 'instructor', 'autodrome']);
        $student = $driving->student;
        $instructor = $driving->instructor;
        $autodrome = $driving->autodrome;

        if (! $student || ! $student->telegram_id) {
            return;
        }

        $dateFormatted = Carbon::parse($driving->start_time)->format('d.m.Y');
        $startTime = Carbon::parse($driving->start_time)->format('H:i');
        $endTime = Carbon::parse($driving->end_time)->format('H:i');

        $text = "⏳ <b>Eslatma: 2 soatdan so'ng amaliy mashg'ulotingiz boshlanadi!</b>\n\n";
        $text .= "📅 <b>Sana:</b> {$dateFormatted}\n";
        $text .= "⏰ <b>Vaqt:</b> {$startTime} - {$endTime}\n";
        if ($instructor) {
            $text .= "👨‍🏫 <b>Instruktor:</b> {$instructor->name}\n";
            if ($instructor->car_name) {
                $text .= "🚗 <b>Mashina:</b> {$instructor->car_name}\n";
            }
            if ($instructor->phone) {
                $text .= "📞 <b>Tel:</b> {$instructor->phone}\n";
            }
        }
        if ($autodrome) {
            $text .= "📍 <b>Avtodrom:</b> {$autodrome->name}\n";
        }
        $text .= "\n<i>Iltimos, kechikmasdan keling. Xavfsiz yo'l tilaymiz!</i>";

        try {
            $bot->sendMessage(
                text: $text,
                chat_id: $student->telegram_id,
                parse_mode: 'HTML'
            );
        } catch (\Throwable $e) {
            Log::error("Failed to send Telegram 2h driving reminder to student {$student->id}: ".$e->getMessage());
        }
    }
}
