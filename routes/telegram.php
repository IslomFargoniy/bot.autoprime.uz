<?php

/** @var Nutgram $bot */

use App\Models\Driving;
use App\Models\Review;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use SergiX44\Nutgram\Nutgram;
use SergiX44\Nutgram\Telegram\Types\Keyboard\InlineKeyboardButton;
use SergiX44\Nutgram\Telegram\Types\Keyboard\InlineKeyboardMarkup;
use SergiX44\Nutgram\Telegram\Types\Keyboard\KeyboardButton;
use SergiX44\Nutgram\Telegram\Types\Keyboard\ReplyKeyboardMarkup;
use SergiX44\Nutgram\Telegram\Types\Keyboard\ReplyKeyboardRemove;
use SergiX44\Nutgram\Telegram\Types\WebApp\WebAppInfo;

/*
|--------------------------------------------------------------------------
| Nutgram Handlers
|--------------------------------------------------------------------------
|
| Here is where you can register telegram handlers for Nutgram. These
| handlers are loaded by the NutgramServiceProvider. Enjoy!
|
*/

$bot->onCommand('start', function (Nutgram $bot) {
    $telegramId = $bot->userId();
    $user = User::where('telegram_id', $telegramId)->first();
    $student = Student::where('telegram_id', $telegramId)->first();

    if ($user) {
        $roleTitle = $user->role === 'instructor' ? '👨‍🏫 Instruktor' : '👑 Admin';
        $appUrl = config('app.url');
        if (! str_starts_with($appUrl, 'https://')) {
            $appUrl = preg_replace('/^http:/i', 'https:', $appUrl);
        }

        $keyboard = InlineKeyboardMarkup::make()
            ->addRow(InlineKeyboardButton::make(
                '🚀 Mini App ni ochish',
                web_app: new WebAppInfo($appUrl)
            ));

        $msg = "📌 <b>Tizimga kirildi: {$roleTitle}</b>\n\nAssalomu alaykum, <b>{$user->name}</b>! AutoPrime tizimiga xush kelibsiz.";

        try {
            $bot->sendMessage($msg, parse_mode: 'HTML', reply_markup: $keyboard);
        } catch (Exception $e) {
            $bot->sendMessage("{$msg}\n\n⚠️ Diqqat: Telegram Mini App faqat haqiqiy (public) HTTPS domenlar bilan ishlaydi. APP_URL ni to'g'rilang.", parse_mode: 'HTML');
        }

        return;
    }

    if ($student) {
        $roleTitle = "🎓 O'quvchi";
        $msg = "📌 <b>Tizimga kirildi: {$roleTitle}</b>\n\nAssalomu alaykum, <b>{$student->full_name}</b>! AutoPrime o'quvchi botiga xush kelibsiz.";

        $bot->sendMessage($msg, parse_mode: 'HTML');

        return;
    }

    $keyboard = ReplyKeyboardMarkup::make(resize_keyboard: true)
        ->addRow(
            KeyboardButton::make('📱 Telefon raqamni yuborish', request_contact: true)
        );

    $bot->sendMessage(
        text: 'Assalomu alaykum! Tizimga kirish uchun pastdagi tugma orqali telefon raqamingizni yuboring:',
        reply_markup: $keyboard
    );
})->description('Botni ishga tushirish');

if (! function_exists('getDrivingsKeyboard')) {
    function getDrivingsKeyboard(string $activeStatus): InlineKeyboardMarkup
    {
        $keyboard = InlineKeyboardMarkup::make();
        $scheduledLabel = $activeStatus === 'scheduled' ? '⏳ Rejadagi (tanlangan)' : '⏳ Rejadagi';
        $completedLabel = $activeStatus === 'completed' ? '✅ Yakunlangan (tanlangan)' : '✅ Yakunlangan';

        $keyboard->addRow(
            InlineKeyboardButton::make($scheduledLabel, callback_data: 'drivings:scheduled'),
            InlineKeyboardButton::make($completedLabel, callback_data: 'drivings:completed')
        );

        return $keyboard;
    }
}

