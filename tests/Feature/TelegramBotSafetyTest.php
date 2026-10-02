<?php

use App\Models\Branch;
use App\Models\Driving;
use App\Models\Lead;
use App\Models\Review;
use App\Models\Student;
use App\Models\User;
use App\Services\DrivingReviewService;
use App\Services\LeadWizardService;
use Illuminate\Support\Facades\Cache;
use SergiX44\Nutgram\Nutgram;

function fakeBotForUser(int $telegramUserId): Nutgram
{
    $bot = Mockery::mock(Nutgram::class)->shouldIgnoreMissing();
    $bot->shouldReceive('userId')->andReturn($telegramUserId);

    return $bot;
}

function completedDrivingFor(Student $student, string $status = 'completed'): Driving
{
    return Driving::create([
        'instructor_id' => User::factory()->create(['role' => 'instructor'])->id,
        'student_id' => $student->id,
        'start_time' => now()->subHours(3),
        'end_time' => now()->subHours(2),
        'status' => $status,
    ]);
}

test('only the owning student can rate a completed driving once with a 1-5 rating', function () {
    $service = app(DrivingReviewService::class);
    $student = Student::factory()->create(['telegram_id' => '424242']);
    $driving = completedDrivingFor($student);

    expect($service->rejectionReason($driving, 424242, 5))->toBeNull()
        ->and($service->rejectionReason($driving, 999999, 5))->not->toBeNull()
        ->and($service->rejectionReason($driving, 424242, 100))->not->toBeNull()
        ->and($service->rejectionReason($driving, 424242, -3))->not->toBeNull()
        ->and($service->rejectionReason($driving, 424242, 0))->not->toBeNull();

    $service->store($driving, 5, []);

    expect($service->rejectionReason($driving->fresh(), 424242, 4))->not->toBeNull();
});

test('scheduled drivings cannot be rated', function () {
    $student = Student::factory()->create(['telegram_id' => '424242']);

    expect(app(DrivingReviewService::class)->rejectionReason(completedDrivingFor($student, 'scheduled'), 424242, 5))->not->toBeNull();
});

test('storing a review twice keeps the first rating', function () {
    $service = app(DrivingReviewService::class);
    $driving = completedDrivingFor(Student::factory()->create(['telegram_id' => '424242']));

    $service->store($driving, 5, []);
    $service->store($driving, 1, []);

    expect(Review::where('driving_id', $driving->id)->count())->toBe(1)
        ->and(Review::where('driving_id', $driving->id)->value('rating'))->toBe(5);
});

test('an instructor cannot finish an already completed driving again', function () {
    $instructor = User::factory()->create(['role' => 'instructor']);
    $driving = Driving::create([
        'instructor_id' => $instructor->id,
        'student_id' => Student::factory()->create()->id,
        'start_time' => now()->subHours(3),
        'end_time' => now()->subHours(2),
        'status' => 'completed',
    ]);

    $this->actingAs($instructor)
        ->put("/admin/drivings/{$driving->id}", ['status' => 'completed'])
        ->assertSessionHasErrors('update');
});

test('wizard skip buttons cannot jump over required steps', function () {
    $wizard = app(LeadWizardService::class);
    $bot = fakeBotForUser(515151);

    $wizard->start($bot);
    $wizard->handleSkip($bot, 'pinfl');

    expect(Lead::count())->toBe(0)
        ->and(Cache::get('lead_wizard:515151')['step'])->toBe('fio');
});

test('wizard rejects unknown categories, inactive branches and invalid phones', function () {
    $wizard = app(LeadWizardService::class);
    $bot = fakeBotForUser(525252);
    $inactiveBranch = Branch::create(['code' => 'closed', 'name' => 'Yopiq', 'status' => 'inactive']);

    $wizard->start($bot);
    $wizard->handleText($bot, 'Ali Valiyev');
    $wizard->handleText($bot, 'raqam emas');
    expect(Cache::get('lead_wizard:525252')['step'])->toBe('phone');

    $wizard->handleText($bot, '+998 90 111 22 33');
    expect(Cache::get('lead_wizard:525252'))->toMatchArray(['step' => 'category', 'phone' => '+998901112233']);

    $wizard->handleCategorySelect($bot, 'Z');
    expect(Cache::get('lead_wizard:525252')['step'])->toBe('category');

    $wizard->handleCategorySelect($bot, 'B');
    $wizard->handleBranchSelect($bot, $inactiveBranch->id);
    expect(Cache::get('lead_wizard:525252')['step'])->toBe('branch');
});

test('completing the wizard twice updates the open lead instead of duplicating it', function () {
    $wizard = app(LeadWizardService::class);
    $bot = fakeBotForUser(535353);
    $branch = Branch::firstOrCreate(['code' => 'wizard-branch'], ['name' => 'Wizard', 'status' => 'active']);

    foreach (['Birinchi Ism', 'Ikkinchi Ism'] as $name) {
        $wizard->start($bot);
        $wizard->handleText($bot, $name);
        $wizard->handleText($bot, '+998901112233');
        $wizard->handleCategorySelect($bot, 'B');
        $wizard->handleBranchSelect($bot, $branch->id);
        $wizard->handleTimeSelect($bot, 'morning');
        $wizard->handleSkip($bot, 'passport');
        $wizard->handleSkip($bot, 'photo');
        $wizard->handleSkip($bot, 'birth_date_address');
        $wizard->handleSkip($bot, 'pinfl');
    }

    expect(Lead::where('telegram_id', 535353)->count())->toBe(1)
        ->and(Lead::where('telegram_id', 535353)->value('full_name'))->toBe('Ikkinchi Ism');
});
