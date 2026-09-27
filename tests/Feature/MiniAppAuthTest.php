<?php

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramInitDataValidator;

test('validator accepts correctly signed and fresh initData', function () {
    expect(TelegramInitDataValidator::telegramUserId(signedTelegramInitData(555001)))->toBe('555001');
});

test('validator rejects tampered, unsigned and expired initData', function () {
    $valid = signedTelegramInitData(555001);

    expect(TelegramInitDataValidator::telegramUserId(str_replace('555001', '555002', $valid)))->toBeNull()
        ->and(TelegramInitDataValidator::telegramUserId('user='.rawurlencode(json_encode(['id' => 555001]))))->toBeNull()
        ->and(TelegramInitDataValidator::telegramUserId(signedTelegramInitData(555001, now()->subDays(2)->timestamp)))->toBeNull()
        ->and(TelegramInitDataValidator::telegramUserId($valid.'&hash[]=x'))->toBeNull();
});

test('mini app does not reveal a student for unsigned initData', function () {
    Student::factory()->create(['telegram_id' => '700100']);

    $unsigned = 'user='.rawurlencode(json_encode(['id' => 700100]));

    $this->get('/mini-app?_auth='.urlencode($unsigned))
        ->assertInertia(fn ($page) => $page->where('student', null));
});

test('mini app shows the student for signed initData and only exposes safe fields', function () {
    $student = Student::factory()->create(['telegram_id' => '700100', 'pinfl' => '12345678901234']);

    $this->withHeader('X-Telegram-Init-Data', signedTelegramInitData(700100))
        ->get('/mini-app')
        ->assertInertia(fn ($page) => $page
            ->where('student.id', $student->id)
            ->missing('student.pinfl')
            ->missing('student.passport_number'));
});

test('attendance scan ignores a request supplied student_id', function () {
    $branch = Branch::firstOrCreate(['code' => 'scan-branch'], ['name' => 'Scan Filial', 'status' => 'active']);
    $teacher = User::factory()->create(['role' => 'teacher', 'branch_id' => $branch->id]);
    $group = Group::create(['name' => 'G-1', 'branch_id' => $branch->id]);
    $victim = Student::factory()->create(['branch_id' => $branch->id, 'group_id' => $group->id]);
    $session = LessonSession::create([
        'branch_id' => $branch->id,
        'group_id' => $group->id,
        'teacher_id' => $teacher->id,
        'topic' => 'Mavzu',
        'started_at' => now(),
        'qr_secret_salt' => bin2hex(random_bytes(16)),
    ]);

    $this->postJson('/api/attendance/scan-qr', [
        'qr_token' => $session->generateQrToken(),
        'student_id' => $victim->id,
    ])->assertForbidden();

    expect(Attendance::count())->toBe(0);
});

test('inactive staff are rejected by the telegram auth endpoint', function () {
    User::factory()->create(['role' => 'admin', 'telegram_id' => '900900', 'status' => 'inactive']);

    $this->postJson('/api/telegram-auth', ['initData' => signedTelegramInitData(900900)])
        ->assertForbidden();

    $this->assertGuest();
});

test('telegram auth endpoint logs in active staff with signed initData', function () {
    $admin = User::factory()->create(['role' => 'admin', 'telegram_id' => '900901']);

    $this->postJson('/api/telegram-auth', ['initData' => signedTelegramInitData(900901)])
        ->assertSuccessful();

    $this->assertAuthenticatedAs($admin);
});

test('an inactive user with an existing session is logged out', function () {
    $user = User::factory()->create(['role' => 'admin', 'status' => 'inactive']);

    $this->actingAs($user)->get('/admin/dashboard')->assertRedirect(route('login'));

    $this->assertGuest();
});
