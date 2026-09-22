<?php

use App\Models\User;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->put(route('profile.update'), [
            'name' => 'Test User',
            'phone' => '+998901234599',
        ]);

    $response->assertSessionHasNoErrors();

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->phone)->toBe('+998901234599');
});
