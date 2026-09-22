<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AutodromeController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DrivingController;
use App\Http\Controllers\Admin\GroupController;
use App\Http\Controllers\Admin\InstructorController as AdminInstructorController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\InstructorController;
use App\Http\Controllers\ProfileController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use SergiX44\Nutgram\Nutgram;

Route::post('/api/telegram', function (Nutgram $bot) {
    $bot->run();
});

Route::post('/api/telegram-auth', function (Request $request) {
    $initData = $request->input('initData') ?? $request->header('X-Telegram-Init-Data') ?? $request->query('_auth');

    if (! $initData) {
        return response()->json(['success' => false, 'message' => 'InitData topilmadi.'], 400);
    }

    $botToken = (string) (config('services.telegram.bot_token') ?? config('nutgram.token', ''));

    if (! $botToken) {
        return response()->json(['success' => false, 'message' => 'Bot Token sozlanmagan.'], 500);
    }

    parse_str($initData, $parsedData);
    if (! isset($parsedData['hash']) || ! isset($parsedData['user'])) {
        return response()->json(['success' => false, 'message' => 'Yaroqsiz Telegram ma\'lumotlari.'], 400);
    }

    $hash = $parsedData['hash'];

    // Build dataCheckArr by parsing initData parts
    $parts = explode('&', $initData);
    $dataCheckArr = [];
    foreach ($parts as $part) {
        if (str_contains($part, '=')) {
            [$key, $val] = explode('=', $part, 2);
            if ($key !== 'hash') {
                $dataCheckArr[urldecode($key)] = urldecode($key).'='.urldecode($val);
            }
        }
    }
    ksort($dataCheckArr);
    $dataCheckString = implode("\n", array_values($dataCheckArr));

    $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
    $calculatedHash = bin2hex(hash_hmac('sha256', $dataCheckString, $secretKey, true));

    $isValid = hash_equals($hash, $calculatedHash);

    if (! $isValid) {
        // Alternative calculation without urldecode if any special char diff
        $dataCheckArrAlt = [];
        unset($parsedData['hash']);
        ksort($parsedData);
        foreach ($parsedData as $k => $v) {
            $dataCheckArrAlt[] = $k.'='.$v;
        }
        $altCheckString = implode("\n", $dataCheckArrAlt);
        $altHash = bin2hex(hash_hmac('sha256', $altCheckString, $secretKey, true));

        if (hash_equals($hash, $altHash)) {
            $isValid = true;
        }
    }

    if (! $isValid) {
        return response()->json(['success' => false, 'message' => 'Telegram signaturasi noto\'g\'ri.'], 401);
    }

    $tgUser = json_decode($parsedData['user'], true);
    $telegramId = $tgUser['id'] ?? null;

    if (! $telegramId) {
        return response()->json(['success' => false, 'message' => 'Telegram ID topilmadi.'], 400);
    }

    $user = User::where('telegram_id', $telegramId)->first();
    if (! $user) {
        return response()->json(['success' => false, 'message' => 'Tizimda ushbu Telegram hisobiga biriktirilgan foydalanuvchi topilmadi.'], 404);
    }

    Auth::login($user, true);
    $request->session()->regenerate();

    $redirectUrl = route('admin.dashboard');

    return response()->json(['success' => true, 'redirect' => $redirectUrl]);
});

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
});

Route::any('/register', function () {
    return redirect('/login');
});

// For testing outside Telegram locally, we can bypass auth by adding `?test_telegram_id=111111111` for Admin
// or `?test_telegram_id=222222222` for Instructor if local environment logic is enabled in middleware.

// Starter kit dummy routes to satisfy Wayfinder / SSR build
Route::get('/settings/profile', function () {})->name('settings.profile.edit');
Route::get('/settings/security', function () {})->name('security.edit');
Route::get('/settings/appearance', function () {})->name('appearance.edit');
Route::get('/home', function () {})->name('home');

// Public route for downloading Excel template (no auth required)
Route::get('admin/groups/download-template', [GroupController::class, 'downloadTemplate'])->name('groups.download-template');

Route::middleware(['auth.telegram'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::get('/dashboard', function () {
        return redirect()->route('admin.dashboard');
    })->name('dashboard');
    // Instructor Routes
    Route::get('/instructor/dashboard', function () {
        return redirect()->route('admin.dashboard');
    })->name('instructor.dashboard');
    Route::get('/instructor/driving/create', [InstructorController::class, 'createDriving'])->name('instructor.driving.create');
    Route::post('/instructor/driving', [InstructorController::class, 'storeDriving'])->name('instructor.driving.store');
    Route::post('/instructor/driving/{driving}/finish', [InstructorController::class, 'finishDriving'])->name('instructor.driving.finish');

    // Admin Routes
    Route::get('admin/drivings/export', [DrivingController::class, 'export'])->name('drivings.export');
    Route::get('admin/students/export', [StudentController::class, 'export'])->name('students.export');
    Route::get('admin/students/search-api', [StudentController::class, 'searchApi'])->name('students.search-api');
    Route::get('admin/instructors/export', [AdminInstructorController::class, 'export'])->name('instructors.export');
    Route::get('admin/groups/{group}/export-students', [GroupController::class, 'exportStudents'])->name('groups.export-students');

    Route::get('/admin/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');
    Route::match(['get', 'post'], 'admin/select-branch', [BranchController::class, 'selectBranch'])->name('admin.select-branch');
    Route::resource('admin/instructors', AdminInstructorController::class)->except(['create', 'edit']);
    Route::post('admin/groups/{group}/import-students', [GroupController::class, 'importStudents'])->name('groups.import-students');
    Route::resource('admin/groups', GroupController::class)->except(['create', 'edit']);
    Route::resource('admin/students', StudentController::class)->except(['create', 'edit']);
    Route::resource('admin/drivings', DrivingController::class)->except(['create', 'show', 'edit']);
    Route::resource('admin/autodromes', AutodromeController::class)->except(['create', 'show', 'edit']);
    Route::resource('admin/admins', AdminController::class)->except(['create', 'show', 'edit']);
    Route::resource('admin/branches', BranchController::class)->except(['create', 'show', 'edit']);
});
