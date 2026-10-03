<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Lead;
use App\Models\User;
use App\Support\Phone;
use App\Support\Pinfl;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use SergiX44\Nutgram\Nutgram;
use SergiX44\Nutgram\Telegram\Types\Keyboard\InlineKeyboardButton;
use SergiX44\Nutgram\Telegram\Types\Keyboard\InlineKeyboardMarkup;
use SergiX44\Nutgram\Telegram\Types\Keyboard\KeyboardButton;
use SergiX44\Nutgram\Telegram\Types\Keyboard\ReplyKeyboardMarkup;
use SergiX44\Nutgram\Telegram\Types\Keyboard\ReplyKeyboardRemove;

class LeadWizardService
{
    protected const CACHE_PREFIX = 'lead_wizard:';

    protected const TTL = 3600; // 1 hour

    protected const CATEGORIES = ['A', 'B', 'C', 'BC'];

    protected const TIME_LABELS = [
        'morning' => 'Ertalabki (09:00 - 11:00)',
        'daytime' => 'Kunduzgi (14:00 - 16:00)',
        'evening' => 'Kechki (18:30 - 20:30)',
    ];

    /**
     * Wizard step each "skip" button is allowed to skip.
     */
    protected const SKIPPABLE_STEPS = [
        'passport' => 'passport_photo',
        'photo' => 'photo',
        'birth_date_address' => 'birth_date_address',
        'pinfl' => 'pinfl',
    ];

    /**
     * Load the wizard state only when the user is at the expected step, so
     * forged or stale callback buttons cannot jump over required steps.
     *
     * @return array<string, mixed>|null
     */
    protected function stateAtStep(int|string $telegramId, string $expectedStep): ?array
    {
        $state = Cache::get(self::CACHE_PREFIX.$telegramId);

        return ($state['step'] ?? null) === $expectedStep ? $state : null;
    }

    /**
     * Normalize a phone number to +<digits>, or null when it is not plausible.
     */
    protected function normalizePhone(string $phone): ?string
    {
        $normalized = Phone::normalize($phone);

        return Phone::isValid($normalized) ? $normalized : null;
    }

    /**
     * Start the lead onboarding wizard.
     */
    public function start(Nutgram $bot): void
    {
        $telegramId = $bot->userId();
        Cache::put(self::CACHE_PREFIX.$telegramId, [
            'step' => 'fio',
            'telegram_id' => $telegramId,
        ], self::TTL);

        $bot->sendMessage(
            "🎓 <b>AutoPrime Avtomaktabiga Qabul Anketasi</b>\n\nIltimos, to'liq familiyangiz, ismingiz va sharifingizni kiriting:\n<i>(Masalan: Karimova Dilnoza Botir qizi)</i>",
            parse_mode: 'HTML',
            reply_markup: ReplyKeyboardRemove::make(true)
        );
    }

    /**
     * Check if user is currently in wizard.
     */
    public function isInWizard(int $telegramId): bool
    {
        return Cache::has(self::CACHE_PREFIX.$telegramId);
    }

    /**
     * Cancel/clear wizard state.
     */
    public function cancel(int $telegramId): void
    {
        Cache::forget(self::CACHE_PREFIX.$telegramId);
    }

    /**
     * Handle text inputs.
     */
    public function handleText(Nutgram $bot, string $text): void
    {
        $telegramId = $bot->userId();
        $state = Cache::get(self::CACHE_PREFIX.$telegramId);

        if (! $state || ! isset($state['step'])) {
            return;
        }

        switch ($state['step']) {
            case 'fio':
                $state['full_name'] = trim($text);
                $state['step'] = 'phone';
                Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);

                $keyboard = ReplyKeyboardMarkup::make(resize_keyboard: true, one_time_keyboard: true)
                    ->addRow(KeyboardButton::make('📱 Telefon raqamni ulashish', request_contact: true));

                $bot->sendMessage(
                    'Rahmat, <b>'.e($state['full_name'])."</b>!\n\nEndi telefon raqamingizni pastdagi <b>[📱 Telefon raqamni ulashish]</b> tugmasi orqali yuboring yoki qo'lda kiriting (+998901234567):",
                    parse_mode: 'HTML',
                    reply_markup: $keyboard
                );
                break;

            case 'phone':
                $phone = $this->normalizePhone($text);
                if (! $phone) {
                    $bot->sendMessage("❗️ Telefon raqami noto'g'ri. Iltimos, +998901234567 ko'rinishida kiriting yoki tugma orqali ulashing.");
                    break;
                }
                $state['phone'] = $phone;
                $this->askCategory($bot, $state);
                break;

            case 'birth_date_address':
                $state['address'] = trim($text);
                $state['step'] = 'pinfl';
                Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);

