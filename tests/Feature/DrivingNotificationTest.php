<?php

use App\Models\Autodrome;
use App\Models\Driving;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramService;
use SergiX44\Nutgram\Nutgram;

it('sends telegram notifications when driving is created, completed, or cancelled', function () {
    $student = Student::factory()->create(['telegram_id' => '123456789']);
    $instructor = User::factory()->create(['role' => 'instructor']);
    $autodrome = Autodrome::create(['name' => 'Markaziy', 'address' => 'Toshkent', 'latitude' => 41.31, 'longitude' => 69.24, 'radius_meters' => 500]);

    $mockBot = Mockery::mock(Nutgram::class);
    $mockBot->shouldReceive('sendMessage')
        ->times(3)
        ->andReturn(null);

    $mockBot->shouldReceive('sendLocation')
        ->once()
        ->andReturn(null);

    $service = new TelegramService($mockBot);

    $driving = Driving::create([
        'instructor_id' => $instructor->id,
        'student_id' => $student->id,
        'autodrome_id' => $autodrome->id,
        'start_time' => now()->addHour(),
        'end_time' => now()->addHours(2),
        'status' => 'scheduled',
    ]);

    $service->sendDrivingCreatedNotification($driving);

    $driving->update(['status' => 'completed']);
    $service->sendLessonRatingPrompt($driving);

    $driving->update(['status' => 'cancelled']);
    $service->sendDrivingCancelledNotification($driving);

    expect($driving->status)->toBe('cancelled');
});
