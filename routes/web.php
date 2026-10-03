<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AttendanceController;
use App\Http\Controllers\Admin\AutodromeController;
use App\Http\Controllers\Admin\BranchController;
use App\Http\Controllers\Admin\CashRegisterController;
use App\Http\Controllers\Admin\CertificateController;
use App\Http\Controllers\Admin\ContractController;
use App\Http\Controllers\Admin\ContractTypeController;
use App\Http\Controllers\Admin\CourseController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DrivingController;
use App\Http\Controllers\Admin\ExpenseCategoryController;
use App\Http\Controllers\Admin\FinanceController;
use App\Http\Controllers\Admin\GroupController;
use App\Http\Controllers\Admin\InstructorController as AdminInstructorController;
use App\Http\Controllers\Admin\LeadController;
use App\Http\Controllers\Admin\SalaryController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\TestController;
use App\Http\Controllers\Admin\VehicleController;
use App\Http\Controllers\Api\Desktop\DesktopAuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Student\MiniAppController;
use App\Http\Controllers\Student\StudentTestController;
use App\Models\User;
use App\Services\TelegramInitDataValidator;
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

    $telegramId = TelegramInitDataValidator::telegramUserId($initData);

    if (! $telegramId) {
        return response()->json(['success' => false, 'message' => 'Telegram signaturasi noto\'g\'ri yoki muddati o\'tgan.'], 401);
    }

    $user = User::where('telegram_id', $telegramId)->first();
    if (! $user) {
        return response()->json(['success' => false, 'message' => 'Tizimda ushbu Telegram hisobiga biriktirilgan foydalanuvchi topilmadi.'], 404);
    }

    if (! $user->canSignIn()) {
        return response()->json(['success' => false, 'message' => 'Hisobingiz faolsizlantirilgan yoki filialga biriktirilmagan. Administratorga murojaat qiling.'], 403);
    }

    Auth::login($user, true);
    $request->session()->regenerate();

    $redirectUrl = url($user->homeUrl());

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

// Student TMA & Dynamic QR Verification (Public / WebApp authenticated)
Route::get('/mini-app', [MiniAppController::class, 'index'])->name('student.mini-app');
Route::post('/api/attendance/scan-qr', [MiniAppController::class, 'scanQr'])->name('attendance.scan-qr');
Route::get('/certificates/verify/{hash}', [CertificateController::class, 'verify'])->name('certificates.verify');

// Student Tests & Mock Exam Endpoints (TMA & Desktop)
Route::get('/api/tests/tickets', [StudentTestController::class, 'getTickets'])->middleware('throttle:60,1')->name('tests.tickets');
Route::get('/api/tests/ticket/{ticket}', [StudentTestController::class, 'getTicketQuestions'])->middleware('throttle:60,1')->name('tests.ticket.questions');
Route::get('/api/tests/exam', [StudentTestController::class, 'getMockExam'])->middleware('throttle:20,1')->name('tests.exam');
Route::post('/api/tests/submit', [StudentTestController::class, 'submitAttempt'])->middleware('throttle:30,1')->name('tests.submit');
Route::get('/api/tests/signs', [StudentTestController::class, 'getSigns'])->name('tests.signs');
Route::get('/api/tests/stats', [StudentTestController::class, 'getStudentStats'])->name('tests.stats');

// Desktop Application Endpoints (Auto-Update, Telegram OTP Auth & Single Session Dashboard)
Route::get('/api/desktop/version-check', [DesktopAuthController::class, 'versionCheck'])->name('desktop.version-check');
Route::post('/api/desktop/auth/send-otp', [DesktopAuthController::class, 'sendOtp'])->middleware('throttle:10,1')->name('desktop.send-otp');
Route::post('/api/desktop/auth/verify-otp', [DesktopAuthController::class, 'verifyOtp'])->middleware('throttle:20,1')->name('desktop.verify-otp');
Route::get('/api/desktop/auth/ping', [DesktopAuthController::class, 'ping'])->name('desktop.ping');
Route::get('/api/desktop/student/dashboard', [DesktopAuthController::class, 'dashboard'])->name('desktop.dashboard');