                $keyboard = InlineKeyboardMarkup::make()
                    ->addRow(InlineKeyboardButton::make("➡️ O'tkazib yuborish", callback_data: 'wizard_skip:pinfl'));

                $bot->sendMessage(
                    "🔢 Iltimos, 14 xonali <b>JSHSHIR (PINFL)</b> kodingizni kiriting:\n<i>(Pasport yoki ID-kartangizning pastki qismida ko'rsatilgan 14 ta raqam)</i>\n\nAgar hozir yoningizda bo'lmasa, pastdagi tugma orqali o'tkazib yuborishingiz mumkin:",
                    parse_mode: 'HTML',
                    reply_markup: $keyboard
                );
                break;

            case 'pinfl':
                $pinfl = preg_replace('/\D/', '', $text);
                if (Pinfl::birthDate($pinfl) === null) {
                    $bot->sendMessage("❗️ JSHSHIR noto'g'ri. U 14 ta raqamdan iborat bo'ladi (masalan: 32005980123456). Qaytadan kiriting yoki o'tkazib yuboring.");
                    break;
                }
                $state['pinfl'] = $pinfl;
                $this->finishWizard($bot, $state);
                break;
        }
    }

    /**
     * Handle phone contact shared via keyboard.
     */
    public function handleContact(Nutgram $bot, string $phone): void
    {
        $telegramId = $bot->userId();
        $state = Cache::get(self::CACHE_PREFIX.$telegramId) ?? [
            'step' => 'phone',
            'telegram_id' => $telegramId,
            'full_name' => ($bot->user() ? $bot->user()->first_name : "O'quvchi"),
        ];

        if (($state['step'] ?? null) !== 'phone') {
            return;
        }

        $normalizedPhone = $this->normalizePhone($phone);
        if (! $normalizedPhone) {
            $bot->sendMessage("❗️ Faqat O'zbekiston raqami (+998) qabul qilinadi. Raqamni +998901234567 ko'rinishida qo'lda kiriting.");

            return;
        }

        $state['phone'] = $normalizedPhone;
        $this->askCategory($bot, $state);
    }

    /**
     * Ask for driving license category.
     */
    protected function askCategory(Nutgram $bot, array $state): void
    {
        $state['step'] = 'category';
        Cache::put(self::CACHE_PREFIX.$state['telegram_id'], $state, self::TTL);

        $keyboard = InlineKeyboardMarkup::make()
            ->addRow(
                InlineKeyboardButton::make('🚗 B toifa (Yengil avtomobil)', callback_data: 'wizard_cat:B'),
                InlineKeyboardButton::make('🏍️ A toifa (Mototsikl)', callback_data: 'wizard_cat:A')
            )
            ->addRow(
                InlineKeyboardButton::make('🚛 C toifa (Yuk avtomobili)', callback_data: 'wizard_cat:C'),
                InlineKeyboardButton::make('🔄 BC toifa (Birgalikda)', callback_data: 'wizard_cat:BC')
            );

        $bot->sendMessage(
            "Qaysi toifa bo'yicha ta'lim olmoqchisiz?",
            reply_markup: $keyboard
        );
    }

    /**
     * Handle category selection callback.
     */
    public function handleCategorySelect(Nutgram $bot, string $category): void
    {
        $telegramId = $bot->userId();
        $state = $this->stateAtStep($telegramId, 'category');
        if (! $state || ! in_array($category, self::CATEGORIES, true)) {
            return;
        }

        $state['category'] = $category;
        $state['step'] = 'branch';
        Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);

        $branches = Branch::where('status', 'active')->get();
        $keyboard = InlineKeyboardMarkup::make();

        if ($branches->isEmpty()) {
            $branches = [Branch::firstOrCreate(['code' => 'main'], ['name' => 'Asosiy Filial', 'status' => 'active'])];
        }

        foreach ($branches as $branch) {
            $keyboard->addRow(InlineKeyboardButton::make("🏢 {$branch->name}", callback_data: "wizard_branch:{$branch->id}"));
        }

        $bot->editMessageText(
            "O'zingizga qulay <b>Filialni</b> tanlang:",
            parse_mode: 'HTML',
            reply_markup: $keyboard
        );
    }

    /**
     * Handle branch selection callback.
     */
    public function handleBranchSelect(Nutgram $bot, int $branchId): void
    {
        $telegramId = $bot->userId();
        $state = $this->stateAtStep($telegramId, 'branch');
        if (! $state || ! Branch::where('id', $branchId)->where('status', 'active')->exists()) {
            return;
        }

        $state['branch_id'] = $branchId;
        $state['step'] = 'preferred_time';
        Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);

        $keyboard = InlineKeyboardMarkup::make()
            ->addRow(InlineKeyboardButton::make('🌅 Ertalabki (09:00 - 11:00)', callback_data: 'wizard_time:morning'))
            ->addRow(InlineKeyboardButton::make('☀️ Kunduzgi (14:00 - 16:00)', callback_data: 'wizard_time:daytime'))
            ->addRow(InlineKeyboardButton::make('🌙 Kechki (18:30 - 20:30)', callback_data: 'wizard_time:evening'));

        $bot->editMessageText(
            "O'qish uchun o'zingizga eng qulay <b>vaqtni</b> tanlang:",
            parse_mode: 'HTML',
            reply_markup: $keyboard
        );
    }

    /**
     * Handle preferred time selection callback.
     */
    public function handleTimeSelect(Nutgram $bot, string $timeKey): void
    {
        $telegramId = $bot->userId();
        $state = $this->stateAtStep($telegramId, 'preferred_time');
        if (! $state || ! isset(self::TIME_LABELS[$timeKey])) {
            return;
        }

        $state['preferred_time'] = self::TIME_LABELS[$timeKey];
        $state['step'] = 'passport_photo';
        Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);

        $keyboard = InlineKeyboardMarkup::make()
            ->addRow(InlineKeyboardButton::make("➡️ O'tkazib yuborish", callback_data: 'wizard_skip:passport'));

        $bot->editMessageText(
            "📸 <b>Pasport yoki ID-kartangizning rasmini</b> yuboring:\n<i>(Hujjat ma'lumotlari xavfsiz shifrlanadi va faqat shartnoma tuzish uchun foydalaniladi)</i>\n\nAgar hozir rasmi bo'lmasa, pastdagi tugma orqali keyinroq topshirishingiz mumkin:",
            parse_mode: 'HTML',
            reply_markup: $keyboard
        );
    }

    /**
     * Handle photo upload during wizard.
     */
    public function handlePhoto(Nutgram $bot): void
    {
        $telegramId = $bot->userId();
        $state = Cache::get(self::CACHE_PREFIX.$telegramId);
        if (! in_array($state['step'] ?? null, ['passport_photo', 'photo'], true)) {
            return;
        }

        $photos = $bot->message()->photo;
        if (empty($photos)) {
            return;
        }

        // Get largest photo
        $largestPhoto = end($photos);
        $fileId = $largestPhoto->file_id;

        try {
            $file = $bot->getFile($fileId);
            $filePath = $file->file_path;
            $botToken = config('services.telegram.bot_token') ?? config('nutgram.token');
            $url = "https://api.telegram.org/file/bot{$botToken}/{$filePath}";

            $contents = @file_get_contents($url);
            if ($contents) {
                $dir = 'private/documents';
                Storage::makeDirectory($dir);
                $filename = "{$dir}/{$telegramId}_".time().'_'.basename($filePath);
                Storage::put($filename, $contents);

                if ($state['step'] === 'passport_photo') {
                    $state['passport_photo_url'] = $filename;
                    $state['step'] = 'photo';
                    Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);

                    $keyboard = InlineKeyboardMarkup::make()
                        ->addRow(InlineKeyboardButton::make("➡️ O'tkazib yuborish", callback_data: 'wizard_skip:photo'));

                    $bot->sendMessage(
                        "✅ Pasport qabul qilindi.\n\nEndi <b>3x4 rasmingizni</b> yoki selfi yuboring:\n<i>(Guvohnoma va shaxsiy kartochka uchun)</i>",
                        parse_mode: 'HTML',
                        reply_markup: $keyboard
                    );

                    return;
                }

                // Remaining step is "photo" (guarded at the top of the method).
                $state['photo_url'] = $filename;
                $state['step'] = 'birth_date_address';
                Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);

                $keyboard = InlineKeyboardMarkup::make()
                    ->addRow(InlineKeyboardButton::make("➡️ O'tkazib yuborish", callback_data: 'wizard_skip:birth_date_address'));

                $bot->sendMessage(
                    "✅ 3x4 rasm qabul qilindi.\n\nIltimos, <b>tug'ilgan sanangiz va yashash manzilingizni</b> yozing:\n<i>(Masalan: 12.08.2002, Toshkent sh., Chilonzor t., 12-uy)</i>",
                    parse_mode: 'HTML',
                    reply_markup: $keyboard
                );
            }
        } catch (\Throwable $e) {
            Log::error('Failed to download Telegram photo in wizard: '.$e->getMessage());
        }
    }

    /**
     * Handle skip step callback.
     */
    public function handleSkip(Nutgram $bot, string $stepKey): void
    {
        $telegramId = $bot->userId();
        $expectedStep = self::SKIPPABLE_STEPS[$stepKey] ?? null;
        $state = $expectedStep ? $this->stateAtStep($telegramId, $expectedStep) : null;
        if (! $state) {
            return;
        }

        switch ($stepKey) {
            case 'passport':
                $state['step'] = 'photo';
                Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);
                $keyboard = InlineKeyboardMarkup::make()
                    ->addRow(InlineKeyboardButton::make("➡️ O'tkazib yuborish", callback_data: 'wizard_skip:photo'));

                $bot->editMessageText(
                    "<b>3x4 rasmingizni</b> yoki selfi yuboring:\n<i>(Guvohnoma va shaxsiy kartochka uchun)</i>",
                    parse_mode: 'HTML',
                    reply_markup: $keyboard
                );
                break;

            case 'photo':
                $state['step'] = 'birth_date_address';
                Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);
                $keyboard = InlineKeyboardMarkup::make()
                    ->addRow(InlineKeyboardButton::make("➡️ O'tkazib yuborish", callback_data: 'wizard_skip:birth_date_address'));

                $bot->editMessageText(
                    "Iltimos, <b>tug'ilgan sanangiz va yashash manzilingizni</b> yozing:\n<i>(Masalan: 12.08.2002, Toshkent sh., Chilonzor t., 12-uy)</i>",
                    parse_mode: 'HTML',
                    reply_markup: $keyboard
                );
                break;

            case 'birth_date_address':
                $state['step'] = 'pinfl';
                Cache::put(self::CACHE_PREFIX.$telegramId, $state, self::TTL);
                $keyboard = InlineKeyboardMarkup::make()
                    ->addRow(InlineKeyboardButton::make("➡️ O'tkazib yuborish", callback_data: 'wizard_skip:pinfl'));

                $bot->editMessageText(
                    "🔢 Iltimos, 14 xonali <b>JSHSHIR (PINFL)</b> kodingizni kiriting:\n<i>(Pasportingiz pastki qismida ko'rsatilgan 14 ta raqam)</i>",
                    parse_mode: 'HTML',
                    reply_markup: $keyboard
                );
                break;

            case 'pinfl':
                $this->finishWizard($bot, $state);
                break;
        }
    }

    /**
     * Finish wizard and save Lead record.
     */
    protected function finishWizard(Nutgram $bot, array $state): void
    {
        $telegramId = $state['telegram_id'];
        Cache::forget(self::CACHE_PREFIX.$telegramId);

        if (empty($state['full_name']) || empty($state['phone'])) {
            return;
        }

        // Re-submitting the form updates the still-open lead instead of creating duplicates.
        $lead = Lead::where('telegram_id', $telegramId)
            ->whereIn('stage', ['new_lead', 'form_sent', 'form_completed'])
            ->latest('id')
            ->first() ?? new Lead;
        $isNewLead = ! $lead->exists;

        $lead->fill([
            'branch_id' => $state['branch_id'] ?? null,
            'telegram_id' => $telegramId,
            'full_name' => $state['full_name'],
            'phone' => $state['phone'],
            'category' => $state['category'] ?? 'B',
            'preferred_time' => $state['preferred_time'] ?? null,
            'passport_photo_url' => $state['passport_photo_url'] ?? null,
            'photo_url' => $state['photo_url'] ?? null,
            'address' => $state['address'] ?? null,
            'pinfl' => $state['pinfl'] ?? null,
            'birth_date' => isset($state['pinfl']) ? Pinfl::birthDate($state['pinfl']) : $lead->birth_date,
            'stage' => 'form_completed',
            'source' => 'telegram_bot',
            'is_form_completed' => true,
        ])->save();

        $bot->sendMessage(
            "🎉 <b>Arizangiz muvaffaqiyatli qabul qilindi!</b>\n\n".
            'Hurmatli <b>'.e($lead->full_name)."</b>, arizangiz AutoPrime avtomaktabi qabulxonasiga yetkazildi. Tez orada ma'muriyatimiz siz bilan bog'lanib, shartnomani rasmiylashtiradi.\n\n".
            "🚗 <b>Tanlangan toifa:</b> {$lead->category}\n".
            "⏰ <b>O'qish vaqti:</b> {$lead->preferred_time}\n".
            "📞 <b>Telefon:</b> {$lead->phone}\n\n".
            "AutoPrime'ni tanlaganingiz uchun tashakkur!",
            parse_mode: 'HTML',
            reply_markup: ReplyKeyboardRemove::make(true)
        );

        // Notify reception / superadmin users once per lead
        if ($isNewLead) {
            $this->notifyReception($bot, $lead);
        }
    }

    /**
     * Send alert to reception / admin users about new lead.
     */
    protected function notifyReception(Nutgram $bot, Lead $lead): void
    {
        try {
            $admins = User::role(['admin', 'superadmin'])
                ->whereNotNull('telegram_id')
                ->get();

            $msg = "🔔 <b>YANGI ARIZA (Bot Qabulxona)</b>\n\n".
                   '👤 <b>F.I.O:</b> '.e($lead->full_name)."\n".
                   "📞 <b>Tel:</b> {$lead->phone}\n".
                   "🚗 <b>Toifa:</b> {$lead->category}\n".
                   "⏰ <b>Vaqt:</b> {$lead->preferred_time}\n".
                   '🏢 <b>Filial ID:</b> '.($lead->branch_id ?? 'Tanlanmagan')."\n".
                   "📌 <b>Holat:</b> Anketani to'ldirdi (form_completed)";

            foreach ($admins as $admin) {
                if ($admin->telegram_id && $admin->telegram_id !== $lead->telegram_id) {
                    $bot->sendMessage($msg, chat_id: $admin->telegram_id, parse_mode: 'HTML');
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to notify reception about new lead: '.$e->getMessage());
        }
    }
}
