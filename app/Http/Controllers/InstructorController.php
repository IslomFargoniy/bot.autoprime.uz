<?php

namespace App\Http\Controllers;

use App\Jobs\SendDrivingCreatedNotificationJob;
use App\Models\Driving;
use App\Models\Group;
use App\Models\Student;
use App\Models\Vehicle;
use App\Services\DrivingScheduler;
use App\Services\TelegramService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InstructorController extends Controller
{
    /**
     * Show the instructor dashboard.
     */
    public function dashboard(Request $request): Response
    {
        $user = $request->user();

        // Load groups assigned to this instructor
        $groups = Group::withCount('students')
            ->where('instructor_id', $user->id)
            ->get();

        // Load upcoming drivings
        $upcomingDrivings = Driving::with(['student', 'group', 'autodrome'])
            ->where('instructor_id', $user->id)
            ->where('status', 'scheduled')
            ->orderBy('start_time', 'asc')
            ->take(10)
            ->get();

        return Inertia::render('Instructor/Dashboard', [
            'groups' => $groups,
            'upcomingDrivings' => $upcomingDrivings,
        ]);
    }

    /**
     * Show the form for creating a new driving lesson.
     */
    public function createDriving(Request $request): Response
    {
        $user = $request->user();

        // Load groups with students for the select dropdowns
        $groups = Group::with('students')
            ->where('instructor_id', $user->id)
            ->get();

        return Inertia::render('Instructor/CreateDriving', [
            'groups' => $groups,
        ]);
    }

    /**
     * Store a newly created driving lesson.
     */
    public function storeDriving(Request $request)
    {
        $validated = $request->validate([
            'group_id' => 'required|exists:groups,id',
            'student_id' => 'required|exists:students,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        $user = $request->user();
        $student = Student::with('activeContract.contractType', 'group')->findOrFail($validated['student_id']);

        if ($student->group?->instructor_id !== $user->id) {
            throw ValidationException::withMessages(['student_id' => 'Siz faqat o\'z guruhingiz o\'quvchilariga dars belgilay olasiz.']);
        }

        // Same rules as the admin scheduler: no double booking, 75% payment, valid contract.
        $scheduler = app(DrivingScheduler::class);
        $vehicle = Vehicle::where('instructor_id', $user->id)->where('status', 'active')->first();
        $problem = $scheduler->conflictMessage($user->id, $vehicle, [$student->id], $validated['start_time'], $validated['end_time'])
            ?? $scheduler->studentRestrictionMessage($student, $validated['start_time']);
        if ($problem) {
            throw ValidationException::withMessages(['start_time' => $problem]);
        }

        $driving = Driving::create([
            'branch_id' => $user->branch_id ?? $student->branch_id,
            'instructor_id' => $user->id,
            'group_id' => $student->group_id,
            'student_id' => $student->id,
            'contract_id' => $student->activeContract?->id,
            'vehicle_id' => $vehicle?->id,
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'status' => 'scheduled',
        ]);

        SendDrivingCreatedNotificationJob::dispatch($driving);

        return redirect()->route('admin.dashboard');
    }

    /**
     * Finish a driving session with geolocation check.
     */
    public function finishDriving(Request $request, Driving $driving)
    {
        $user = $request->user();

        if ($driving->instructor_id !== $user->id) {
            throw ValidationException::withMessages(['general' => 'Sizga tegishli bo\'lmagan dars']);
        }

        if ($driving->status !== 'scheduled') {
            throw ValidationException::withMessages(['general' => 'Faqat rejalashtirilgan darsni yakunlash mumkin.']);
        }

        $requiresLocation = (bool) $driving->autodrome;
        if ($requiresLocation) {
            $request->validate([
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
            ]);
        }

        $problem = app(DrivingScheduler::class)->completionRestriction(
            $driving,
            $driving->start_time,
            $requiresLocation,
            $request->input('latitude'),
            $request->input('longitude'),
        );
        if ($problem) {
            throw ValidationException::withMessages([$requiresLocation ? 'location' : 'general' => $problem]);
        }

        $driving->update(['status' => 'completed']);
        app(TelegramService::class)->sendLessonRatingPrompt($driving);

        return redirect()->back()->with('success', 'Dars muvaffaqiyatli yakunlandi');
    }
}