Route::middleware(['auth.telegram', 'branch.access'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::get('/dashboard', function (Request $request) {
        return redirect($request->user()->homeUrl());
    })->name('dashboard');

    // Admin Routes
    Route::get('/admin/dashboard', [DashboardController::class, 'index'])->middleware('permission:dashboard.view')->name('admin.dashboard');
    Route::match(['get', 'post'], 'admin/select-branch', [BranchController::class, 'selectBranch'])->name('admin.select-branch');

    // Drivings & Autodromes
    Route::get('admin/drivings/export', [DrivingController::class, 'export'])->middleware('permission:drivings.view')->name('drivings.export');
    Route::resource('admin/drivings', DrivingController::class)->except(['create', 'show', 'edit'])
        ->middlewareFor('index', 'permission:drivings.view')
        ->middlewareFor(['store', 'update', 'destroy'], 'permission:drivings.manage');
    Route::resource('admin/autodromes', AutodromeController::class)->except(['create', 'show', 'edit'])
        ->middleware('permission:autodromes.manage');

    // Students & Groups
    Route::get('admin/students/export', [StudentController::class, 'export'])->middleware('permission:students.view')->name('students.export');
    Route::get('admin/students/search-api', [StudentController::class, 'searchApi'])->middleware('permission:students.view')->name('students.search-api');
    Route::resource('admin/students', StudentController::class)->except(['create', 'store', 'edit'])
        ->middlewareFor(['index', 'show'], 'permission:students.view')
        ->middlewareFor('update', 'permission:students.edit')
        ->middlewareFor('destroy', 'permission:students.delete');
    Route::get('admin/groups/{group}/export-students', [GroupController::class, 'exportStudents'])->middleware('permission:groups.view')->name('groups.export-students');
    Route::resource('admin/groups', GroupController::class)->except(['create', 'edit'])
        ->middlewareFor(['index', 'show'], 'permission:groups.view')
        ->middlewareFor(['store', 'update', 'destroy'], 'permission:groups.manage');

    // Staff, Instructors, Admins & Branches
    Route::get('admin/instructors/export', [AdminInstructorController::class, 'export'])->middleware('permission:users.view')->name('instructors.export');
    Route::resource('admin/instructors', AdminInstructorController::class)->except(['create', 'edit'])
        ->middlewareFor(['index', 'show'], 'permission:users.view')
        ->middlewareFor(['store', 'update', 'destroy'], 'permission:users.manage');
    Route::put('admin/staff/{staff}/permissions', [StaffController::class, 'updatePermissions'])->middleware('permission:roles.manage')->name('staff.update-permissions');
    Route::resource('admin/staff', StaffController::class)->except(['create', 'edit'])
        ->middlewareFor(['index', 'show'], 'permission:users.view')
        ->middlewareFor(['store', 'update', 'destroy'], 'permission:users.manage');
    Route::resource('admin/admins', AdminController::class)->except(['create', 'show', 'edit'])
        ->middleware('role:superadmin');
    Route::resource('admin/branches', BranchController::class)->except(['create', 'show', 'edit'])
        ->middlewareFor('index', 'permission:branches.view')
        ->middlewareFor(['store', 'update', 'destroy'], 'permission:branches.manage');

    // CRM Leads
    Route::get('admin/leads', [LeadController::class, 'index'])->middleware('permission:crm.view')->name('leads.index');
    Route::middleware('permission:leads.manage')->group(function () {
        Route::post('admin/leads', [LeadController::class, 'store'])->name('leads.store');
        Route::put('admin/leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
        Route::post('admin/leads/{lead}/convert', [LeadController::class, 'convert'])->middleware('permission:contracts.create')->name('leads.convert');
        Route::delete('admin/leads/{lead}', [LeadController::class, 'destroy'])->name('leads.destroy');
    });

    // Contract Types & Tariffs
    Route::resource('admin/contract-types', ContractTypeController::class)->except(['create', 'show', 'edit'])
        ->middlewareFor('index', 'permission:contracts.view|contract_types.manage')
        ->middlewareFor(['store', 'update', 'destroy'], 'permission:contract_types.manage');

    // Contracts
    Route::get('admin/contracts/{contract}/download-pdf', [ContractController::class, 'downloadPdf'])->middleware('permission:contracts.print')->name('contracts.download-pdf');
    Route::post('admin/contracts/{contract}/refund', [ContractController::class, 'refund'])->middleware('permission:payments.edit')->name('contracts.refund');
    Route::resource('admin/contracts', ContractController::class)->except(['create', 'edit'])
        ->middlewareFor(['index', 'show'], 'permission:contracts.view')
        ->middlewareFor('store', 'permission:contracts.create')
        ->middlewareFor(['update', 'destroy'], 'permission:contracts.edit');

    // Finance & Cash Registers
    Route::get('admin/finance', [FinanceController::class, 'index'])->middleware('permission:finance.view')->name('finance.index');
    Route::get('admin/finance/payment/{payment}/receipt', [FinanceController::class, 'paymentReceipt'])->middleware('permission:finance.view|payments.create')->name('finance.payment-receipt');
    Route::get('admin/finance/expense/{expense}/receipt', [FinanceController::class, 'expenseReceipt'])->middleware('permission:finance.view|expenses.create')->name('finance.expense-receipt');
    Route::post('admin/finance/payment', [FinanceController::class, 'storePayment'])->middleware('permission:payments.create')->name('finance.store-payment');
    Route::delete('admin/finance/payment/{payment}', [FinanceController::class, 'destroyPayment'])->middleware('permission:payments.edit')->name('finance.destroy-payment');
    Route::post('admin/finance/expense', [FinanceController::class, 'storeExpense'])->middleware('permission:expenses.create')->name('finance.store-expense');
    Route::delete('admin/finance/expense/{expense}', [FinanceController::class, 'destroyExpense'])->middleware('permission:expenses.delete')->name('finance.destroy-expense');
    Route::post('admin/finance/transfer', [FinanceController::class, 'createTransfer'])->middleware('permission:cash_transfers.create')->name('finance.create-transfer');
    Route::post('admin/finance/transfer/{transfer}/approve', [FinanceController::class, 'approveTransfer'])->middleware('permission:cash_transfers.approve')->name('finance.approve-transfer');
    Route::post('admin/finance/transfer/{transfer}/reject', [FinanceController::class, 'rejectTransfer'])->middleware('permission:cash_transfers.approve')->name('finance.reject-transfer');
    Route::post('admin/finance/sweep', [FinanceController::class, 'sweepRegisters'])->middleware('permission:cash_transfers.create')->name('finance.sweep');
    Route::post('admin/expense-categories', [ExpenseCategoryController::class, 'store'])->middleware('permission:expense_categories.manage')->name('expense-categories.store');
    Route::put('admin/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->middleware('permission:expense_categories.manage')->name('expense-categories.update');
    Route::delete('admin/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->middleware('permission:expense_categories.manage')->name('expense-categories.destroy');
    Route::post('admin/cash-registers', [CashRegisterController::class, 'store'])->middleware('permission:cash_registers.manage')->name('cash-registers.store');
    Route::put('admin/cash-registers/{cashRegister}', [CashRegisterController::class, 'update'])->middleware('permission:cash_registers.manage')->name('cash-registers.update');
    Route::delete('admin/cash-registers/{cashRegister}', [CashRegisterController::class, 'destroy'])->middleware('permission:cash_registers.manage')->name('cash-registers.destroy');

    // Payroll & Salaries
    Route::get('admin/salaries', [SalaryController::class, 'index'])->middleware('permission:salaries.view')->name('salaries.index');
    Route::post('admin/salaries/generate', [SalaryController::class, 'generateMonthlyPayroll'])->middleware('permission:salaries.accrue')->name('salaries.generate');
    Route::post('admin/salaries/adjustment', [SalaryController::class, 'storeCustomAdjustment'])->middleware('permission:salaries.accrue')->name('salaries.store-adjustment');
    Route::post('admin/salaries/{salary}/pay', [SalaryController::class, 'pay'])->middleware('permission:salaries.pay')->name('salaries.pay');
    Route::delete('admin/salaries/{salary}', [SalaryController::class, 'destroyAdjustment'])->middleware('permission:salaries.accrue')->name('salaries.destroy-adjustment');

    // Attendance & Dynamic QR
    Route::middleware('permission:attendance.view')->group(function () {
        Route::get('admin/attendance', [AttendanceController::class, 'index'])->name('attendance.index');
        Route::get('admin/attendance/session/{session}/screen', [AttendanceController::class, 'sessionScreen'])->name('attendance.screen');
        Route::get('admin/attendance/session/{session}/qr', [AttendanceController::class, 'getRotatingQr'])->name('attendance.rotating-qr');
        Route::get('admin/attendance/group-attendances', [AttendanceController::class, 'getGroupAttendances'])->name('attendance.group-attendances');
    });
    Route::middleware('permission:attendance.start_session')->group(function () {
        Route::post('admin/attendance/start-session', [AttendanceController::class, 'startSession'])->name('attendance.start-session');
        Route::post('admin/attendance/session/{session}/finish', [AttendanceController::class, 'finishSession'])->name('attendance.finish-session');
    });
    Route::middleware('permission:attendance.mark_manual')->group(function () {
        Route::post('admin/attendance/mark-manual', [AttendanceController::class, 'markManual'])->name('attendance.mark-manual');
        Route::post('admin/attendance/mark-group', [AttendanceController::class, 'markGroup'])->name('attendance.mark-group');
    });

    // Certificates & Graduation
    Route::get('admin/certificates', [CertificateController::class, 'index'])->middleware('permission:certificates.view')->name('certificates.index');
    Route::post('admin/certificates', [CertificateController::class, 'store'])->middleware('permission:certificates.create')->name('certificates.store');
    Route::post('admin/certificates/{certificate}/revoke', [CertificateController::class, 'revoke'])->middleware('permission:certificates.create')->name('certificates.revoke');
    Route::get('admin/certificates/{certificate}/download-pdf', [CertificateController::class, 'downloadPdf'])->middleware('permission:certificates.print')->name('certificates.download-pdf');

    // Courses & LMS
    Route::resource('admin/courses', CourseController::class)->except(['create', 'show', 'edit'])
        ->middlewareFor('index', 'permission:lms.view')
        ->middlewareFor(['store', 'update', 'destroy'], 'permission:lms.manage_materials');
    Route::post('admin/courses/{course}/topics', [CourseController::class, 'storeTopic'])->middleware('permission:lms.manage_materials')->name('courses.store-topic');
    Route::post('admin/topics/{topic}/materials', [CourseController::class, 'storeMaterial'])->middleware('permission:lms.manage_materials')->name('topics.store-material');
    Route::put('admin/topics/{topic}', [CourseController::class, 'updateTopic'])->middleware('permission:lms.manage_materials')->name('topics.update');
    Route::delete('admin/topics/{topic}', [CourseController::class, 'destroyTopic'])->middleware('permission:lms.manage_materials')->name('topics.destroy');
    Route::put('admin/materials/{material}', [CourseController::class, 'updateMaterial'])->middleware('permission:lms.manage_materials')->name('materials.update');
    Route::delete('admin/materials/{material}', [CourseController::class, 'destroyMaterial'])->middleware('permission:lms.manage_materials')->name('materials.destroy');

    // Tests & Questions Management
    Route::get('admin/tests', [TestController::class, 'index'])->middleware('permission:tickets.manage|attempts.view')->name('tests.index');
    Route::middleware('permission:tickets.manage')->group(function () {
        Route::post('admin/tests/tickets', [TestController::class, 'storeTicket'])->name('tests.tickets.store');
        Route::put('admin/tests/tickets/{ticket}', [TestController::class, 'updateTicket'])->name('tests.tickets.update');
        Route::delete('admin/tests/tickets/{ticket}', [TestController::class, 'destroyTicket'])->name('tests.tickets.destroy');

        Route::post('admin/tests/questions', [TestController::class, 'storeQuestion'])->name('tests.questions.store');
        Route::put('admin/tests/questions/{question}', [TestController::class, 'updateQuestion'])->name('tests.questions.update');
        Route::delete('admin/tests/questions/{question}', [TestController::class, 'destroyQuestion'])->name('tests.questions.destroy');

        Route::post('admin/tests/signs', [TestController::class, 'storeSign'])->name('tests.signs.store');
        Route::put('admin/tests/signs/{sign}', [TestController::class, 'updateSign'])->name('tests.signs.update');
        Route::delete('admin/tests/signs/{sign}', [TestController::class, 'destroySign'])->name('tests.signs.destroy');

        Route::post('admin/tests/road-lines', [TestController::class, 'storeRoadLine'])->name('tests.road-lines.store');
        Route::put('admin/tests/road-lines/{roadLine}', [TestController::class, 'updateRoadLine'])->name('tests.road-lines.update');
        Route::delete('admin/tests/road-lines/{roadLine}', [TestController::class, 'destroyRoadLine'])->name('tests.road-lines.destroy');

        Route::post('admin/tests/sign-categories', [TestController::class, 'storeSignCategory'])->name('tests.sign-categories.store');
        Route::put('admin/tests/sign-categories/{signCategory}', [TestController::class, 'updateSignCategory'])->name('tests.sign-categories.update');
        Route::delete('admin/tests/sign-categories/{signCategory}', [TestController::class, 'destroySignCategory'])->name('tests.sign-categories.destroy');
    });

    // Vehicles & Fleet
    Route::resource('admin/vehicles', VehicleController::class)->except(['create', 'show', 'edit'])
        ->middlewareFor('index', 'permission:fleet.view')
        ->middlewareFor(['store', 'update', 'destroy'], 'permission:fleet.manage');
    Route::post('admin/vehicles/{vehicle}/maintenances', [VehicleController::class, 'storeMaintenance'])->middleware('permission:fleet.manage')->name('vehicles.store-maintenance');
    Route::delete('admin/vehicles/{vehicle}/maintenances/{maintenance}', [VehicleController::class, 'destroyMaintenance'])->middleware('permission:fleet.manage')->scopeBindings()->name('vehicles.destroy-maintenance');
});
