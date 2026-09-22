<?php

use App\Jobs\SendDrivingCreatedNotificationJob;
use App\Jobs\SendDrivingReminderJob;
use App\Models\Driving;
use App\Models\Group;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Queue;
use SergiX44\Nutgram\Nutgram;

test('admin driving creation dispatches SendDrivingCreatedNotificationJob', function () {
    Queue::fake();

    $admin = User::factory()->create(['role' => 'admin']);
    $instructor = User::factory()->create(['role' => 'instructor']);
    $student = Student::factory()->create();

    $response = $this->actingAs($admin)->post('/admin/drivings', [
        'instructor_id' => $instructor->id,
        'student_ids' => [$student->id],
        'start_time' => now()->addDays(2)->format('Y-m-d H:i:s'),
        'end_time' => now()->addDays(2)->addHours(2)->format('Y-m-d H:i:s'),
    ]);

    $response->assertRedirect();
    Queue::assertPushed(SendDrivingCreatedNotificationJob::class);
});

test('instructor driving creation dispatches SendDrivingCreatedNotificationJob', function () {
    Queue::fake();

    $instructor = User::factory()->create(['role' => 'instructor']);
    $group = Group::create(['name' => 'Group 101', 'instructor_id' => $instructor->id]);
    $student = Student::factory()->create(['group_id' => $group->id]);

    $response = $this->actingAs($instructor)->post('/instructor/driving', [
        'group_id' => $group->id,
        'student_id' => $student->id,
        'start_time' => now()->addDays(2)->format('Y-m-d H:i:s'),
        'end_time' => now()->addDays(2)->addHours(2)->format('Y-m-d H:i:s'),
    ]);

    $response->assertRedirect();
    Queue::assertPushed(SendDrivingCreatedNotificationJob::class);
});

test('SendDrivingRemindersCommand dispatches 24h and 2h reminder jobs', function () {
    Queue::fake();

    $instructor = User::factory()->create(['role' => 'instructor']);
    $student = Student::factory()->create(['telegram_id' => '123456789']);

    // 24h driving (starting in 24 hours)
    $driving24h = Driving::create([
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'start_time' => Carbon::now()->addHours(24),
        'end_time' => Carbon::now()->addHours(26),
        'status' => 'scheduled',
    ]);

    // 2h driving (starting in 120 minutes)
    $driving2h = Driving::create([
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'start_time' => Carbon::now()->addMinutes(120),
        'end_time' => Carbon::now()->addMinutes(240),
        'status' => 'scheduled',
    ]);

    // Far future driving (should not trigger reminder)
    $drivingFuture = Driving::create([
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'start_time' => Carbon::now()->addDays(5),
        'end_time' => Carbon::now()->addDays(5)->addHours(2),
        'status' => 'scheduled',
    ]);

    $this->artisan('app:send-driving-reminders')
        ->assertSuccessful();

    Queue::assertPushed(SendDrivingReminderJob::class, function ($job) use ($driving24h) {
        return $job->driving->id === $driving24h->id && $job->type === '24h';
    });

    Queue::assertPushed(SendDrivingReminderJob::class, function ($job) use ($driving2h) {
        return $job->driving->id === $driving2h->id && $job->type === '2h';
    });

    Queue::assertNotPushed(SendDrivingReminderJob::class, function ($job) use ($drivingFuture) {
        return $job->driving->id === $drivingFuture->id;
    });
});

test('SendDrivingReminderJob sends 24h and 2h telegram reminders and updates timestamp', function () {
    $student = Student::factory()->create(['telegram_id' => '998877665']);
    $instructor = User::factory()->create(['role' => 'instructor', 'name' => 'Anvar']);

    $mockBot = Mockery::mock(Nutgram::class);
    $mockBot->shouldReceive('sendMessage')
        ->twice()
        ->andReturn(null);

    $service = new TelegramService($mockBot);

    $driving = Driving::create([
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'start_time' => now()->addHours(24),
        'end_time' => now()->addHours(26),
        'status' => 'scheduled',
    ]);

    // Execute 24h reminder
    $job24h = new SendDrivingReminderJob($driving, '24h');
    $job24h->handle($service);

    $driving->refresh();
    expect($driving->reminded_24h_at)->not->toBeNull();

    // Execute 2h reminder
    $job2h = new SendDrivingReminderJob($driving, '2h');
    $job2h->handle($service);

    $driving->refresh();
    expect($driving->reminded_2h_at)->not->toBeNull();
});

test('SendDrivingReminderJob does not resend if already reminded', function () {
    $student = Student::factory()->create(['telegram_id' => '998877665']);
    $instructor = User::factory()->create(['role' => 'instructor']);

    $mockBot = Mockery::mock(Nutgram::class);
    // Should NOT receive any message calls
    $mockBot->shouldNotReceive('sendMessage');

    $service = new TelegramService($mockBot);

    $driving = Driving::create([
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'start_time' => now()->addHours(24),
        'end_time' => now()->addHours(26),
        'status' => 'scheduled',
        'reminded_24h_at' => now()->subMinutes(10),
    ]);

    $job24h = new SendDrivingReminderJob($driving, '24h');
    $job24h->handle($service);
});

test('updating driving start_time resets reminder timestamps', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $instructor = User::factory()->create(['role' => 'instructor']);
    $student = Student::factory()->create();

    $driving = Driving::create([
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'start_time' => now()->addHours(24),
        'end_time' => now()->addHours(26),
        'status' => 'scheduled',
        'reminded_24h_at' => now(),
        'reminded_2h_at' => now(),
    ]);

    $newStart = now()->addDays(3)->format('Y-m-d H:i:s');
    $newEnd = now()->addDays(3)->addHours(2)->format('Y-m-d H:i:s');

    $response = $this->actingAs($admin)->put("/admin/drivings/{$driving->id}", [
        'start_time' => $newStart,
        'end_time' => $newEnd,
    ]);

    $response->assertRedirect();
    $driving->refresh();

    expect($driving->reminded_24h_at)->toBeNull()
        ->and($driving->reminded_2h_at)->toBeNull();
});