if (! function_exists('buildDrivingsMessage')) {
    function buildDrivingsMessage(int $telegramId, string $status): string
    {
        $user = User::where('telegram_id', $telegramId)->first();
        $student = Student::where('telegram_id', $telegramId)->first();

        if (! $user && ! $student) {
            return "⚠️ Siz avtorizatsiyadan o'tmagansiz. Iltimos, /start bosing va telefon raqamingizni yuboring.";
        }

        $text = '';

        if ($user) {
            if ($user->role === 'instructor') {
                $text .= "👨‍🏫 <b>Instruktor: {$user->name}</b>\n\n";

                if ($status === 'scheduled') {
                    $scheduled = Driving::with(['student', 'autodrome'])
                        ->where('instructor_id', $user->id)
                        ->where('status', 'scheduled')
                        ->orderBy('start_time', 'asc')
                        ->take(15)
                        ->get();

                    $text .= "⏳ <b>REJALASHTIRILGAN MASHG'ULOTLAR:</b>\n\n";
                    if ($scheduled->isEmpty()) {
                        $text .= "<i>Hozircha rejalashtirilgan mashg'ulotlar yo'q.</i>";
                    } else {
                        foreach ($scheduled as $index => $d) {
                            $num = $index + 1;
                            $date = Carbon::parse($d->start_time)->format('d.m.Y');
                            $time = Carbon::parse($d->start_time)->format('H:i').' - '.Carbon::parse($d->end_time)->format('H:i');
                            $studentName = $d->student ? $d->student->full_name : 'O\'quvchi';
                            $studentPhone = ($d->student && $d->student->phone) ? " ({$d->student->phone})" : '';
                            $autodromeName = $d->autodrome ? " | 📍 {$d->autodrome->name}" : '';
                            $text .= "{$num}. 📅 <b>{$date}</b> ({$time})\n   👤 {$studentName}{$studentPhone}{$autodromeName}\n\n";
                        }
                    }
                } else {
                    $completed = Driving::with(['student', 'review'])
                        ->where('instructor_id', $user->id)
                        ->where('status', 'completed')
                        ->orderBy('start_time', 'desc')
                        ->take(15)
                        ->get();

                    $text .= "✅ <b>YAKUNLANGAN MASHG'ULOTLAR:</b>\n\n";
                    if ($completed->isEmpty()) {
                        $text .= "<i>Hozircha yakunlangan mashg'ulotlar yo'q.</i>";
                    } else {
                        foreach ($completed as $index => $d) {
                            $num = $index + 1;
                            $date = Carbon::parse($d->start_time)->format('d.m.Y');
                            $time = Carbon::parse($d->start_time)->format('H:i');
                            $studentName = $d->student ? $d->student->full_name : 'O\'quvchi';
                            $rating = $d->review ? " ⭐ {$d->review->rating}/5" : '';
                            $text .= "{$num}. 📅 <b>{$date}</b> {$time} — 👤 {$studentName}{$rating}\n";
                        }
                    }
                }
            } else {
                // Admin
                $text .= "👑 <b>Admin Paneli — Mashg'ulotlar Holati</b>\n\n";

                if ($status === 'scheduled') {
                    $scheduled = Driving::with(['instructor', 'student', 'autodrome'])
                        ->where('status', 'scheduled')
                        ->orderBy('start_time', 'asc')
                        ->take(15)
                        ->get();

                    $text .= "⏳ <b>REJALASHTIRILGAN MASHG'ULOTLAR:</b>\n\n";
                    if ($scheduled->isEmpty()) {
                        $text .= "<i>Kutilayotgan mashg'ulotlar yo'q.</i>";
                    } else {
                        foreach ($scheduled as $index => $d) {
                            $num = $index + 1;
                            $date = Carbon::parse($d->start_time)->format('d.m.Y H:i');
                            $instructorName = $d->instructor ? $d->instructor->name : 'Instruktor';
                            $studentName = $d->student ? $d->student->full_name : 'O\'quvchi';
                            $text .= "{$num}. 📅 <b>{$date}</b> | 👨‍🏫 {$instructorName} ➔ 👤 {$studentName}\n";
                        }
                    }
                } else {
                    $completed = Driving::with(['instructor', 'student', 'review'])
                        ->where('status', 'completed')
                        ->orderBy('start_time', 'desc')
                        ->take(15)
                        ->get();

                    $text .= "✅ <b>YAKUNLANGAN MASHG'ULOTLAR:</b>\n\n";
                    if ($completed->isEmpty()) {
                        $text .= "<i>Yakunlangan mashg'ulotlar yo'q.</i>";
                    } else {
                        foreach ($completed as $index => $d) {
                            $num = $index + 1;
                            $date = Carbon::parse($d->start_time)->format('d.m.Y H:i');
                            $instructorName = $d->instructor ? $d->instructor->name : 'Instruktor';
                            $studentName = $d->student ? $d->student->full_name : 'O\'quvchi';
                            $rating = $d->review ? " ⭐ {$d->review->rating}" : '';
                            $text .= "{$num}. 📅 <b>{$date}</b> | 👨‍🏫 {$instructorName} ➔ 👤 {$studentName}{$rating}\n";
                        }
                    }
                }
            }
        } elseif ($student) {
            $text .= "🎓 <b>O'quvchi: {$student->full_name}</b>\n\n";

            if ($status === 'scheduled') {
                $scheduled = Driving::with(['instructor', 'autodrome'])
                    ->where('student_id', $student->id)
                    ->where('status', 'scheduled')
                    ->orderBy('start_time', 'asc')
                    ->take(15)
                    ->get();

                $text .= "⏳ <b>REJALASHTIRILGAN MASHG'ULOTLARINGIZ:</b>\n\n";
                if ($scheduled->isEmpty()) {
                    $text .= "<i>Hozircha sizga belgilangan mashg'ulotlar yo'q.</i>";
                } else {
                    foreach ($scheduled as $index => $d) {
                        $num = $index + 1;
                        $date = Carbon::parse($d->start_time)->format('d.m.Y');
                        $time = Carbon::parse($d->start_time)->format('H:i').' - '.Carbon::parse($d->end_time)->format('H:i');
                        $instructorName = $d->instructor ? $d->instructor->name : 'Instruktor';
                        $instructorPhone = ($d->instructor && $d->instructor->phone) ? " (📞 {$d->instructor->phone})" : '';
                        $autodromeName = $d->autodrome ? " | 📍 {$d->autodrome->name}" : '';
                        $text .= "{$num}. 📅 <b>{$date}</b> ({$time})\n   👨‍🏫 {$instructorName}{$instructorPhone}{$autodromeName}\n\n";
                    }
                }
            } else {
                $completed = Driving::with(['instructor', 'review'])
                    ->where('student_id', $student->id)
                    ->where('status', 'completed')
                    ->orderBy('start_time', 'desc')
                    ->take(15)
                    ->get();

                $text .= "✅ <b>YAKUNLANGAN MASHG'ULOTLARINGIZ:</b>\n\n";
                if ($completed->isEmpty()) {
                    $text .= "<i>Hozircha yakunlangan mashg'ulotlaringiz yo'q.</i>";
                } else {
                    foreach ($completed as $index => $d) {
                        $num = $index + 1;
                        $date = Carbon::parse($d->start_time)->format('d.m.Y');
                        $time = Carbon::parse($d->start_time)->format('H:i');
                        $instructorName = $d->instructor ? $d->instructor->name : 'Instruktor';
                        $rating = $d->review ? " ⭐ {$d->review->rating}/5" : '';
                        $text .= "{$num}. 📅 <b>{$date}</b> {$time} — 👨‍🏫 {$instructorName}{$rating}\n";
                    }
                }
            }
        }

        return $text;
    }
}

