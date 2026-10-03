<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\LessonMaterial;
use App\Models\Topic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    public function index(): Response
    {
        $courses = Course::with(['topics.lessonMaterials'])->orderBy('category')->get();

        return Inertia::render('Admin/Courses/Index', [
            'courses' => $courses,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|in:A,B,C,BC,D,E|unique:courses,category',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        Course::create([
            'name' => $validated['title'],
            'category' => $validated['category'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', 'LMS kursi yaratildi.');
    }

    public function update(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $course->update([
            'name' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', 'Kurs yangilandi.');
    }

    public function destroy(Course $course): RedirectResponse
    {
        if ($course->groups()->exists()) {
            return redirect()->back()->withErrors([
                'delete' => 'Kurs guruhlarga biriktirilgan. Avval guruhlardan olib tashlang yoki kursni nofaol qiling.',
            ]);
        }

        $course->delete();

        return redirect()->back()->with('success', 'Kurs o\'chirildi.');
    }

    /**
     * @return array<string, mixed>
     */
    private function topicRules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'video_url' => 'nullable|url',
            'duration_minutes' => 'nullable|integer|min:1',
            'order_number' => 'nullable|integer|min:1',
        ];
    }

    /**
     * Put the topic at the given place (1-based, clamped) and number the whole course 1..n,
     * so two topics never share a number. Without a place the topic keeps its turn.
     */
    private function placeTopic(Topic $topic, ?int $position): void
    {
        $others = Topic::where('course_id', $topic->course_id)
            ->whereKeyNot($topic->id)
            ->orderBy('order_number')
            ->orderBy('id')
            ->get();

        $position ??= $topic->order_number ?: $others->count() + 1;
        $index = max(0, min($position - 1, $others->count()));

        $others->splice($index, 0, [$topic]);

        $others->each(function (Topic $item, int $i): void {
            if ($item->order_number !== $i + 1) {
                $item->update(['order_number' => $i + 1]);
            }
        });
    }

    public function storeTopic(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate($this->topicRules());

        DB::transaction(function () use ($validated, $course): void {
            $topic = Topic::create([
                'course_id' => $course->id,
                'title_uz' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'video_url' => $validated['video_url'] ?? null,
                'duration_minutes' => $validated['duration_minutes'] ?? 30,
                'order_number' => 0,
                'is_active' => true,
            ]);

            $this->placeTopic($topic, $validated['order_number'] ?? PHP_INT_MAX);
        });

        return redirect()->back()->with('success', 'Yangi mavzu qo\'shildi.');
    }

    public function updateTopic(Request $request, Topic $topic): RedirectResponse
    {
        $validated = $request->validate($this->topicRules());

        DB::transaction(function () use ($validated, $topic): void {
            $topic->update([
                'title_uz' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'video_url' => $validated['video_url'] ?? null,
                'duration_minutes' => $validated['duration_minutes'] ?? $topic->duration_minutes,
            ]);

            $this->placeTopic($topic, $validated['order_number'] ?? null);
        });

        return redirect()->back()->with('success', 'Mavzu yangilandi.');
    }

    public function storeMaterial(Request $request, Topic $topic): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'file_url' => 'required|url',
            'file_type' => 'nullable|string|max:50',
        ]);

        LessonMaterial::create([
            'topic_id' => $topic->id,
            'title' => $validated['title'],
            'file_url' => $validated['file_url'],
            'file_type' => $validated['file_type'] ?? 'pdf',
        ]);

        return redirect()->back()->with('success', 'Dars materiali biriktirildi.');
    }

    /**
     * Remove a topic with its materials and close the gap in the numbering.
     */
    public function destroyTopic(Topic $topic): RedirectResponse
    {
        $courseId = $topic->course_id;

        DB::transaction(function () use ($topic, $courseId): void {
            $topic->delete();

            Topic::where('course_id', $courseId)
                ->orderBy('order_number')
                ->orderBy('id')
                ->get()
                ->each(function (Topic $remaining, int $index): void {
                    if ($remaining->order_number !== $index + 1) {
                        $remaining->update(['order_number' => $index + 1]);
                    }
                });
        });

        return redirect()->back()->with('success', 'Mavzu o\'chirildi.');
    }

    public function destroyMaterial(LessonMaterial $material): RedirectResponse
    {
        $material->delete();

        return redirect()->back()->with('success', 'Material o\'chirildi.');
    }
}
