<?php

use App\Models\Branch;
use App\Models\Contract;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Build Telegram Mini App initData signed with the configured bot token.
 */
function signedTelegramInitData(int|string $telegramUserId, ?int $authDate = null, string $botToken = 'test-bot-token'): string
{
    config(['services.telegram.bot_token' => $botToken]);

    $fields = [
        'auth_date' => (string) ($authDate ?? now()->timestamp),
        'query_id' => 'AAHdF6IQAAAAAN0XohDhrOrc',
        'user' => json_encode(['id' => (int) $telegramUserId, 'first_name' => 'Test']),
    ];
    ksort($fields);

    $dataCheckString = implode("\n", array_map(fn ($key, $value) => "{$key}={$value}", array_keys($fields), $fields));
    $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
    $fields['hash'] = hash_hmac('sha256', $dataCheckString, $secretKey);

    return http_build_query($fields, '', '&', PHP_QUERY_RFC3986);
}

/**
 * An active, fully paid contract that includes driving lessons, so the student may be booked.
 *
 * @param  array<string, mixed>  $overrides
 */
function openDrivingContract(Student $student, array $overrides = []): Contract
{
    return Contract::create([
        'branch_id' => $student->branch_id ?? Branch::firstOrCreate(['code' => 'helper'], ['name' => 'Helper Filial', 'status' => 'active'])->id,
        'student_id' => $student->id,
        'contract_number' => 'T-'.fake()->unique()->numerify('########'),
        'contract_date' => now()->toDateString(),
        'has_theory' => true,
        'has_driving' => true,
        'required_driving_lessons' => 10,
        'total_amount' => 1000000,
        'final_amount' => 1000000,
        'paid_amount' => 1000000,
        'debt_amount' => 0,
        'status' => 'active',
        'payment_status' => 'paid',
        ...$overrides,
    ]);
}