$bot->onCommand('drivings', function (Nutgram $bot) {
    $telegramId = $bot->userId();
    $user = User::where('telegram_id', $telegramId)->first();
    $student = Student::where('telegram_id', $telegramId)->first();

    if (! $user && ! $student) {
        $bot->sendMessage("⚠️ Siz avtorizatsiyadan o'tmagansiz. Iltimos, /start bosing va telefon raqamingizni yuboring.");

        return;
    }

    $keyboard = InlineKeyboardMarkup::make()
        ->addRow(
            InlineKeyboardButton::make('⏳ Rejadagi', callback_data: 'drivings:scheduled'),
            InlineKeyboardButton::make('✅ Yakunlangan', callback_data: 'drivings:completed')
        );

    $bot->sendMessage("🚗 <b>Mashg'ulotlar bo'limi</b>\n\nIltimos, pastdagi tugmalar orqali ko'rmoqchi bo'lgan mashg'ulotlar ro'yxatini tanlang:", parse_mode: 'HTML', reply_markup: $keyboard);
})->description('Mashg\'ulotlar ro\'yxati (Rejadagi va yakunlangan)');

$bot->onCallbackQueryData('drivings:{status}', function (Nutgram $bot, $status) {
    $text = buildDrivingsMessage($bot->userId(), $status);
    $keyboard = getDrivingsKeyboard($status);

    try {
        $bot->editMessageText($text, parse_mode: 'HTML', reply_markup: $keyboard);
    } catch (Throwable $e) {
    }

    $bot->answerCallbackQuery();
});

