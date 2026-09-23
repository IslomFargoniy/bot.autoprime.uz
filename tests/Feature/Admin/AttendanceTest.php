<?php

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Group;
use App\Models\LessonSession;
use App\Models\Student;
use App\Models\User;

test('admin can fetch group attendances roster', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $branch = Branch::firstOrCreate(['code' => 'main'], ['name' => 'Asosiy Filial', 'status' => 'active']);
    $group = Group::create([
        'name' => 'Test Guruh',
        'branch_id' => $branch->id,
        'category' => 'B',
        'is_active' => true,
    ]);

    $student1 = Student::create([
        'full_name' => 'Talaba Bir',
        'phone' => '+998901111111',
        'group_id' => $group->id,
        'branch_id' => $branch->id,
        'status' => 'active',
    ]);

    $student2 = Student::create([
        'full_name' => 'Talaba Ikki',
        'phone' => '+998902222222',
        'group_id' => $group->id,
        'branch_id' => $branch->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($admin)->getJson("/admin/attendance/group-attendances?group_id={$group->id}&date=2026-09-23");

    $response->assertOk()
        ->assertJsonStructure([
            'group' => ['id', 'name'],
            'date',
            'students' => [
                '*' => ['id', 'full_name', 'phone', 'status', 'is_attended'],
            ],
        ]);

    expect($response->json('students'))->toHaveCount(2);
});

test('admin can mark group attendance in bulk', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $branch = Branch::firstOrCreate(['code' => 'main'], ['name' => 'Asosiy Filial', 'status' => 'active']);
    $group = Group::create([
        'name' => 'Test Guruh Bulk',
        'branch_id' => $branch->id,
        'category' => 'B',
        'is_active' => true,
    ]);

    $student1 = Student::create([
        'full_name' => 'Talaba Ali',
        'phone' => '+998903333333',
        'group_id' => $group->id,
        'branch_id' => $branch->id,
        'status' => 'active',
    ]);

    $student2 = Student::create([
        'full_name' => 'Talaba Vali',
        'phone' => '+998904444444',
        'group_id' => $group->id,
        'branch_id' => $branch->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($admin)->post('/admin/attendance/mark-group', [
        'group_id' => $group->id,
        'date' => '2026-09-23',
        'topic' => 'Yo\'l harakati qoidalari 1-bob',
        'attendances' => [
            [
                'student_id' => $student1->id,
                'status' => 'present',
                'manual_reason' => 'Qo\'lda belgilandi',
            ],
            [
                'student_id' => $student2->id,
                'status' => 'absent',
                'manual_reason' => 'Kelmadi',
            ],
        ],
    ]);

    $response->assertRedirect();

    // Check that session was created
    $session = LessonSession::where('group_id', $group->id)->whereDate('started_at', '2026-09-23')->first();
    expect($session)->not->toBeNull();
    expect($session->topic)->toBe('Yo\'l harakati qoidalari 1-bob');

    // Check student 1 attendance
    $att1 = Attendance::where('lesson_session_id', $session->id)->where('student_id', $student1->id)->first();
    expect($att1)->not->toBeNull();
    expect($att1->status)->toBe('present');
    expect($att1->is_manual)->toBeTrue();

    // Check student 2 attendance
    $att2 = Attendance::where('lesson_session_id', $session->id)->where('student_id', $student2->id)->first();
    expect($att2)->not->toBeNull();
    expect($att2->status)->toBe('absent');
});

test('admin can mark single student manually even without session_id', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $branch = Branch::firstOrCreate(['code' => 'main'], ['name' => 'Asosiy Filial', 'status' => 'active']);
    $group = Group::create([
        'name' => 'Test Guruh Single',
        'branch_id' => $branch->id,
        'category' => 'B',
        'is_active' => true,
    ]);

    $student = Student::create([
        'full_name' => 'Talaba Single',
        'phone' => '+998905555555',
        'group_id' => $group->id,
        'branch_id' => $branch->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($admin)->post('/admin/attendance/mark-manual', [
        'student_id' => $student->id,
        'date' => '2026-09-23',
        'status' => 'present',
        'manual_reason' => 'Telefonsiz kelgan',
    ]);

    $response->assertRedirect();

    $attendance = Attendance::where('student_id', $student->id)->first();
    expect($attendance)->not->toBeNull();
    expect($attendance->status)->toBe('present');
    expect($attendance->is_manual)->toBeTrue();
    expect($attendance->session)->not->toBeNull();
});
