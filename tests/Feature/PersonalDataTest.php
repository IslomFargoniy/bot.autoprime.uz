<?php

use App\Models\Branch;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Lead;
use App\Models\Student;
use App\Models\User;
use App\Models\Vehicle;
use App\Support\Phone;

beforeEach(function () {
    $this->branch = Branch::firstOrCreate(['code' => 'personal'], ['name' => 'Shaxsiy Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $this->branch->id]);
});

/**
 * Students are created through a lead or a contract only, so these rules are exercised
 * on editing an existing student.
 */
function personalStudent(array $attributes = []): Student
{
    return Student::factory()->create(['branch_id' => test()->branch->id, 'phone' => '+998909990000', ...$attributes]);
}

dataset('phone formats', [
    'spaced national' => '90 123 45 67',
    'country code' => '998901234567',
    'plus and spaces' => '+998 90 123 45 67',
    'masked' => '+998 (90) 123-45-67',
]);

dataset('bad phones', ['too short' => '12345', 'foreign' => '+7 912 345 67 89', 'letters' => 'abcdefghi']);

test('phone numbers typed in any format are stored as +998XXXXXXXXX', function (string $typed) {
    $student = personalStudent();
    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", ['full_name' => 'Ali', 'phone' => $typed])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post(route('leads.store'), ['full_name' => 'Vali', 'phone' => $typed])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/admin/staff', [
        'name' => 'Xodim', 'phone' => $typed, 'role' => 'reception', 'password' => 'secret123',
    ])->assertSessionHasNoErrors();

    expect(Student::value('phone'))->toBe('+998901234567')
        ->and(Lead::value('phone'))->toBe('+998901234567')
        ->and(User::where('role', 'reception')->value('phone'))->toBe('+998901234567');
})->with('phone formats');

test('invalid phone numbers are rejected', function (string $typed) {
    $student = personalStudent();
    $this->actingAs($this->admin)->put("/admin/students/{$student->id}", ['full_name' => 'Ali', 'phone' => $typed])->assertSessionHasErrors('phone');
    $this->actingAs($this->admin)->post(route('leads.store'), ['full_name' => 'Vali', 'phone' => $typed])->assertSessionHasErrors('phone');

    expect($student->fresh()->phone)->toBe('+998909990000')->and(Lead::count())->toBe(0);
})->with('bad phones');

test('the same number in another format is a duplicate', function () {
    $first = personalStudent();
    $second = personalStudent(['phone' => '+998909990001']);

    $this->actingAs($this->admin)->put("/admin/students/{$first->id}", ['full_name' => 'Ali', 'phone' => '90 123 45 67'])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->put("/admin/students/{$second->id}", ['full_name' => 'Ali 2', 'phone' => '+998 (90) 123-45-67'])->assertSessionHasErrors('phone');
});

test('branch and profile phones are normalized too', function () {
    $superadmin = User::factory()->create(['role' => 'superadmin', 'branch_id' => null]);

    $this->actingAs($superadmin)->post('/admin/branches', [
        'name' => 'Yangi', 'code' => 'new-1', 'phone' => '90 765 43 21', 'status' => 'active',
    ])->assertSessionHasNoErrors();
    expect(Branch::where('code', 'new-1')->value('phone'))->toBe('+998907654321');

    $this->actingAs($this->admin)->put('/profile', ['name' => $this->admin->name, 'phone' => '91 111 22 33'])->assertSessionHasNoErrors();
    expect($this->admin->fresh()->phone)->toBe('+998911112233');
});

test('staff can sign in with the phone typed in any format', function () {
    $user = User::factory()->create(['phone' => '+998901234567', 'branch_id' => $this->branch->id, 'role' => 'admin']);

    foreach (['90 123 45 67', '+998 (90) 123-45-67', '998901234567'] as $typed) {
        $this->post('/login', ['phone' => $typed, 'password' => '12345678']);
        $this->assertAuthenticatedAs($user);
        $this->post('/logout');
        $this->assertGuest();
    }
});

dataset('good passports', [
    'upper' => ['AB', '1234567'],
    'lower is upper-cased' => ['ab', '7654321'],
]);