$bot->onContact(function (Nutgram $bot) {
    $contact = $bot->message()->contact;

    if ($contact->user_id !== $bot->userId()) {
        $bot->sendMessage("Iltimos, faqat o'zingizning telefon raqamingizni pastdagi tugma orqali yuboring.");

        return;
    }

    $telegramId = $bot->userId();
    $phone = $contact->phone_number;

    // Normalize phone (sometimes Telegram returns with or without +)
    if (! str_starts_with($phone, '+')) {
        $phone = '+'.$phone;
    }

    $cleanPhone = str_replace('+', '', $phone);

    $user = User::where('phone', $phone)->orWhere('phone', $cleanPhone)->first();
    if ($user) {
        $user->update(['telegram_id' => $telegramId]);
        $roleTitle = $user->role === 'instructor' ? '👨‍🏫 Instruktor' : '👑 Admin';

        $bot->sendMessage(
            "✅ Muvaffaqiyatli avtorizatsiyadan o'tdingiz!\n\n👤 <b>Ismingiz:</b> {$user->name}\n📌 <b>Siz tizimga <u>{$roleTitle}</u> sifatida kirdingiz.</b>",
            parse_mode: 'HTML',
            reply_markup: ReplyKeyboardRemove::make(true)
        );

        $appUrl = config('app.url');
        if (! str_starts_with($appUrl, 'https://')) {
            $appUrl = preg_replace('/^http:/i', 'https:', $appUrl);
        }

        $keyboard = InlineKeyboardMarkup::make()
            ->addRow(InlineKeyboardButton::make(
                '🚀 Mini App ni ochish',
                web_app: new WebAppInfo($appUrl)
            ));

        try {
            $bot->sendMessage('Mini ilovaga kirish uchun quyidagi tugmani bosing:', reply_markup: $keyboard);
        } catch (Exception $e) {
            $bot->sendMessage('⚠️ Diqqat: Telegram Mini App faqat haqiqiy (public) HTTPS domenlar bilan ishlaydi.');
        }

        return;
    }

    $student = Student::where('phone', $phone)->orWhere('phone', $cleanPhone)->first();

    if ($student) {
        $student->update(['telegram_id' => $telegramId]);
        $roleTitle = "🎓 O'quvchi";

        $bot->sendMessage(
            "✅ Muvaffaqiyatli avtorizatsiyadan o'tdingiz!\n\n👤 <b>Ismingiz:</b> {$student->full_name}\n📌 <b>Siz tizimga <u>{$roleTitle}</u> sifatida kirdingiz.</b>",
            parse_mode: 'HTML',
            reply_markup: ReplyKeyboardRemove::make(true)
        );
    } else {
        $bot->sendMessage("Kechirasiz, tizimda ushbu raqam bilan o'quvchi yoki xodim topilmadi.");
    }
});

// Handle callback queries for rating: rate:{driving_id}:{rating}
if (! function_exists('getAvailableRatingTags')) {
    function getAvailableRatingTags(int $rating): array
    {
        return $rating >= 4
            ? ['🧠 Zargona tushuntirdi', '✨ Xushmuomala', '🧼 Mashina toza', '⏰ Vaqtida boshladi']
            : ['⏰ Kechikdi', '🗣 Muomala yomon', '🚗 Mashina nosoz', '⏳ Vaqtidan kam o\'tildi'];
    }
}

