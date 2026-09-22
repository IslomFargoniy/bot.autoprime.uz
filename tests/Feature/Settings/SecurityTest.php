<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('password can be updated through profile update', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->put(route('profile.update'), [
            'name' => $user->name,
            'phone' => $user->phone,
            'current_password' => '12345678',
            'password' => 'new-secret-password',
            'password_confirmation' => 'new-secret-password',
        ]);

    $response->assertSessionHasNoErrors();

    expect(Hash::check('new-secret-password', $user->refresh()->password))->toBeTrue();
});

test('correct password must be provided to update password', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->put(route('profile.update'), [
            'name' => $user->name,
            'phone' => $user->phone,
            'current_password' => 'wrong-password',
            'password' => 'new-secret-password',
            'password_confirmation' => 'new-secret-password',
        ]);

    $response->assertSessionHasErrors('current_password');
});