test('passport series and number are accepted in the right shape', function (string $series, string $number) {
    $this->actingAs($this->admin)->post(route('leads.store'), [
        'full_name' => 'Pasport', 'phone' => '+998901112233', 'passport_series' => $series, 'passport_number' => $number,
    ])->assertSessionHasNoErrors();

    $lead = Lead::firstOrFail();
    expect($lead->passport_series)->toBe(strtoupper($series))->and($lead->passport_number)->toBe($number);
})->with('good passports');

dataset('bad passport parts', [
    'one letter' => ['passport_series', 'A'],
    'three letters' => ['passport_series', 'ABC'],
    'letter and digit' => ['passport_series', 'A1'],
    'cyrillic' => ['passport_series', 'АВ'],
    'six digits' => ['passport_number', '123456'],
    'eight digits' => ['passport_number', '12345678'],
]);

test('malformed passport data is rejected', function (string $field, string $value) {
    $this->actingAs($this->admin)->post(route('leads.store'), [
        'full_name' => 'Pasport', 'phone' => '+998901112233', $field => $value,
    ])->assertSessionHasErrors($field);
})->with('bad passport parts');

dataset('bad pinfls', [
    'thirteen digits' => '3200598012345',
    'fifteen digits' => '320059801234567',
    'first digit 7' => '72005980123456',
    'impossible date' => '33102980123456',
]);

test('a PINFL must be 14 digits with a real birth date inside', function (string $pinfl) {
    $this->actingAs($this->admin)->post(route('leads.store'), [
        'full_name' => 'Pinfl', 'phone' => '+998901112233', 'pinfl' => $pinfl,
    ])->assertSessionHasErrors('pinfl');

    expect(Lead::count())->toBe(0);
})->with('bad pinfls');

test('a PINFL has to agree with the entered birth date', function () {
    $payload = ['full_name' => 'Pinfl', 'phone' => '+998901112233', 'pinfl' => '32005980123456'];

    $this->actingAs($this->admin)->post(route('leads.store'), [...$payload, 'birth_date' => '1999-05-20'])->assertSessionHasErrors('pinfl');
    $this->actingAs($this->admin)->post(route('leads.store'), [...$payload, 'birth_date' => '1998-05-20'])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post(route('leads.store'), [...$payload, 'phone' => '+998901112244'])->assertSessionHasNoErrors();

    expect(Lead::count())->toBe(2);
});

test('birth dates cannot lie in the future or before 1930', function () {
    $base = ['full_name' => 'Sana', 'phone' => '+998901112233'];

    $this->actingAs($this->admin)->post(route('leads.store'), [...$base, 'birth_date' => now()->addDay()->toDateString()])->assertSessionHasErrors('birth_date');
    $this->actingAs($this->admin)->post(route('leads.store'), [...$base, 'birth_date' => '1920-01-01'])->assertSessionHasErrors('birth_date');
    $this->actingAs($this->admin)->post(route('leads.store'), [...$base, 'birth_date' => '2000-01-31'])->assertSessionHasNoErrors();
});

test('an old invalid value does not block saving a lead until it is changed', function () {
    $lead = Lead::create(['branch_id' => $this->branch->id, 'full_name' => 'Eski', 'phone' => '+998901112233', 'stage' => 'new_lead', 'source' => 'reception_manual']);
    $lead->pinfl = '12345678901234';
    $lead->passport_series = 'AA1';
    $lead->save();

    $this->actingAs($this->admin)->put(route('leads.update', $lead), [
        'notes' => 'Faqat izoh', 'pinfl' => '12345678901234', 'passport_series' => 'AA1',
    ])->assertSessionHasNoErrors();
    expect($lead->fresh()->notes)->toBe('Faqat izoh');

    $this->actingAs($this->admin)->put(route('leads.update', $lead), ['pinfl' => '12345678901235'])->assertSessionHasErrors('pinfl');
});

