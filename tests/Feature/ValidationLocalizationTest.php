<?php

use App\Models\Branch;
use App\Models\ContractType;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'val-loc'], ['name' => 'Validation Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
    $this->student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $this->contractType = ContractType::firstOrCreate(
        ['name' => 'Val Type'],
        ['branch_id' => $this->branch->id, 'category' => 'B', 'price' => 2000000, 'is_active' => true]
    );
});

test('contract end_date validation returns translated error message in uzbek rather than raw key', function () {
    $response = $this->actingAs($this->admin)
        ->withCookie('locale', 'uz')
        ->from('/admin/contracts')
        ->post('/admin/contracts', [
            'student_id' => $this->student->id,
            'contract_type_id' => $this->contractType->id,
            'start_date' => '2026-10-10',
            'end_date' => '2026-10-05', // earlier than start_date
        ]);

    $response->assertSessionHasErrors(['end_date']);

    $errorMessage = session('errors')->first('end_date');
    expect($errorMessage)->not->toBe('validation.after_or_equal')
        ->and($errorMessage)->toContain('tugash sanasi');
});

test('contract end_date validation returns translated error message in russian', function () {
    $response = $this->actingAs($this->admin)
        ->withUnencryptedCookie('locale', 'ru')
        ->from('/admin/contracts')
        ->post('/admin/contracts', [
            'student_id' => $this->student->id,
            'contract_type_id' => $this->contractType->id,
            'start_date' => '2026-10-10',
            'end_date' => '2026-10-05',
        ]);

    $response->assertSessionHasErrors(['end_date']);

    $errorMessage = session('errors')->first('end_date');
    expect($errorMessage)->not->toBe('validation.after_or_equal')
        ->and($errorMessage)->toContain('дата окончания');
});

test('contract end_date validation returns translated error message in cyrillic', function () {
    $response = $this->actingAs($this->admin)
        ->withUnencryptedCookie('locale', 'krill')
        ->from('/admin/contracts')
        ->post('/admin/contracts', [
            'student_id' => $this->student->id,
            'contract_type_id' => $this->contractType->id,
            'start_date' => '2026-10-10',
            'end_date' => '2026-10-05',
        ]);

    $response->assertSessionHasErrors(['end_date']);

    $errorMessage = session('errors')->first('end_date');
    expect($errorMessage)->not->toBe('validation.after_or_equal')
        ->and($errorMessage)->toContain('тугаш санаси');
});
