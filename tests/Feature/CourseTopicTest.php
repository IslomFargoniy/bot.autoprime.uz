<?php

use App\Models\Branch;
use App\Models\Course;
use App\Models\User;

beforeEach(function () {
    $branch = Branch::firstOrCreate(['code' => 'course-branch'], ['name' => 'Kurs Filial', 'status' => 'active']);
    $this->admin = User::factory()->create(['role' => 'admin', 'branch_id' => $branch->id]);
    $this->course = Course::create(['name' => 'A toifa', 'category' => 'A', 'is_active' => true]);
});

test('a new topic is in the course list returned right after saving it', function () {
    $this->actingAs($this->admin)
        ->from('/admin/courses')
        ->post("/admin/courses/{$this->course->id}/topics", ['title' => '1 mavzu', 'duration_minutes' => 30])
        ->assertRedirect('/admin/courses');

    $this->actingAs($this->admin)
        ->post("/admin/courses/{$this->course->id}/topics", ['title' => '2 mavzu', 'duration_minutes' => 30]);

    $this->actingAs($this->admin)
        ->get('/admin/courses')
        ->assertInertia(fn ($page) => $page
            ->where('courses.0.topics', fn ($topics) => collect($topics)->pluck('title')->all() === ['1 mavzu', '2 mavzu']
                && collect($topics)->pluck('order_number')->all() === [1, 2]));
});