if (! function_exists('buildTagKeyboard')) {
    function buildTagKeyboard(int $drivingId, int $rating, array $selectedIndices = []): InlineKeyboardMarkup
    {
        $keyboard = InlineKeyboardMarkup::make();
        $tags = getAvailableRatingTags($rating);

        foreach ($tags as $index => $tag) {
            $isSelected = in_array($index, $selectedIndices, true);
            $prefix = $isSelected ? '☑️ ' : '⬜ ';
            $keyboard->addRow(
                InlineKeyboardButton::make(
                    $prefix.$tag,
                    callback_data: "tag_toggle:{$drivingId}:{$rating}:{$index}"
                )
            );
        }

        $keyboard->addRow(
            InlineKeyboardButton::make(
                '✅ Yuborish',
                callback_data: "submit_rate:{$drivingId}:{$rating}"
            )
        );

        return $keyboard;
    }
}

$bot->onCallbackQueryData('rate:{driving_id}:{rating}', function (Nutgram $bot, $driving_id, $rating) {
    $driving = Driving::find($driving_id);
    if (! $driving) {
        $bot->answerCallbackQuery(text: "Mashg'ulot topilmadi.");

        return;
    }

    if ($driving->student && $driving->student->telegram_id != $bot->userId()) {
        $bot->answerCallbackQuery(text: "Bu sizning mashg'ulotingiz emas.");

        return;
    }

    $rating = (int) $rating;
    $cacheKey = "driving_review_{$driving_id}";
    Cache::put($cacheKey, ['rating' => $rating, 'selected' => []], now()->addHours(2));

    $keyboard = buildTagKeyboard((int) $driving_id, $rating, []);
    $bot->editMessageText(
        "Sizning bahoingiz: {$rating} ⭐\nIltimos, qo'shimcha sabablarni tanlang (bir nechta tanlash mumkin):",
        reply_markup: $keyboard
    );
    $bot->answerCallbackQuery();
});

$bot->onCallbackQueryData('tag_toggle:{driving_id}:{rating}:{tag_index}', function (Nutgram $bot, $driving_id, $rating, $tag_index) {
    $driving = Driving::find($driving_id);
    if (! $driving) {
        $bot->answerCallbackQuery(text: "Mashg'ulot topilmadi.");

        return;
    }

    if ($driving->student && $driving->student->telegram_id != $bot->userId()) {
        $bot->answerCallbackQuery(text: "Bu sizning mashg'ulotingiz emas.");

        return;
    }

    $rating = (int) $rating;
    $tagIndex = (int) $tag_index;
    $cacheKey = "driving_review_{$driving_id}";
    $data = Cache::get($cacheKey, ['rating' => $rating, 'selected' => []]);

    $selected = $data['selected'] ?? [];
    if (in_array($tagIndex, $selected, true)) {
        $selected = array_values(array_filter($selected, fn ($i) => $i !== $tagIndex));
    } else {
        $selected[] = $tagIndex;
    }

    $data['selected'] = $selected;
    Cache::put($cacheKey, $data, now()->addHours(2));

    $keyboard = buildTagKeyboard((int) $driving_id, $rating, $selected);
    $bot->editMessageText(
        "Sizning bahoingiz: {$rating} ⭐\nIltimos, qo'shimcha sabablarni tanlang (bir nechta tanlash mumkin):",
        reply_markup: $keyboard
    );
    $bot->answerCallbackQuery();
});

use SergiX44\Nutgram\Telegram\Properties\MessageType;

