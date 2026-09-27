<?php

use App\Models\Branch;
use App\Models\Group;
use App\Models\Student;
use App\Models\User;

test('superadmin can switch branches via POST /admin/select-branch', function () {
    $branch1 = Branch::firstOrCreate(['code' => 'b1'], ['name' => 'Filial 1', 'status' => 'active']);
    $branch2 = Branch::firstOrCreate(['code' => 'b2'], ['name' => 'Filial 2', 'status' => 'active']);

    $admin = User::factory()->create(['role' => 'superadmin', 'branch_id' => $branch1->id]);

    $group1 = Group::factory()->create(['branch_id' => $branch1->id, 'name' => 'Group B1']);
    $group2 = Group::factory()->create(['branch_id' => $branch2->id, 'name' => 'Group B2']);

    $student1 = Student::factory()->create(['branch_id' => $branch1->id, 'group_id' => $group1->id, 'full_name' => 'Student B1']);
    $student2 = Student::factory()->create(['branch_id' => $branch2->id, 'group_id' => $group2->id, 'full_name' => 'Student B2']);

    // 1. Admin switches to branch 2 via POST /admin/select-branch
    $postResponse = $this->actingAs($admin)->post('/admin/select-branch', ['branch_id' => (string) $branch2->id]);
    $postResponse->assertRedirect();
    $postResponse->assertSessionHas('selected_branch_id', (string) $branch2->id);

    // 2. Admin visits students page with active session
    $studentsResponse = $this->actingAs($admin)
        ->withSession(['selected_branch_id' => (string) $branch2->id])
        ->get('/admin/students');
    $studentsResponse->assertOk();
    $studentsInertia = $studentsResponse->inertiaProps();
    expect($studentsInertia['filters']['branch_id'])->toBe((string) $branch2->id);

    // Verify only students from branch 2 are returned
    $studentsData = $studentsInertia['students']['data'];
    foreach ($studentsData as $st) {
        expect($st['branch_id'])->toBe($branch2->id);
    }

    // 3. Admin switches to "Barcha filiallar" (empty branch_id)
    $clearResponse = $this->actingAs($admin)->post('/admin/select-branch', ['branch_id' => '']);
    $clearResponse->assertRedirect();
    $clearResponse->assertSessionHas('selected_branch_id', 'all');

    // 4. Visiting groups shows all groups
    $groupsResponse = $this->actingAs($admin)->get('/admin/groups');
    $groupsResponse->assertOk();
    $groupsInertia = $groupsResponse->inertiaProps();
    expect($groupsInertia['filters']['branch_id'])->toBeNull();
});

test('subordinate branch admin cannot switch branches', function () {
    $branch1 = Branch::firstOrCreate(['code' => 'b1'], ['name' => 'Filial 1', 'status' => 'active']);
    $branch2 = Branch::firstOrCreate(['code' => 'b2'], ['name' => 'Filial 2', 'status' => 'active']);

    $subAdmin = User::factory()->create(['id' => 99, 'role' => 'admin', 'branch_id' => $branch1->id]);

    $postResponse = $this->actingAs($subAdmin)->post('/admin/select-branch', ['branch_id' => (string) $branch2->id]);
    $postResponse->assertStatus(403);
});
