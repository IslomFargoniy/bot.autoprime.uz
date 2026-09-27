<?php

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Driving;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramService;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    $this->sentOtps = [];
    $this->mock(TelegramService::class, function ($mock) {
        $mock->shouldReceive('sendDesktopLoginOtp')->andReturnUsing(function (Student $student, string $otp) {
            $this->sentOtps[$student->id] = $otp;

            return true;
        });
    });

    $this->student = Student::factory()->create(['phone' => '+998901234567', 'is_active' => true]);
});

function desktopLogin(string $phone, string $otp): TestResponse
{
    return test()->postJson(route('desktop.verify-otp'), ['phone' => $phone, 'otp' => $otp, 'device_uuid' => 'device-1']);
}

test('a locally formatted phone receives an OTP and logs in with it', function () {
    $this->postJson(route('desktop.send-otp'), ['phone' => '90 123 45 67'])->assertSuccessful()->assertJson(['success' => true]);

    $otp = $this->sentOtps[$this->student->id];
    expect($otp)->toMatch('/^\d{6}$/');

    $token = desktopLogin('901234567', $otp)->assertSuccessful()->json('token');

    $this->getJson(route('desktop.dashboard'), ['Authorization' => 'Bearer '.$token])
        ->assertSuccessful()
        ->assertJsonPath('student.id', $this->student->id);
});

test('the OTP is discarded after five wrong guesses', function () {
    $this->postJson(route('desktop.send-otp'), ['phone' => '+998901234567'])->assertSuccessful();
    $otp = $this->sentOtps[$this->student->id];
    $wrong = $otp === '000000' ? '111111' : '000000';

    foreach (range(1, 5) as $attempt) {
        desktopLogin('+998901234567', $wrong)->assertUnprocessable();
    }

    desktopLogin('+998901234567', $otp)->assertUnprocessable();
    expect($this->student->fresh()->desktop_auth_token)->toBeNull();
});

test('send-otp answers identically for unknown and unlinked phones without sending anything', function () {
    Student::factory()->create(['phone' => '+998907777777', 'telegram_id' => null, 'is_active' => true]);

    $unknown = $this->postJson(route('desktop.send-otp'), ['phone' => '+998905555555'])->assertSuccessful();
    $unlinked = $this->postJson(route('desktop.send-otp'), ['phone' => '+998907777777'])->assertSuccessful();

    expect($unknown->json())->toBe($unlinked->json())
        ->and($this->sentOtps)->toBeEmpty();
});

test('a phone cannot request a new OTP during the cooldown', function () {
    $this->postJson(route('desktop.send-otp'), ['phone' => '+998901234567'])->assertSuccessful();
    $this->postJson(route('desktop.send-otp'), ['phone' => '901234567'])->assertTooManyRequests();

    expect($this->sentOtps)->toHaveCount(1);
});

test('the desktop dashboard exposes neither instructor payroll data nor QR salts', function () {
    $branch = Branch::firstOrCreate(['code' => 'desk'], ['name' => 'Desktop Filial', 'status' => 'active']);
    $instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $branch->id, 'base_salary' => 5000000, 'salary_balance' => 1200000]);
    $group = Group::create(['name' => 'Desktop guruh', 'branch_id' => $branch->id, 'teacher_id' => $instructor->id]);
    $session = LessonSession::create([
        'branch_id' => $branch->id, 'group_id' => $group->id, 'teacher_id' => $instructor->id,
        'topic' => 'Mavzu', 'started_at' => now(), 'qr_secret_salt' => bin2hex(random_bytes(16)),
    ]);
    Attendance::create(['lesson_session_id' => $session->id, 'student_id' => $this->student->id, 'status' => 'present', 'scanned_at' => now()]);
    Driving::create([
        'student_id' => $this->student->id, 'instructor_id' => $instructor->id,
        'start_time' => now()->addDay(), 'end_time' => now()->addDay()->addHour(), 'status' => 'scheduled',
    ]);

    $this->postJson(route('desktop.send-otp'), ['phone' => '+998901234567']);
    $token = desktopLogin('+998901234567', $this->sentOtps[$this->student->id])->json('token');

    $response = $this->getJson(route('desktop.dashboard'), ['Authorization' => 'Bearer '.$token])->assertSuccessful();

    expect($response->json('drivings.0.instructor'))
        ->toMatchArray(['id' => $instructor->id, 'name' => $instructor->name, 'phone' => $instructor->phone])
        ->not->toHaveKeys(['base_salary', 'salary_balance', 'email', 'telegram_id'])
        ->and($response->json('attendances.0.session'))->not->toHaveKey('qr_secret_salt');
});

test('desktop session credentials are never serialized', function () {
    $this->student->update(['desktop_auth_token' => hash('sha256', 'secret'), 'current_desktop_session_id' => 'session-1']);

    expect($this->student->fresh()->toArray())
        ->not->toHaveKeys(['desktop_auth_token', 'current_desktop_session_id', 'current_desktop_device_uuid', 'desktop_token_expires_at']);
});