$bot->onCallbackQueryData('submit_rate:{driving_id}:{rating}', function (Nutgram $bot, $driving_id, $rating) {
    $driving = Driving::find($driving_id);
    if (! $driving) {
        $bot->answerCallbackQuery(text: "Mashg'ulot topilmadi.");

        return;
    }

    if ($driving->student && $driving->student->telegram_id != $bot->userId()) {
        $bot->answerCallbackQuery(text: "Bu sizning mashg'ulotingiz emas.");

        return;
    }

    $rating = (int) $rating;
    $cacheKey = "driving_review_{$driving_id}";
    $data = Cache::get($cacheKey, ['rating' => $rating, 'selected' => []]);
    $selectedIndices = $data['selected'] ?? [];

    $allTags = getAvailableRatingTags($rating);
    $selectedTags = [];
    foreach ($selectedIndices as $idx) {
        if (isset($allTags[$idx])) {
            $selectedTags[] = $allTags[$idx];
        }
    }

    Review::updateOrCreate(
        ['driving_id' => $driving->id],
        [
            'rating' => $rating,
            'reason_tags' => $selectedTags,
        ]
    );

    Cache::forget($cacheKey);
    $messageId = $bot->message()?->message_id;
    Cache::put("awaiting_review_comment_{$bot->userId()}", [
        'driving_id' => $driving->id,
        'message_id' => $messageId,
    ], now()->addMinutes(30));

    $tagsText = ! empty($selectedTags) ? "\n📝 Sabablar: ".implode(', ', $selectedTags) : '';

    $keyboard = InlineKeyboardMarkup::make()->addRow(
        InlineKeyboardButton::make("⏩ O'tkazib yuborish", callback_data: "skip_comment:{$driving->id}")
    );

    $bot->editMessageText(
        "⭐ Bahoingiz: {$rating} yulduz{$tagsText}\n\n✅ Bahoingiz saqlandi!\n\n💬 <b>Iltimos, qo'shimcha fikr yoki izohingiz bo'lsa yozib qoldiring (matn shaklida):</b>\n\n<i>(Agar izohingiz bo'lmasa, 'O'tkazib yuborish' tugmasini bosing)</i>",
        parse_mode: 'HTML',
        reply_markup: $keyboard
    );
    $bot->answerCallbackQuery(text: 'Bahoingiz saqlandi!');
});

$bot->onCallbackQueryData('skip_comment:{driving_id}', function (Nutgram $bot, $driving_id) {
    Cache::forget("awaiting_review_comment_{$bot->userId()}");

    $driving = Driving::with('review')->find($driving_id);
    $rating = ($driving && $driving->review) ? $driving->review->rating : 5;
    $selectedTags = ($driving && $driving->review && ! empty($driving->review->reason_tags)) ? $driving->review->reason_tags : [];
    $tagsText = ! empty($selectedTags) ? "\n📝 Sabablar: ".implode(', ', $selectedTags) : '';

    $bot->editMessageText("⭐ Bahoingiz: {$rating} yulduz{$tagsText}\n\n✅ Rahmat! Bahoingiz va fikringiz qabul qilindi.");
    $bot->answerCallbackQuery(text: 'Rahmat!');
});

$bot->onMessageType(MessageType::TEXT, function (Nutgram $bot) {
    $text = trim($bot->message()->text ?? '');

    if (str_starts_with($text, '/')) {
        return;
    }

    $userId = $bot->userId();
    $cacheKey = "awaiting_review_comment_{$userId}";
    $cacheData = Cache::get($cacheKey);

    if ($cacheData) {
        $drivingId = is_array($cacheData) ? ($cacheData['driving_id'] ?? null) : $cacheData;
        $messageId = is_array($cacheData) ? ($cacheData['message_id'] ?? null) : null;

        if ($drivingId) {
            $driving = Driving::with('review')->find($drivingId);
            if ($driving && $driving->review) {
                $driving->review->update([
                    'comment' => $text,
                ]);

                $rating = $driving->review->rating ?? 5;
                $selectedTags = $driving->review->reason_tags ?? [];
                $tagsText = ! empty($selectedTags) ? "\n📝 Sabablar: ".implode(', ', $selectedTags) : '';

                if ($messageId) {
                    try {
                        $bot->editMessageText(
                            "⭐ Bahoingiz: {$rating} yulduz{$tagsText}\n💬 Izoh: ".htmlspecialchars($text)."\n\n✅ Rahmat! Bahoingiz va fikringiz qabul qilindi.",
                            chat_id: $userId,
                            message_id: $messageId,
                            parse_mode: 'HTML'
                        );
                    } catch (Throwable $e) {
                        // Ignore if message cannot be edited
                    }
                }
            }
        }
        Cache::forget($cacheKey);

        $bot->sendMessage('✅ Fikringiz uchun rahmat! Izohingiz saqlandi.');
    }
});
