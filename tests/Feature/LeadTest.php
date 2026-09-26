<?php

use App\Models\Branch;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Lead;
use App\Models\Student;
use App\Models\User;
use App\Services\TelegramService;

beforeEach(function () {
    $this->mock(TelegramService::class)->shouldIgnoreMissing();

    $this->branch = Branch::firstOrCreate(['code' => 'lead-branch'], ['name' => 'Lead Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
    $this->contractType = ContractType::create([
        'branch_id' => $this->branch->id,
        'name' => 'B Kurs',
        'category' => 'B',
        'price' => 3000000,
        'is_active' => true,
    ]);
});

test('reception can create a lead with the default manual source', function () {
    $response = $this->actingAs($this->admin)->post(route('leads.store'), [
        'full_name' => 'Ali Valiyev',
        'phone' => '+998901112233',
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();

    $lead = Lead::where('phone', '+998901112233')->first();
    expect($lead)->not->toBeNull()
        ->and($lead->source)->toBe('reception_manual')
        ->and($lead->stage)->toBe('new_lead');
});

test('lead source must be one of the known sources', function () {
    $this->actingAs($this->admin)->post(route('leads.store'), [
        'full_name' => 'Ali Valiyev',
        'phone' => '+998901112233',
        'source' => 'tiktok',
    ])->assertSessionHasErrors('source');
});

test('converting a lead links it to the created student and contract', function () {
    $lead = Lead::create([
        'branch_id' => $this->branch->id,
        'full_name' => 'Hasan Husanov',
        'phone' => '+998907778899',
        'source' => 'walk_in',
        'stage' => 'new_lead',
    ]);

    $this->actingAs($this->admin)->post(route('leads.convert', $lead), [
        'contract_type_id' => $this->contractType->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $lead->refresh();
    $student = Student::where('phone', '+998907778899')->first();

    expect($student)->not->toBeNull()
        ->and($lead->stage)->toBe('contract_signed')
        ->and($lead->student_id)->toBe($student->id)
        ->and($lead->contract_id)->toBe(Contract::where('student_id', $student->id)->value('id'));
});

test('a lead cannot be converted twice', function () {
    $lead = Lead::create([
        'branch_id' => $this->branch->id,
        'full_name' => 'Hasan Husanov',
        'phone' => '+998907778899',
        'source' => 'walk_in',
        'stage' => 'new_lead',
    ]);

    $this->actingAs($this->admin)->post(route('leads.convert', $lead), [
        'contract_type_id' => $this->contractType->id,
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->post(route('leads.convert', $lead->fresh()), [
        'contract_type_id' => $this->contractType->id,
    ])->assertSessionHasErrors('lead');

    expect(Student::where('phone', '+998907778899')->count())->toBe(1)
        ->and(Contract::count())->toBe(1);
});

test('converting a lead whose phone already belongs to a student returns a validation error', function () {
    Student::factory()->create(['phone' => '+998907778899']);

    $lead = Lead::create([
        'branch_id' => $this->branch->id,
        'full_name' => 'Hasan Husanov',
        'phone' => '+998907778899',
        'source' => 'walk_in',
        'stage' => 'new_lead',
    ]);

    $this->actingAs($this->admin)->post(route('leads.convert', $lead), [
        'contract_type_id' => $this->contractType->id,
    ])->assertSessionHasErrors('phone');

    expect(Contract::count())->toBe(0);
});
