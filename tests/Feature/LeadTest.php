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

function editableLead(Branch $branch, array $attributes = []): Lead
{
    return Lead::create([
        'branch_id' => $branch->id,
        'full_name' => 'Tahrir Lid',
        'phone' => '+998907770011',
        'stage' => 'new_lead',
        'source' => 'reception_manual',
        ...$attributes,
    ]);
}

test('staff can edit the details of a lead', function () {
    $lead = editableLead($this->branch);

    $this->actingAs($this->admin)->put(route('leads.update', $lead), [
        'full_name' => 'Yangi Ism',
        'phone' => '+998907770022',
        'source' => 'instagram',
        'passport_series' => 'AB',
        'passport_number' => '1234567',
        'pinfl' => '32005980123456',
        'address' => 'Toshkent',
    ])->assertSessionHasNoErrors();

    $lead = $lead->fresh();
    expect($lead->full_name)->toBe('Yangi Ism')
        ->and($lead->phone)->toBe('+998907770022')
        ->and($lead->source)->toBe('instagram')
        ->and($lead->passport_series)->toBe('AB')
        ->and($lead->pinfl)->toBe('32005980123456')
        ->and($lead->pinfl_hash)->toBe(hash_hmac('sha256', '32005980123456', (string) config('app.key')));
});

test('a lead cannot be marked as contract signed by hand', function () {
    $lead = editableLead($this->branch);

    $this->actingAs($this->admin)->put(route('leads.update', $lead), ['stage' => 'contract_signed'])->assertSessionHasErrors('stage');

    expect($lead->fresh()->stage)->toBe('new_lead');
});

test('rejecting a lead needs a reason and clears it when reopened', function () {
    $lead = editableLead($this->branch);

    $this->actingAs($this->admin)->put(route('leads.update', $lead), ['stage' => 'rejected'])->assertSessionHasErrors('lost_reason');

    $this->actingAs($this->admin)->put(route('leads.update', $lead), ['stage' => 'rejected', 'lost_reason' => 'Qimmat'])->assertSessionHasNoErrors();
    expect($lead->fresh()->stage)->toBe('rejected')->and($lead->fresh()->lost_reason)->toBe('Qimmat');

    $this->actingAs($this->admin)->put(route('leads.update', $lead), ['stage' => 'new_lead'])->assertSessionHasNoErrors();
    expect($lead->fresh()->lost_reason)->toBeNull();
});

test('only the notes of a converted lead can be edited', function () {
    $lead = editableLead($this->branch, ['stage' => 'contract_signed', 'student_id' => Student::factory()->create(['branch_id' => $this->branch->id])->id]);

    $this->actingAs($this->admin)->put(route('leads.update', $lead), ['full_name' => 'Boshqa Ism'])->assertSessionHasErrors('full_name');
    expect($lead->fresh()->full_name)->toBe('Tahrir Lid');

    $this->actingAs($this->admin)->put(route('leads.update', $lead), ['notes' => 'Yangi izoh'])->assertSessionHasNoErrors();
    expect($lead->fresh()->notes)->toBe('Yangi izoh');
});

test('editing a lead needs the manage permission and the same branch', function () {
    $lead = editableLead($this->branch);

    $instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->branch->id]);
    $this->actingAs($instructor)->put(route('leads.update', $lead), ['full_name' => 'Ruxsatsiz'])->assertForbidden();

    $otherBranch = Branch::firstOrCreate(['code' => 'lead-branch-2'], ['name' => 'Boshqa Filial', 'status' => 'active']);
    $foreignLead = editableLead($otherBranch, ['phone' => '+998907770033']);
    $this->actingAs($this->admin)->put(route('leads.update', $foreignLead), ['full_name' => 'Begona'])->assertForbidden();

    $this->actingAs($this->admin)->put(route('leads.update', $lead), ['branch_id' => $otherBranch->id])->assertSessionHasNoErrors();
    expect($lead->fresh()->branch_id)->toBe($this->branch->id);
});
