<?php

use App\Models\Branch;
use App\Models\Course;
use App\Models\LessonMaterial;
use App\Models\Topic;
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

test('deleting a topic removes its materials and renumbers the rest', function () {
    $topics = collect(['1 mavzu', '2 mavzu', '3 mavzu'])->map(fn ($title, $i) => Topic::create([
        'course_id' => $this->course->id,
        'title_uz' => $title,
        'order_number' => $i + 1,
        'is_active' => true,
    ]));
    $material = LessonMaterial::create(['topic_id' => $topics[1]->id, 'title' => 'PDF', 'file_url' => 'https://example.com/a.pdf', 'file_type' => 'pdf']);

    $this->actingAs($this->admin)
        ->delete("/admin/topics/{$topics[1]->id}")
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(Topic::find($topics[1]->id))->toBeNull()
        ->and(LessonMaterial::find($material->id))->toBeNull()
        ->and($this->course->topics()->get()->map(fn ($t) => [$t->title, $t->order_number])->all())
        ->toBe([['1 mavzu', 1], ['3 mavzu', 2]]);
});

test('a single material can be deleted', function () {
    $topic = Topic::create(['course_id' => $this->course->id, 'title_uz' => '1 mavzu', 'order_number' => 1, 'is_active' => true]);
    $material = LessonMaterial::create(['topic_id' => $topic->id, 'title' => 'PDF', 'file_url' => 'https://example.com/a.pdf', 'file_type' => 'pdf']);

    $this->actingAs($this->admin)->delete("/admin/materials/{$material->id}")->assertRedirect();

    expect(LessonMaterial::find($material->id))->toBeNull()
        ->and(Topic::find($topic->id))->not->toBeNull();
});

test('users without the materials permission cannot delete topics', function () {
    $topic = Topic::create(['course_id' => $this->course->id, 'title_uz' => '1 mavzu', 'order_number' => 1, 'is_active' => true]);
    $instructor = User::factory()->create(['role' => 'instructor', 'branch_id' => $this->admin->branch_id]);

    $this->actingAs($instructor)->delete("/admin/topics/{$topic->id}")->assertForbidden();

    expect(Topic::find($topic->id))->not->toBeNull();
});
