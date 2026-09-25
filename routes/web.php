<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AttendanceController;
use App\Http\Controllers\Admin\AutodromeController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\CertificateController;
use App\Http\Controllers\Admin\ContractController;
use App\Http\Controllers\Admin\ContractTypeController;
use App\Http\Controllers\Admin\CourseController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DrivingController;
use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\GroupController;
use App\Http\Controllers\Admin\InstructorController as AdminInstructorController;
use App\Http\Controllers\Admin\LeadController;
use App\Http\Controllers\Admin\SalaryController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\VehicleController;
use App\Http\Controllers\InstructorController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Student\MiniAppController;
use App\Http\Controllers\Student\Prava24Controller;
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

// Student TMA & Dynamic QR Verification (Public / WebApp authenticated)
Route::get('/mini-app', [MiniAppController::class, 'index'])->name('student.mini-app');
Route::post('/api/attendance/scan-qr', [MiniAppController::class, 'scanQr'])->name('attendance.scan-qr');
Route::get('/certificates/verify/{hash}', [CertificateController::class, 'verify'])->name('certificates.verify');

// Prava24 Tests & Mock Exam Endpoints
Route::get('/api/prava24/tickets', [Prava24Controller::class, 'getTickets'])->name('prava24.tickets');
Route::get('/api/prava24/ticket/{ticket}', [Prava24Controller::class, 'getTicketQuestions'])->name('prava24.ticket.questions');
Route::get('/api/prava24/exam', [Prava24Controller::class, 'getMockExam'])->name('prava24.exam');
Route::post('/api/prava24/submit', [Prava24Controller::class, 'submitAttempt'])->name('prava24.submit');
Route::get('/api/prava24/signs', [Prava24Controller::class, 'getSigns'])->name('prava24.signs');
Route::get('/api/prava24/stats', [Prava24Controller::class, 'getStudentStats'])->name('prava24.stats');

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

    // CRM Leads
    Route::get('admin/leads', [LeadController::class, 'index'])->name('leads.index');
    Route::post('admin/leads', [LeadController::class, 'store'])->name('leads.store');
    Route::put('admin/leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
    Route::post('admin/leads/{lead}/convert', [LeadController::class, 'convert'])->name('leads.convert');
    Route::delete('admin/leads/{lead}', [LeadController::class, 'destroy'])->name('leads.destroy');

    // Contract Types & Tariffs
    Route::resource('admin/contract-types', ContractTypeController::class)->except(['create', 'show', 'edit']);

    // Contracts
    Route::get('admin/contracts/{contract}/download-pdf', [ContractController::class, 'downloadPdf'])->name('contracts.download-pdf');
    Route::resource('admin/contracts', ContractController::class)->except(['create', 'edit']);

    // Finance & Cash Registers
    Route::get('admin/finance', [FinanceController::class, 'index'])->name('finance.index');
    Route::post('admin/finance/payment', [FinanceController::class, 'storePayment'])->name('finance.store-payment');
    Route::post('admin/finance/expense', [FinanceController::class, 'storeExpense'])->name('finance.store-expense');
    Route::post('admin/finance/transfer', [FinanceController::class, 'createTransfer'])->name('finance.create-transfer');
    Route::post('admin/finance/transfer/{transfer}/approve', [FinanceController::class, 'approveTransfer'])->name('finance.approve-transfer');
    Route::post('admin/finance/shift', [FinanceController::class, 'toggleShift'])->name('finance.toggle-shift');

    // Payroll & Salaries
    Route::get('admin/salaries', [SalaryController::class, 'index'])->name('salaries.index');
    Route::post('admin/salaries/generate', [SalaryController::class, 'generateMonthlyPayroll'])->name('salaries.generate');
    Route::post('admin/salaries/adjustment', [SalaryController::class, 'storeCustomAdjustment'])->name('salaries.store-adjustment');
    Route::post('admin/salaries/{salary}/pay', [SalaryController::class, 'pay'])->name('salaries.pay');

    // Attendance & Dynamic QR
    Route::get('admin/attendance', [AttendanceController::class, 'index'])->name('attendance.index');
    Route::post('admin/attendance/start-session', [AttendanceController::class, 'startSession'])->name('attendance.start-session');
    Route::get('admin/attendance/session/{session}/screen', [AttendanceController::class, 'sessionScreen'])->name('attendance.screen');
    Route::get('admin/attendance/session/{session}/qr', [AttendanceController::class, 'getRotatingQr'])->name('attendance.rotating-qr');
    Route::post('admin/attendance/session/{session}/finish', [AttendanceController::class, 'finishSession'])->name('attendance.finish-session');
    Route::post('admin/attendance/mark-manual', [AttendanceController::class, 'markManual'])->name('attendance.mark-manual');
    Route::get('admin/attendance/group-attendances', [AttendanceController::class, 'getGroupAttendances'])->name('attendance.group-attendances');
    Route::post('admin/attendance/mark-group', [AttendanceController::class, 'markGroup'])->name('attendance.mark-group');

    // Certificates & Graduation
    Route::get('admin/certificates', [CertificateController::class, 'index'])->name('certificates.index');
    Route::post('admin/certificates', [CertificateController::class, 'store'])->name('certificates.store');
    Route::get('admin/certificates/{certificate}/download-pdf', [CertificateController::class, 'downloadPdf'])->name('certificates.download-pdf');

    // Courses & LMS
    Route::resource('admin/courses', CourseController::class)->except(['create', 'show', 'edit']);
    Route::post('admin/courses/{course}/topics', [CourseController::class, 'storeTopic'])->name('courses.store-topic');
    Route::post('admin/topics/{topic}/materials', [CourseController::class, 'storeMaterial'])->name('topics.store-material');

    // Vehicles & Fleet
    Route::resource('admin/vehicles', VehicleController::class)->except(['create', 'show', 'edit']);
    Route::post('admin/vehicles/{vehicle}/maintenances', [VehicleController::class, 'storeMaintenance'])->name('vehicles.store-maintenance');
});
