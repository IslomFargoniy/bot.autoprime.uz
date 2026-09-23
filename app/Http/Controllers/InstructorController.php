<?php

namespace App\Http\Controllers;

use App\Jobs\SendDrivingCreatedNotificationJob;
use App\Models\Driving;
use App\Models\Group;
use App\Models\Student;
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
        $request->validate([
            'group_id' => 'required|exists:groups,id',
            'student_id' => 'required|exists:students,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        $user = $request->user();
        $student = Student::find($request->student_id);
        $groupId = $student ? $student->group_id : $request->group_id;

        $driving = Driving::create([
            'branch_id' => $user->branch_id ?? ($student ? $student->branch_id : null),
            'instructor_id' => $user->id,
            'group_id' => $groupId,
            'student_id' => $request->student_id,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
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

        $autodrome = $driving->autodrome;

        if (! $autodrome) {
            // If no autodrome is assigned, just finish it without requiring location
            $driving->update(['status' => 'completed']);
            app(TelegramService::class)->sendLessonRatingPrompt($driving);

            return redirect()->back();
        }

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $distance = $this->haversineGreatCircleDistance(
            $request->latitude,
            $request->longitude,
            $autodrome->latitude,
            $autodrome->longitude
        );

        if ($distance > $autodrome->radius_meters) {
            throw ValidationException::withMessages([
                'location' => 'Siz avtodrom hududida emassiz. Masofangiz: '.round($distance)." metr (Ruxsat etilgan: {$autodrome->radius_meters} metr).",
            ]);
        }

        $driving->update(['status' => 'completed']);
        app(TelegramService::class)->sendLessonRatingPrompt($driving);

        return redirect()->back()->with('success', 'Dars muvaffaqiyatli yakunlandi');
    }

    /**
     * Calculates the great-circle distance between two points, with
     * the Haversine formula. Returns distance in meters.
     */
    private function haversineGreatCircleDistance($latitudeFrom, $longitudeFrom, $latitudeTo, $longitudeTo)
    {
        $earthRadius = 6371000; // Earth radius in meters

        $latFrom = deg2rad($latitudeFrom);
        $lonFrom = deg2rad($longitudeFrom);
        $latTo = deg2rad($latitudeTo);
        $lonTo = deg2rad($longitudeTo);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));

        return $angle * $earthRadius;
    }
}
