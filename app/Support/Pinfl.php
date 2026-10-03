<?php

namespace App\Support;

class Pinfl
{
    /**
     * The ISO birth date a PINFL stands for, or null when it is not a valid PINFL.
     * Digit 1 gives sex and century (1-2: 1800s, 3-4: 1900s, 5-6: 2000s), digits 2-7 are DDMMYY.
     */
    public static function birthDate(string $pinfl): ?string
    {
        if (! preg_match('/^[1-6]\d{13}$/', $pinfl)) {
            return null;
        }

        $century = [1 => 1800, 2 => 1800, 3 => 1900, 4 => 1900, 5 => 2000, 6 => 2000][(int) $pinfl[0]];
        $day = (int) substr($pinfl, 1, 2);
        $month = (int) substr($pinfl, 3, 2);
        $year = $century + (int) substr($pinfl, 5, 2);

        return checkdate($month, $day, $year) ? sprintf('%04d-%02d-%02d', $year, $month, $day) : null;
    }
}
