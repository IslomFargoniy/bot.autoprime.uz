<?php

namespace App\Support;

class Phone
{
    /**
     * Canonical phone format (+998XXXXXXXXX): 9 digits get the country code, anything
     * else keeps its digits behind a "+". Empty input becomes null.
     */
    public static function normalize(?string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $phone);

        if ($digits === '') {
            return null;
        }

        if (strlen($digits) === 9) {
            $digits = '998'.$digits;
        }

        return '+'.$digits;
    }

    /**
     * Whether the value is a full Uzbek number in the canonical format.
     */
    public static function isValid(?string $phone): bool
    {
        return $phone !== null && preg_match('/^\+998\d{9}$/', $phone) === 1;
    }
}
