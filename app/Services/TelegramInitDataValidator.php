<?php

namespace App\Services;

class TelegramInitDataValidator
{
    /**
     * Validate Telegram Mini App initData and return the Telegram user id it
     * was signed for, or null when the signature is invalid or expired.
     *
     * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
     */
    public static function telegramUserId(?string $initData): ?string
    {
        $fields = self::verifiedFields($initData);
        if ($fields === null || ! isset($fields['user'])) {
            return null;
        }

        $telegramUser = json_decode($fields['user'], true);
        $telegramId = is_array($telegramUser) ? ($telegramUser['id'] ?? null) : null;

        return $telegramId ? (string) $telegramId : null;
    }

    /**
     * Return the decoded initData fields when the HMAC signature matches the bot
     * token and auth_date is within the configured lifetime.
     *
     * @return array<string, string>|null
     */
    public static function verifiedFields(?string $initData): ?array
    {
        $botToken = (string) (config('services.telegram.bot_token') ?: config('nutgram.token', ''));
        if ($initData === null || $initData === '' || $botToken === '') {
            return null;
        }

        $fields = [];
        foreach (explode('&', $initData) as $pair) {
            if (! str_contains($pair, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $pair, 2);
            $fields[rawurldecode($key)] = rawurldecode($value);
        }

        $hash = $fields['hash'] ?? null;
        if (! is_string($hash) || $hash === '') {
            return null;
        }
        unset($fields['hash']);

        ksort($fields);
        $dataCheckString = implode("\n", array_map(
            fn (string $key, string $value): string => "{$key}={$value}",
            array_keys($fields),
            $fields,
        ));

        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $calculatedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        if (! hash_equals($calculatedHash, $hash)) {
            return null;
        }

        $authDate = (int) ($fields['auth_date'] ?? 0);
        $maxAge = (int) config('services.telegram.init_data_ttl', 86400);
        if ($authDate <= 0 || ($maxAge > 0 && now()->timestamp - $authDate > $maxAge)) {
            return null;
        }

        return $fields;
    }
}