test('telegram ids accept digits only', function () {
    $student = personalStudent(['telegram_id' => '555000111']);
    $put = fn (string $telegramId) => $this->actingAs($this->admin)->put("/admin/students/{$student->id}", [
        'full_name' => 'Tg', 'phone' => $student->phone, 'telegram_id' => $telegramId,
    ]);

    $put('username')->assertSessionHasErrors('telegram_id');
    $put('')->assertSessionHasNoErrors();
    expect($student->fresh()->telegram_id)->toBeNull();

    $put('123')->assertSessionHasErrors('telegram_id');
    $put('123456789')->assertSessionHasNoErrors();
    expect($student->fresh()->telegram_id)->toBe('123456789');
});

test('vehicle plates are normalized and checked', function () {
    $payload = ['model' => 'Cobalt', 'fuel_type' => 'petrol', 'status' => 'active'];

    $this->actingAs($this->admin)->post('/admin/vehicles', [...$payload, 'plate_number' => '01 a 123 bc'])->assertSessionHasNoErrors();
    expect(Vehicle::value('plate_number'))->toBe('01A123BC');

    $this->actingAs($this->admin)->post('/admin/vehicles', [...$payload, 'plate_number' => '01 123 abc'])->assertSessionHasNoErrors();
    expect(Vehicle::where('plate_number', '01123ABC')->exists())->toBeTrue();

    $this->actingAs($this->admin)->post('/admin/vehicles', [...$payload, 'plate_number' => 'ABC123'])->assertSessionHasErrors('plate_number');
});

test('an optional amount left empty is stored as zero', function () {
    $teacher = User::factory()->create(['role' => 'teacher', 'branch_id' => $this->branch->id, 'base_salary' => 2000000, 'lesson_rate' => 50000]);

    $this->actingAs($this->admin)->put("/admin/staff/{$teacher->id}", [
        'name' => $teacher->name, 'phone' => $teacher->phone, 'role' => 'teacher', 'base_salary' => '', 'lesson_rate' => '',
    ])->assertSessionHasNoErrors();

    expect((float) $teacher->fresh()->base_salary)->toEqual(0.0)->and((float) $teacher->fresh()->lesson_rate)->toEqual(0.0);

    $type = ContractType::create(['branch_id' => $this->branch->id, 'name' => 'T', 'category' => 'B', 'price' => 1000, 'is_active' => true]);
    $this->actingAs($this->admin)->put("/admin/contract-types/{$type->id}", [
        'name' => 'T', 'category' => 'B', 'price' => 1000, 'required_driving_lessons' => '', 'required_theory_lessons' => '', 'min_theory_payment_percent' => '',
    ])->assertSessionHasNoErrors();

    $type = $type->fresh();
    expect($type->required_driving_lessons)->toBe(0)->and($type->required_theory_lessons)->toBe(0)->and((float) $type->min_theory_payment_percent)->toEqual(0.0);
});

test('an empty discount creates a contract without discount', function () {
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $type = ContractType::create(['branch_id' => $this->branch->id, 'name' => 'T2', 'category' => 'B', 'price' => 3000000, 'is_active' => true]);

    $this->actingAs($this->admin)->post('/admin/contracts', [
        'student_id' => $student->id, 'contract_type_id' => $type->id, 'discount_amount' => '',
    ])->assertSessionHasNoErrors();

    $contract = Contract::firstOrFail();
    expect((float) $contract->discount_amount)->toEqual(0.0)->and((float) $contract->final_amount)->toEqual(3000000.0);
});

test('Phone::normalize accepts the usual spellings', function () {
    expect(Phone::normalize('901234567'))->toBe('+998901234567')
        ->and(Phone::normalize(''))->toBeNull()
        ->and(Phone::isValid('+998901234567'))->toBeTrue()
        ->and(Phone::isValid('+79123456789'))->toBeFalse();
});

test('birth dates reach the frontend as the same calendar day', function () {
    $lead = new Lead(['birth_date' => '2000-01-01']);
    $student = Student::factory()->create(['birth_date' => '2000-01-01']);

    expect($lead->toArray()['birth_date'])->toBe('2000-01-01')
        ->and($student->toArray()['birth_date'])->toBe('2000-01-01');
});
