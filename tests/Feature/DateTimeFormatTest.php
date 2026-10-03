<?php

use App\Exports\DrivingsExport;
use App\Models\Branch;
use App\Models\Certificate;
use App\Models\Driving;
use App\Models\Group;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'datetime'], ['name' => 'Vaqt Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
});

test('the drivings export shows start and end as YYYY-MM-DD HH:mm without seconds', function () {
    $driving = Driving::create([
        'branch_id' => $this->branch->id,
        'instructor_id' => User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id])->id,
        'student_id' => Student::factory()->create(['branch_id' => $this->branch->id])->id,
        'start_time' => '2026-10-22 19:33:41',
        'end_time' => '2026-10-22 20:33:41',
        'status' => 'scheduled',
    ]);

    $row = (new DrivingsExport)->map($driving->load(['student', 'instructor']));

    expect($row[5])->toBe('2026-10-22 19:33')
        ->and($row[6])->toBe('2026-10-22 20:33');
});

test('contract and certificate documents print the date as YYYY-MM-DD', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $contract = openDrivingContract($student, ['contract_date' => '2026-10-22']);
    $certificate = Certificate::create([
        'branch_id' => $this->branch->id, 'student_id' => $student->id, 'contract_id' => $contract->id,
        'certificate_number' => 'CERT-D-0001', 'qr_verify_hash' => 'hash-date', 'category' => 'B',
        'issued_date' => '2026-10-22', 'status' => 'issued',
    ]);

    $contract->load(['student', 'contractType', 'group', 'branch', 'payments']);
    $contractHtml = view('pdf.contract', [
        'contract' => $contract, 'student' => $contract->student, 'branch' => $contract->branch, 'contractType' => $contract->contractType,
    ])->render();

    $certificate->load(['student', 'contract.contractType', 'branch', 'issuedBy']);
    $certificateHtml = view('pdf.certificate', [
        'certificate' => $certificate, 'student' => $certificate->student, 'branch' => $certificate->branch, 'verifyUrl' => 'https://example.com/v',
    ])->render();

    expect($contractHtml)->toContain('Sana: 2026-10-22')
        ->and($contractHtml)->not->toContain('00:00:00')
        ->and($certificateHtml)->toContain('Berilgan sana: 2026-10-22')
        ->and($certificateHtml)->not->toContain('00:00:00');
});

test('a group keeps a 19:33 time and rejects an impossible one', function () {
    $this->actingAs($this->admin)->post('/admin/groups', [
        'name' => 'Kechki', 'category' => 'B', 'days_of_week' => ['tue'],
        'start_time' => '19:33', 'end_time' => '21:05', 'max_students' => 20,
    ])->assertSessionHasNoErrors();

    $group = Group::where('name', 'Kechki')->firstOrFail();
    expect(substr((string) $group->start_time, 0, 5))->toBe('19:33')
        ->and(substr((string) $group->end_time, 0, 5))->toBe('21:05');

    $this->actingAs($this->admin)->post('/admin/groups', [
        'name' => 'Noto\'g\'ri', 'category' => 'B', 'days_of_week' => ['tue'],
        'start_time' => '25:61', 'max_students' => 20,
    ])->assertSessionHasErrors('start_time');
});
