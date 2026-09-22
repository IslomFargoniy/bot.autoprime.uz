<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\LessonMaterial;
use App\Models\Topic;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        Course::create($validated);

        return redirect()->back()->with('success', 'LMS kursi yaratildi.');
    }

    public function update(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $course->update($validated);

        return redirect()->back()->with('success', 'Kurs yangilandi.');
    }

    public function destroy(Course $course): RedirectResponse
    {
        $course->delete();

        return redirect()->back()->with('success', 'Kurs o\'chirildi.');
    }

    public function storeTopic(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'video_url' => 'nullable|url',
            'duration_minutes' => 'nullable|integer|min:1',
            'order_number' => 'nullable|integer|min:1',
        ]);

        $order = $validated['order_number'] ?? (Topic::where('course_id', $course->id)->count() + 1);

        Topic::create([
            'course_id' => $course->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'video_url' => $validated['video_url'] ?? null,
            'duration_minutes' => $validated['duration_minutes'] ?? 30,
            'order_number' => $order,
            'is_published' => true,
        ]);

        return redirect()->back()->with('success', 'Yangi mavzu qo\'shildi.');
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
}
