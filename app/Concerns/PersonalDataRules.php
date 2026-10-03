<?php

namespace App\Concerns;

use App\Support\Phone;
use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;

/**
 * Validation for identity data typed into forms (phone, passport, PINFL, plate, Telegram ID).
 * Call normalizePersonalInput() first so formatting differences ("90 123 45 67", "ab")
 * never fail validation or slip past `unique` checks.
 */
trait PersonalDataRules
{
    /**
     * Bring typed values to the canonical stored format before validating.
     */
    protected function normalizePersonalInput(Request $request): void
    {
        $merge = [];

        foreach (['phone', 'branch_phone'] as $field) {
            if ($request->has($field)) {
                $merge[$field] = Phone::normalize($request->input($field));
            }
        }

        foreach (['passport_series', 'plate_number'] as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $merge[$field] = strtoupper(preg_replace('/\s+/', '', $request->input($field)));
            }
        }

        // Only separators are removed; letters stay so the format rule can reject them.
        foreach (['passport_number', 'pinfl', 'telegram_id'] as $field) {
            if ($request->has($field) && is_string($request->input($field))) {
                $merge[$field] = preg_replace('/[\s-]+/', '', $request->input($field)) ?: null;
            }
        }

        $request->merge($merge);
    }

    /**
     * An optional amount left empty in a form is stored as 0, not NULL (the columns
     * are NOT NULL DEFAULT 0). Fields that were not sent at all are left alone.
     *
     * @param  array<string, mixed>  $validated
     * @param  array<int, string>  $fields
     * @return array<string, mixed>
     */
    protected function emptyAmountsToZero(array $validated, array $fields): array
    {
        foreach ($fields as $field) {
            if (array_key_exists($field, $validated) && ($validated[$field] === null || $validated[$field] === '')) {
                $validated[$field] = 0;
            }
        }

        return $validated;
    }

    /**
     * Existing records may hold values from before these rules; they only need to pass
     * validation when the user actually changes the field.
     *
     * @param  array<int, mixed>  $rules
     * @return array<int, mixed>
     */
    protected function rulesUnlessUnchanged(array $rules, Request $request, ?object $model, string $field): array
    {
        if ($model !== null && (string) $request->input($field) === (string) ($model->{$field} ?? '')) {
            return in_array('required', $rules, true) ? ['required'] : ['nullable'];
        }

        return $rules;
    }

    /**
     * @return array<int, mixed>
     */
    protected function phoneRules(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'regex:/^\+998\d{9}$/',
        ];
    }

    /**
     * @return array<int, mixed>
     */
    protected function passportSeriesRules(): array
    {
        return ['nullable', 'regex:/^[A-Z]{2}$/'];
    }

    /**
     * @return array<int, mixed>
     */
    protected function passportNumberRules(): array
    {
        return ['nullable', 'regex:/^\d{7}$/'];
    }

    /**
     * 14 digits; the first is 1-6 (sex and century), digits 2-7 are the birth date (DDMMYY),
     * which must be a real date and agree with the entered birth date when there is one.
     *
     * @return array<int, mixed>
     */
    protected function pinflRules(?string $birthDate = null): array
    {
        return [
            'nullable',
            'digits:14',
            function (string $attribute, mixed $value, Closure $fail) use ($birthDate): void {
                $date = self::birthDateFromPinfl((string) $value);

                if ($date === null) {
                    $fail("JSHSHIR noto'g'ri: undagi tug'ilgan sana aniqlanmadi.");

                    return;
                }

                if ($birthDate && Carbon::parse($birthDate)->toDateString() !== $date) {
                    $fail("JSHSHIR tug'ilgan sanaga mos kelmaydi (JSHSHIRda: {$date}).");
                }
            },
        ];
    }

    /**
     * @return array<int, mixed>
     */
    protected function birthDateRules(): array
    {
        return ['nullable', 'date', 'after_or_equal:1930-01-01', 'before_or_equal:today'];
    }

    /**
     * @return array<int, mixed>
     */
    protected function telegramIdRules(): array
    {
        return ['nullable', 'regex:/^\d{5,15}$/'];
    }

    /**
     * @return array<int, mixed>
     */
    protected function plateNumberRules(): array
    {
        return ['regex:/^(\d{2}[A-Z]\d{3}[A-Z]{2}|\d{5}[A-Z]{3})$/'];
    }

    /**
     * @return array<string, string>
     */
    protected function personalDataMessages(): array
    {
        return [
            'phone.regex' => 'Telefon raqami +998 XX XXX XX XX ko\'rinishida bo\'lishi kerak.',
            'passport_series.regex' => 'Pasport seriyasi 2 ta lotin harfidan iborat bo\'lishi kerak.',
            'passport_number.regex' => 'Pasport raqami 7 ta raqamdan iborat bo\'lishi kerak.',
            'pinfl.digits' => 'JSHSHIR 14 ta raqamdan iborat bo\'lishi kerak.',
            'birth_date.after_or_equal' => 'Tug\'ilgan sana 1930-yildan oldin bo\'lishi mumkin emas.',
            'birth_date.before_or_equal' => 'Tug\'ilgan sana kelajakda bo\'lishi mumkin emas.',
            'telegram_id.regex' => 'Telegram ID faqat raqamlardan iborat bo\'lishi kerak (5-15 ta).',
            'plate_number.regex' => 'Avtomobil raqami 01A123BC yoki 01123ABC ko\'rinishida bo\'lishi kerak.',
        ];
    }

    /**
     * The ISO birth date a PINFL stands for, or null when it is not a valid PINFL.
     */
    public static function birthDateFromPinfl(string $pinfl): ?string
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
