<?php

namespace Database\Seeders;

use App\Models\Answer;
use App\Models\Attempt;
use App\Models\AttemptAnswer;
use App\Models\Attendance;
use App\Models\Autodrome;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterType;
use App\Models\CashShift;
use App\Models\CashTransfer;
use App\Models\Certificate;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Course;
use App\Models\Driving;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Group;
use App\Models\Lead;
use App\Models\LessonMaterial;
use App\Models\LessonSession;
use App\Models\Payment;
use App\Models\Question;
use App\Models\Review;
use App\Models\RoadLine;
use App\Models\Salary;
use App\Models\SalaryPayment;
use App\Models\Sign;
use App\Models\SignCategory;
use App\Models\Student;
use App\Models\Ticket;
use App\Models\Topic;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Activitylog\Models\Activity;

class ComprehensiveDemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // ---------------------------------------------------------------------
        // 1. BRANCHES
        // ---------------------------------------------------------------------
        $branchChilonzor = Branch::updateOrCreate(
            ['code' => 'chilonzor'],
            [
                'name' => 'Chilonzor filiali',
                'address' => 'Toshkent sh., Chilonzor tumani, Qatortol ko\'chasi 28-uy',
                'phone' => '+998712001122',
                'status' => 'active',
            ]
        );

        $branchYunusobod = Branch::updateOrCreate(
            ['code' => 'yunusobod'],
            [
                'name' => 'Yunusobod filiali',
                'address' => 'Toshkent sh., Yunusobod tumani, Amir Temur ko\'chasi 105-uy',
                'phone' => '+998712003344',
                'status' => 'active',
            ]
        );

        // ---------------------------------------------------------------------
        // 2. USERS (Roles & Passwords)
        // ---------------------------------------------------------------------
        $commonPassword = Hash::make('12345678');

        // Super Admin (Requested by user: +998911157709)
        $superAdmin = User::where('id', 1)
            ->orWhere('phone', '+998911157709')
            ->orWhere('email', 'admin@autoprime.uz')
            ->first();

        if ($superAdmin) {
            $superAdmin->update([
                'phone' => '+998911157709',
                'name' => 'Islombek Bosh Administrator',
                'role' => 'superadmin',
                'branch_id' => null,
                'status' => 'active',
                'password' => $commonPassword,
                'email' => 'admin@autoprime.uz',
                'base_salary' => 15000000,
            ]);
        } else {
            $superAdmin = User::create([
                'name' => 'Islombek Bosh Administrator',
                'phone' => '+998911157709',
                'role' => 'superadmin',
                'branch_id' => null,
                'status' => 'active',
                'password' => $commonPassword,
                'email' => 'admin@autoprime.uz',
                'base_salary' => 15000000,
            ]);
        }
        $superAdmin->syncRoles(['super_admin', 'superadmin']);

        // Filial Admin
        $branchAdmin = User::updateOrCreate(
            ['phone' => '+998901000001'],
            [
                'name' => 'Davron Karimov (Filial Admin)',
                'role' => 'admin',
                'branch_id' => $branchChilonzor->id,
                'status' => 'active',
                'password' => $commonPassword,
                'email' => 'davron.admin@autoprime.uz',
                'base_salary' => 8000000,
            ]
        );
        $branchAdmin->syncRoles(['admin']);

        // Buxgalter
        $accountant = User::updateOrCreate(
            ['phone' => '+998901000002'],
            [
                'name' => 'Nigora Rahimova (Buxgalter)',
                'role' => 'accountant',
                'branch_id' => $branchChilonzor->id,
                'status' => 'active',
                'password' => $commonPassword,
                'email' => 'nigora.accountant@autoprime.uz',
                'base_salary' => 6000000,
            ]
        );
        $accountant->syncRoles(['accountant']);

        // Reception
        $reception = User::updateOrCreate(
            ['phone' => '+998901000003'],
            [
                'name' => 'Malika Usmonova (Reception)',
                'role' => 'reception',
                'branch_id' => $branchChilonzor->id,
                'status' => 'active',
                'password' => $commonPassword,
                'email' => 'malika.reception@autoprime.uz',
                'base_salary' => 4500000,
            ]
        );
        $reception->syncRoles(['reception']);

        // Kassir
        $kassir = User::updateOrCreate(
            ['phone' => '+998901000004'],
            [
                'name' => 'Shahnoza Aliyeva (Kassir)',
                'role' => 'kassir',
                'branch_id' => $branchChilonzor->id,
                'status' => 'active',
                'password' => $commonPassword,
                'email' => 'shahnoza.kassir@autoprime.uz',
                'base_salary' => 4000000,
            ]
        );
        $kassir->syncRoles(['kassir']);

        // Teacher
        $teacher = User::updateOrCreate(
            ['phone' => '+998901000005'],
            [
                'name' => 'Rustam Qodirov (Nazariya O\'qituvchisi)',
                'role' => 'teacher',
                'branch_id' => $branchChilonzor->id,
                'status' => 'active',
                'password' => $commonPassword,
                'email' => 'rustam.teacher@autoprime.uz',
                'base_salary' => 4000000,
                'lesson_rate' => 75000,
            ]
        );
        $teacher->syncRoles(['teacher']);

        // Instructor 1 (Chilonzor)
        $instructor1 = User::updateOrCreate(
            ['phone' => '+998901000006'],
            [
                'name' => 'Alisher Vohidov (Instruktor Cobalt)',
                'role' => 'instructor',
                'branch_id' => $branchChilonzor->id,
                'status' => 'active',
                'password' => $commonPassword,
                'car_name' => 'Chevrolet Cobalt (01 A 777 AA)',
                'email' => 'alisher.instructor@autoprime.uz',
                'base_salary' => 3500000,
                'driving_hourly_rate' => 60000,
            ]
        );
        $instructor1->syncRoles(['instructor']);

        // Instructor 2 (Yunusobod)
        $instructor2 = User::updateOrCreate(
            ['phone' => '+998901000007'],
            [
                'name' => 'Jasur Ergashev (Instruktor Gentra)',
                'role' => 'instructor',
                'branch_id' => $branchYunusobod->id,
                'status' => 'active',
                'password' => $commonPassword,
                'car_name' => 'Chevrolet Gentra (01 B 888 BB)',
                'email' => 'jasur.instructor@autoprime.uz',
                'base_salary' => 3500000,
                'driving_hourly_rate' => 60000,
            ]
        );
        $instructor2->syncRoles(['instructor']);

        // ---------------------------------------------------------------------
        // 3. CASH REGISTER TYPES & CASH REGISTERS
        // ---------------------------------------------------------------------
        $typeCash = CashRegisterType::firstOrCreate(['code' => 'cash'], ['name' => 'Naqd pul kassasi', 'is_active' => true]);
        $typeCard = CashRegisterType::firstOrCreate(['code' => 'card_terminal'], ['name' => 'Terminal (Uzcard / Humo)', 'is_active' => true]);
        $typeBank = CashRegisterType::firstOrCreate(['code' => 'bank_transfer'], ['name' => 'Bank hisob raqami', 'is_active' => true]);
        $typeClick = CashRegisterType::firstOrCreate(['code' => 'click_payme'], ['name' => 'Click & Payme', 'is_active' => true]);

        // Superadmin central registers for all 4 types
        $regCashMain = CashRegister::firstOrCreate(
            ['name' => 'Bosh Naqd pul kassasi (Superadmin)'],
            [
                'branch_id' => null,
                'cash_register_type_id' => $typeCash->id,
                'balance' => 0,
                'is_active' => true,
            ]
        );

        $regCardMain = CashRegister::firstOrCreate(
            ['name' => 'Bosh Terminal kassasi (Superadmin)'],
            [
                'branch_id' => null,
                'cash_register_type_id' => $typeCard->id,
                'balance' => 0,
                'is_active' => true,
            ]
        );

        $regBankMain = CashRegister::firstOrCreate(
            ['name' => 'Bosh Bank hisob raqami (AsakaBank)'],
            [
                'branch_id' => null,
                'cash_register_type_id' => $typeBank->id,
                'balance' => 45000000,
                'is_active' => true,
            ]
        );

        $regClickMain = CashRegister::firstOrCreate(
            ['name' => 'Bosh Click & Payme (Superadmin)'],
            [
                'branch_id' => null,
                'cash_register_type_id' => $typeClick->id,
                'balance' => 0,
                'is_active' => true,
            ]
        );

        $regChilonzorCash = CashRegister::firstOrCreate(
            ['name' => 'Chilonzor Naqd pul kassasi'],
            [
                'branch_id' => $branchChilonzor->id,
                'cash_register_type_id' => $typeCash->id,
                'balance' => 14500000,
                'is_active' => true,
            ]
        );

        $regChilonzorCard = CashRegister::firstOrCreate(
            ['name' => 'Chilonzor Terminal kassasi'],
            [
                'branch_id' => $branchChilonzor->id,
                'cash_register_type_id' => $typeCard->id,
                'balance' => 8200000,
                'is_active' => true,
            ]
        );

        $regYunusobodCash = CashRegister::firstOrCreate(
            ['name' => 'Yunusobod Naqd pul kassasi'],
            [
                'branch_id' => $branchYunusobod->id,
                'cash_register_type_id' => $typeCash->id,
                'balance' => 6800000,
                'is_active' => true,
            ]
        );

        // ---------------------------------------------------------------------
        // 4. CASH SHIFTS & CASH TRANSFERS
        // ---------------------------------------------------------------------
        $openShift = CashShift::firstOrCreate(
            ['cash_register_id' => $regChilonzorCash->id, 'status' => 'open'],
            [
                'user_id' => $kassir->id,
                'opened_at' => $now->copy()->startOfDay()->addHours(8)->addMinutes(30),
                'opening_balance' => 14500000,
                'total_income' => 0,
                'total_expense' => 0,
                'closing_balance' => 14500000,
                'note' => 'Ertalabki kassa smenasi ochildi',
            ]
        );

        CashTransfer::firstOrCreate(
            ['from_cash_register_id' => $regChilonzorCash->id, 'to_cash_register_id' => $regBankMain->id, 'amount' => 5000000],
            [
                'cash_shift_id' => $openShift->id,
                'sent_by_user_id' => $kassir->id,
                'approved_by_user_id' => $superAdmin->id,
                'status' => 'approved',
                'notes' => 'Filialdan asosiy bank hisob raqamiga inkassatsiya o\'tkazmasi',
            ]
        );

        CashTransfer::firstOrCreate(
            ['from_cash_register_id' => $regChilonzorCash->id, 'to_cash_register_id' => $regYunusobodCash->id, 'amount' => 1500000],
            [
                'cash_shift_id' => $openShift->id,
                'sent_by_user_id' => $kassir->id,
                'approved_by_user_id' => null,
                'status' => 'pending',
                'notes' => 'Filiallararo xarajatlar uchun o\'tkazma',
            ]
        );

        // ---------------------------------------------------------------------
        // 5. EXPENSE CATEGORIES & EXPENSES
        // ---------------------------------------------------------------------
        $catFuel = ExpenseCategory::firstOrCreate(['name' => 'Yoqilg\'i (Benzin / Gaz)'], ['branch_id' => null, 'is_active' => true]);
        $catRepair = ExpenseCategory::firstOrCreate(['name' => 'Avtomobil ta\'miri va ehtiyot qismlar'], ['branch_id' => null, 'is_active' => true]);
        $catRent = ExpenseCategory::firstOrCreate(['name' => 'Ijara va kommunal to\'lovlar'], ['branch_id' => null, 'is_active' => true]);
        $catOffice = ExpenseCategory::firstOrCreate(['name' => 'Kanselyariya va o\'quv qurollari'], ['branch_id' => null, 'is_active' => true]);

        Expense::firstOrCreate(
            ['description' => 'Cobalt avtomashinasiga metan gaz quyildi'],
            [
                'branch_id' => $branchChilonzor->id,
                'cash_register_id' => $regChilonzorCash->id,
                'expense_category_id' => $catFuel->id,
                'user_id' => $instructor1->id,
                'amount' => 120000,
                'recipient' => 'Qatortol Gaz Zapravka',
                'spent_at' => $now->copy()->subHours(2),
            ]
        );

        Expense::firstOrCreate(
            ['description' => 'Cobalt moy va filtrlar almashtirildi'],
            [
                'branch_id' => $branchChilonzor->id,
                'cash_register_id' => $regChilonzorCash->id,
                'expense_category_id' => $catRepair->id,
                'user_id' => $instructor1->id,
                'amount' => 380000,
                'recipient' => 'Castrol Servis Chilonzor',
                'spent_at' => $now->copy()->subDays(2),
            ]
        );

        Expense::firstOrCreate(
            ['description' => 'A4 qog\'ozlar va o\'quv jurnallari sotib olindi'],
            [
                'branch_id' => $branchChilonzor->id,
                'cash_register_id' => $regChilonzorCash->id,
                'expense_category_id' => $catOffice->id,
                'user_id' => $reception->id,
                'amount' => 250000,
                'recipient' => 'Office Market Chilonzor',
                'spent_at' => $now->copy()->subDays(3),
            ]
        );

        // ---------------------------------------------------------------------
        // 6. COURSES, TOPICS & LESSON MATERIALS
        // ---------------------------------------------------------------------
        $courseB = Course::firstOrCreate(
            ['name' => 'B toifali haydovchilarni tayyorlash'],
            [
                'category' => 'B',
                'description' => 'Yengil avtomobillarni xavfsiz va ishonchli boshqarish nazariy va amaliy kursi',
                'is_active' => true,
            ]
        );

        $courseA = Course::firstOrCreate(
            ['name' => 'A toifali mototransport vositalari'],
            [
                'category' => 'A',
                'description' => 'Mototsikl va motorollerlarni boshqarish kursi',
                'is_active' => true,
            ]
        );

        $topic1 = Topic::firstOrCreate(
            ['course_id' => $courseB->id, 'order_number' => 1],
            [
                'title_uz' => 'Yo\'l harakati qoidalariga kirish. Asosiy atamalar',
                'title_ru' => 'Введение в ПДД. Основные понятия и термины',
                'title_krill' => 'Йўл ҳаракати қоидаларига кириш. Асосий атамалар',
                'title_en' => 'Introduction to Traffic Rules. Basic Definitions',
                'description' => 'Yo\'l harakati ishtirokchilarining huquq va majburiyatlari',
                'duration_minutes' => 80,
                'is_active' => true,
            ]
        );

        $topic2 = Topic::firstOrCreate(
            ['course_id' => $courseB->id, 'order_number' => 2],
            [
                'title_uz' => 'Yo\'l belgilari va yo\'l chiziqlari',
                'title_ru' => 'Дорожные знаки и дорожная разметка',
                'title_krill' => 'Йўл белгилари ва йўл чизиқлари',
                'title_en' => 'Road Signs and Road Markings',
                'description' => 'Barcha toifadagi yo\'l belgilari va ularning ma\'nosi',
                'duration_minutes' => 90,
                'is_active' => true,
            ]
        );

        $topic3 = Topic::firstOrCreate(
            ['course_id' => $courseB->id, 'order_number' => 3],
            [
                'title_uz' => 'Svetofor va tartibga soluvchining signallari',
                'title_ru' => 'Сигналы светофора и регулировщика',
                'title_krill' => 'Светофор ва тартибга солувчининг сигналлари',
                'title_en' => 'Traffic Lights and Regulator Signals',
                'description' => 'Chorrahada tartibga soluvchi ishoralarini tushunish',
                'duration_minutes' => 80,
                'is_active' => true,
            ]
        );

        LessonMaterial::firstOrCreate(
            ['topic_id' => $topic1->id, 'title' => '1-Mavzu Taqdimoti (PDF)'],
            [
                'file_url' => '/storage/materials/mavzu1_slayd.pdf',
                'file_type' => 'pdf',
                'file_size' => '3.5 MB',
                'is_active' => true,
            ]
        );

        LessonMaterial::firstOrCreate(
            ['topic_id' => $topic2->id, 'title' => 'Yo\'l belgilari to\'liq elektron atlas'],
            [
                'file_url' => '/storage/materials/yol_belgilari_atlas.pdf',
                'file_type' => 'pdf',
                'file_size' => '7.8 MB',
                'is_active' => true,
            ]
        );

        // ---------------------------------------------------------------------
        // 7. CONTRACT TYPES (TARIFFS)
        // ---------------------------------------------------------------------
        $tariffBStandart = ContractType::firstOrCreate(
            ['name' => 'Standart B kursi (Nazariya + 10 soat Amaliyot)'],
            [
                'branch_id' => null,
                'category' => 'B',
                'price' => 3500000,
                'has_theory' => true,
                'has_driving' => true,
                'has_lms' => true,
                'required_driving_lessons' => 10,
                'required_theory_lessons' => 24,
                'min_theory_payment_percent' => 30.00,
                'is_active' => true,
            ]
        );

        $tariffBOptima = ContractType::firstOrCreate(
            ['name' => 'Optima B kursi (Nazariya + 15 soat Amaliyot)'],
            [
                'branch_id' => null,
                'category' => 'B',
                'price' => 4200000,
                'has_theory' => true,
                'has_driving' => true,
                'has_lms' => true,
                'required_driving_lessons' => 15,
                'required_theory_lessons' => 24,
                'min_theory_payment_percent' => 30.00,
                'is_active' => true,
            ]
        );

        $tariffBVIP = ContractType::firstOrCreate(
            ['name' => 'VIP Intensiv B (Nazariya + 20 soat Amaliyot)'],
            [
                'branch_id' => null,
                'category' => 'B',
                'price' => 5500000,
                'has_theory' => true,
                'has_driving' => true,
                'has_lms' => true,
                'required_driving_lessons' => 20,
                'required_theory_lessons' => 24,
                'min_theory_payment_percent' => 50.00,
                'is_active' => true,
            ]
        );

        $tariffAStandart = ContractType::firstOrCreate(
            ['name' => 'A toifasi Standart motokurs'],
            [
                'branch_id' => null,
                'category' => 'A',
                'price' => 2200000,
                'has_theory' => true,
                'has_driving' => true,
                'has_lms' => true,
                'required_driving_lessons' => 8,
                'required_theory_lessons' => 16,
                'min_theory_payment_percent' => 30.00,
                'is_active' => true,
            ]
        );

        // ---------------------------------------------------------------------
        // 8. AUTODROMES, VEHICLES & VEHICLE MAINTENANCE
        // ---------------------------------------------------------------------
        $autodromeChilonzor = Autodrome::firstOrCreate(
            ['name' => 'Chilonzor Bosh Avtodromi'],
            [
                'branch_id' => $branchChilonzor->id,
                'latitude' => 41.2858,
                'longitude' => 69.2038,
                'radius_meters' => 300,
            ]
        );

        $autodromeYunusobod = Autodrome::firstOrCreate(
            ['name' => 'Yunusobod O\'quv Avtodromi'],
            [
                'branch_id' => $branchYunusobod->id,
                'latitude' => 41.3654,
                'longitude' => 69.2891,
                'radius_meters' => 300,
            ]
        );

        $carCobalt = Vehicle::firstOrCreate(
            ['plate_number' => '01 A 777 AA'],
            [
                'branch_id' => $branchChilonzor->id,
                'instructor_id' => $instructor1->id,
                'make_model' => 'Chevrolet Cobalt',
                'fuel_type' => 'gas_methane',
                'current_mileage' => 42300,
                'last_oil_change_mileage' => 40000,
                'next_oil_change_mileage' => 48000,
                'insurance_expiry_date' => $now->copy()->addMonths(6),
                'gas_inspection_expiry_date' => $now->copy()->addMonths(8),
                'mot_expiry_date' => $now->copy()->addMonths(10),
                'status' => 'active',
            ]
        );

        $carGentra = Vehicle::firstOrCreate(
            ['plate_number' => '01 B 888 BB'],
            [
                'branch_id' => $branchYunusobod->id,
                'instructor_id' => $instructor2->id,
                'make_model' => 'Chevrolet Gentra',
                'fuel_type' => 'petrol',
                'current_mileage' => 65100,
                'last_oil_change_mileage' => 60000,
                'next_oil_change_mileage' => 70000,
                'insurance_expiry_date' => $now->copy()->addMonths(4),
                'status' => 'active',
            ]
        );

        $carNexia = Vehicle::firstOrCreate(
            ['plate_number' => '01 C 999 CC'],
            [
                'branch_id' => $branchChilonzor->id,
                'instructor_id' => null,
                'make_model' => 'Chevrolet Nexia 3',
                'fuel_type' => 'gas_methane',
                'current_mileage' => 88400,
                'last_oil_change_mileage' => 85000,
                'next_oil_change_mileage' => 90000,
                'status' => 'maintenance',
            ]
        );

        VehicleMaintenance::firstOrCreate(
            ['vehicle_id' => $carCobalt->id, 'maintenance_type' => 'Dvigatel moyi va filtrlar'],
            [
                'cost' => 380000,
                'mileage' => 40000,
                'performed_at' => $now->copy()->subDays(10),
                'description' => 'Castrol 5W-30 motor moyi, moy va havo filtrlari yangilandi',
            ]
        );

        VehicleMaintenance::firstOrCreate(
            ['vehicle_id' => $carNexia->id, 'maintenance_type' => 'Xodovoy qismi to\'liq ta\'miri'],
            [
                'cost' => 1150000,
                'mileage' => 88000,
                'performed_at' => $now->copy()->subDays(3),
                'description' => 'Old amortizatorlar va sharovoy tayanchlar almashtirildi',
            ]
        );

        // ---------------------------------------------------------------------
        // 9. GROUPS
        // ---------------------------------------------------------------------
        $group1 = Group::firstOrCreate(
            ['name' => 'B-24/01 Guruh (Ertalabki)'],
            [
                'branch_id' => $branchChilonzor->id,
                'course_id' => $courseB->id,
                'teacher_id' => $teacher->id,
                'instructor_id' => $instructor1->id,
                'category' => 'B',
                'days_of_week' => ['dushanba', 'chorshanba', 'juma'],
                'start_time' => '09:00',
                'end_time' => '11:00',
                'room' => '101-xona',
                'max_students' => 25,
                'start_date' => $now->copy()->subDays(30),
                'end_date' => $now->copy()->addDays(45),
                'is_active' => true,
            ]
        );

        $group2 = Group::firstOrCreate(
            ['name' => 'B-24/02 Guruh (Kechki)'],
            [
                'branch_id' => $branchChilonzor->id,
                'course_id' => $courseB->id,
                'teacher_id' => $teacher->id,
                'instructor_id' => $instructor1->id,
                'category' => 'B',
                'days_of_week' => ['seshanba', 'payshanba', 'shanba'],
                'start_time' => '18:30',
                'end_time' => '20:30',
                'room' => '102-xona',
                'max_students' => 30,
                'start_date' => $now->copy()->subDays(15),
                'end_date' => $now->copy()->addDays(60),
                'is_active' => true,
            ]
        );

        $group3 = Group::firstOrCreate(
            ['name' => 'A-24/01 Mototransport'],
            [
                'branch_id' => $branchYunusobod->id,
                'course_id' => $courseA->id,
                'teacher_id' => $teacher->id,
                'instructor_id' => $instructor2->id,
                'category' => 'A',
                'days_of_week' => ['dushanba', 'payshanba'],
                'start_time' => '15:00',
                'end_time' => '17:00',
                'room' => '201-xona',
                'max_students' => 20,
                'start_date' => $now->copy()->subDays(10),
                'end_date' => $now->copy()->addDays(30),
                'is_active' => true,
            ]
        );

        // ---------------------------------------------------------------------
        // 10. STUDENTS, CONTRACTS & PAYMENTS (ALL 5 PAYMENT STAGES)
        // ---------------------------------------------------------------------
        // Student 1: 100% Paid (Green / Paid)
        $student1 = Student::firstOrCreate(
            ['phone' => '+998931112233'],
            [
                'full_name' => 'Olimjon Yoqubov',
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group1->id,
                'registered_by_user_id' => $reception->id,
                'passport_series' => 'AB',
                'passport_number' => '1234567',
                'pinfl' => '30101951234567',
                'birth_date' => '1995-01-15',
                'address' => 'Toshkent sh., Chilonzor 9-mavze, 12-uy',
                'status' => 'graduated',
                'is_active' => true,
            ]
        );

        $contract1 = Contract::firstOrCreate(
            ['contract_number' => 'AP-2026-0001'],
            [
                'branch_id' => $branchChilonzor->id,
                'student_id' => $student1->id,
                'contract_type_id' => $tariffBStandart->id,
                'group_id' => $group1->id,
                'created_by_user_id' => $reception->id,
                'contract_date' => $now->copy()->subDays(30),
                'start_date' => $group1->start_date,
                'end_date' => $group1->end_date,
                'total_amount' => 3500000,
                'discount_amount' => 0,
                'final_amount' => 3500000,
                'paid_amount' => 3500000,
                'debt_amount' => 0,
                'overpaid_amount' => 0,
                'status' => 'active',
                'payment_status' => 'paid',
                'required_driving_lessons' => 10,
                'required_theory_lessons' => 24,
            ]
        );

        Payment::firstOrCreate(
            ['receipt_number' => 'RCP-2026-0001'],
            [
                'branch_id' => $branchChilonzor->id,
                'contract_id' => $contract1->id,
                'student_id' => $student1->id,
                'cash_register_id' => $regChilonzorCash->id,
                'received_by_user_id' => $kassir->id,
                'amount' => 3500000,
                'payment_type' => 'contract_tuition',
                'payment_method' => 'cash',
                'paid_at' => $now->copy()->subDays(30),
                'comment' => 'Shartnoma to\'lovi 100% to\'liq naqd qabul qilindi',
            ]
        );

        // Student 2: 75% Paid (Green / Partial stage 4)
        $student2 = Student::firstOrCreate(
            ['phone' => '+998942223344'],
            [
                'full_name' => 'Zilola Mahmudova',
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group1->id,
                'registered_by_user_id' => $reception->id,
                'passport_series' => 'AC',
                'passport_number' => '7654321',
                'pinfl' => '40203981234567',
                'birth_date' => '1998-03-20',
                'address' => 'Toshkent sh., Uchtepa tumani, 26-mavze',
                'status' => 'active',
                'is_active' => true,
            ]
        );

        $contract2 = Contract::firstOrCreate(
            ['contract_number' => 'AP-2026-0002'],
            [
                'branch_id' => $branchChilonzor->id,
                'student_id' => $student2->id,
                'contract_type_id' => $tariffBStandart->id,
                'group_id' => $group1->id,
                'created_by_user_id' => $reception->id,
                'contract_date' => $now->copy()->subDays(28),
                'start_date' => $group1->start_date,
                'end_date' => $group1->end_date,
                'total_amount' => 3500000,
                'discount_amount' => 0,
                'final_amount' => 3500000,
                'paid_amount' => 2625000,
                'debt_amount' => 875000,
                'overpaid_amount' => 0,
                'status' => 'active',
                'payment_status' => 'partial',
                'required_driving_lessons' => 10,
                'required_theory_lessons' => 24,
            ]
        );

        Payment::firstOrCreate(
            ['receipt_number' => 'RCP-2026-0002'],
            [
                'branch_id' => $branchChilonzor->id,
                'contract_id' => $contract2->id,
                'student_id' => $student2->id,
                'cash_register_id' => $regChilonzorCard->id,
                'received_by_user_id' => $kassir->id,
                'amount' => 2625000,
                'payment_type' => 'contract_tuition',
                'payment_method' => 'card_terminal',
                'paid_at' => $now->copy()->subDays(28),
                'comment' => 'Terminal orqali 75% to\'lov qilindi',
            ]
        );

        // Student 3: 50% Paid (Yellow / Partial stage 3)
        $student3 = Student::firstOrCreate(
            ['phone' => '+998973334455'],
            [
                'full_name' => 'Bobur Mirzayev',
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group1->id,
                'registered_by_user_id' => $reception->id,
                'passport_series' => 'AA',
                'passport_number' => '9988776',
                'pinfl' => '31505921234567',
                'birth_date' => '1992-05-15',
                'address' => 'Toshkent sh., Shayxontohur tumani, Navoiy ko\'chasi',
                'status' => 'active',
                'is_active' => true,
            ]
        );

        $contract3 = Contract::firstOrCreate(
            ['contract_number' => 'AP-2026-0003'],
            [
                'branch_id' => $branchChilonzor->id,
                'student_id' => $student3->id,
                'contract_type_id' => $tariffBOptima->id,
                'group_id' => $group1->id,
                'created_by_user_id' => $reception->id,
                'contract_date' => $now->copy()->subDays(25),
                'start_date' => $group1->start_date,
                'end_date' => $group1->end_date,
                'total_amount' => 4200000,
                'discount_amount' => 0,
                'final_amount' => 4200000,
                'paid_amount' => 2100000,
                'debt_amount' => 2100000,
                'overpaid_amount' => 0,
                'status' => 'active',
                'payment_status' => 'partial',
                'required_driving_lessons' => 15,
                'required_theory_lessons' => 24,
            ]
        );

        Payment::firstOrCreate(
            ['receipt_number' => 'RCP-2026-0003'],
            [
                'branch_id' => $branchChilonzor->id,
                'contract_id' => $contract3->id,
                'student_id' => $student3->id,
                'cash_register_id' => $regChilonzorCash->id,
                'received_by_user_id' => $kassir->id,
                'amount' => 2100000,
                'payment_type' => 'contract_tuition',
                'payment_method' => 'cash',
                'paid_at' => $now->copy()->subDays(25),
                'comment' => 'Optima B kursi uchun 50% boshlang\'ich to\'lov',
            ]
        );

        // Student 4: 20% Paid (Red / Partial stage 2)
        $student4 = Student::firstOrCreate(
            ['phone' => '+998994445566'],
            [
                'full_name' => 'Madina Karimova',
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group2->id,
                'registered_by_user_id' => $reception->id,
                'passport_series' => 'AE',
                'passport_number' => '5544332',
                'pinfl' => '42010011234567',
                'birth_date' => '2001-10-20',
                'address' => 'Toshkent sh., Sergeli tumani, 5A-mavze',
                'status' => 'active',
                'is_active' => true,
            ]
        );

        $contract4 = Contract::firstOrCreate(
            ['contract_number' => 'AP-2026-0004'],
            [
                'branch_id' => $branchChilonzor->id,
                'student_id' => $student4->id,
                'contract_type_id' => $tariffBStandart->id,
                'group_id' => $group2->id,
                'created_by_user_id' => $reception->id,
                'contract_date' => $now->copy()->subDays(14),
                'start_date' => $group2->start_date,
                'end_date' => $group2->end_date,
                'total_amount' => 3500000,
                'discount_amount' => 0,
                'final_amount' => 3500000,
                'paid_amount' => 700000,
                'debt_amount' => 2800000,
                'overpaid_amount' => 0,
                'status' => 'active',
                'payment_status' => 'partial',
                'required_driving_lessons' => 10,
                'required_theory_lessons' => 24,
            ]
        );

        Payment::firstOrCreate(
            ['receipt_number' => 'RCP-2026-0004'],
            [
                'branch_id' => $branchChilonzor->id,
                'contract_id' => $contract4->id,
                'student_id' => $student4->id,
                'cash_register_id' => $regChilonzorCash->id,
                'received_by_user_id' => $kassir->id,
                'amount' => 700000,
                'payment_type' => 'contract_tuition',
                'payment_method' => 'cash',
                'paid_at' => $now->copy()->subDays(14),
                'comment' => 'Boshlang\'ich 20% to\'lov qilindi',
            ]
        );

        // Student 5: 0% Unpaid (White / Unpaid stage 1)
        $student5 = Student::firstOrCreate(
            ['phone' => '+998905556677'],
            [
                'full_name' => 'Sardor Toshpo\'latov',
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group2->id,
                'registered_by_user_id' => $reception->id,
                'passport_series' => 'AB',
                'passport_number' => '6655443',
                'pinfl' => '31008971234567',
                'birth_date' => '1997-08-10',
                'address' => 'Toshkent sh., Olmazor tumani, Qorasaroy',
                'status' => 'active',
                'is_active' => true,
            ]
        );

        Contract::firstOrCreate(
            ['contract_number' => 'AP-2026-0005'],
            [
                'branch_id' => $branchChilonzor->id,
                'student_id' => $student5->id,
                'contract_type_id' => $tariffBStandart->id,
                'group_id' => $group2->id,
                'created_by_user_id' => $reception->id,
                'contract_date' => $now->copy()->subDays(5),
                'start_date' => $group2->start_date,
                'end_date' => $group2->end_date,
                'total_amount' => 3500000,
                'discount_amount' => 0,
                'final_amount' => 3500000,
                'paid_amount' => 0,
                'debt_amount' => 3500000,
                'overpaid_amount' => 0,
                'status' => 'active',
                'payment_status' => 'unpaid',
                'required_driving_lessons' => 10,
                'required_theory_lessons' => 24,
            ]
        );

        // Student 6: Yunusobod Branch (100% Paid)
        $student6 = Student::firstOrCreate(
            ['phone' => '+998916667788'],
            [
                'full_name' => 'Kamola Azizova',
                'branch_id' => $branchYunusobod->id,
                'group_id' => $group3->id,
                'registered_by_user_id' => $superAdmin->id,
                'passport_series' => 'AC',
                'passport_number' => '3322110',
                'pinfl' => '42512991234567',
                'birth_date' => '1999-12-25',
                'address' => 'Toshkent sh., Yunusobod 4-mavze, 8-uy',
                'status' => 'active',
                'is_active' => true,
            ]
        );

        $contract6 = Contract::firstOrCreate(
            ['contract_number' => 'AP-2026-0006'],
            [
                'branch_id' => $branchYunusobod->id,
                'student_id' => $student6->id,
                'contract_type_id' => $tariffAStandart->id,
                'group_id' => $group3->id,
                'created_by_user_id' => $superAdmin->id,
                'contract_date' => $now->copy()->subDays(10),
                'start_date' => $group3->start_date,
                'end_date' => $group3->end_date,
                'total_amount' => 2200000,
                'discount_amount' => 0,
                'final_amount' => 2200000,
                'paid_amount' => 2200000,
                'debt_amount' => 0,
                'overpaid_amount' => 0,
                'status' => 'active',
                'payment_status' => 'paid',
                'required_driving_lessons' => 8,
                'required_theory_lessons' => 16,
            ]
        );

        Payment::firstOrCreate(
            ['receipt_number' => 'RCP-2026-0006'],
            [
                'branch_id' => $branchYunusobod->id,
                'contract_id' => $contract6->id,
                'student_id' => $student6->id,
                'cash_register_id' => $regYunusobodCash->id,
                'received_by_user_id' => $superAdmin->id,
                'amount' => 2200000,
                'payment_type' => 'contract_tuition',
                'payment_method' => 'cash',
                'paid_at' => $now->copy()->subDays(10),
                'comment' => 'Motokurs uchun to\'lov qabul qilindi',
            ]
        );

        // ---------------------------------------------------------------------
        // 11. LESSON SESSIONS & ATTENDANCES
        // ---------------------------------------------------------------------
        // Active session for live QR testing
        $activeSession = LessonSession::firstOrCreate(
            ['topic' => 'Yo\'l belgilari va yo\'l chiziqlari (Amaliy mashg\'ulot)', 'status' => 'active'],
            [
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group1->id,
                'teacher_id' => $teacher->id,
                'room_number' => '101-xona',
                'started_at' => $now->copy()->subMinutes(15),
                'qr_secret_salt' => 'autoprime_demo_qr_salt_secret',
            ]
        );

        Attendance::updateOrCreate(
            ['lesson_session_id' => $activeSession->id, 'student_id' => $student1->id],
            [
                'scanned_at' => $now->copy()->subMinutes(10),
                'status' => 'present',
                'is_manual' => false,
                'ip_address' => '127.0.0.1',
            ]
        );

        Attendance::updateOrCreate(
            ['lesson_session_id' => $activeSession->id, 'student_id' => $student2->id],
            [
                'scanned_at' => $now->copy()->subMinutes(8),
                'status' => 'present',
                'is_manual' => false,
                'ip_address' => '127.0.0.1',
            ]
        );

        Attendance::updateOrCreate(
            ['lesson_session_id' => $activeSession->id, 'student_id' => $student3->id],
            [
                'scanned_at' => $now->copy()->subMinutes(5),
                'status' => 'late',
                'is_manual' => true,
                'marked_by_user_id' => $teacher->id,
                'manual_reason' => 'Tirbandlik sababli 15 daqiqa kechikib keldi',
            ]
        );

        // Finished historical session
        $finishedSession = LessonSession::firstOrCreate(
            ['topic' => 'Yo\'l harakati qoidalariga kirish (1-Dars)', 'status' => 'finished'],
            [
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group1->id,
                'teacher_id' => $teacher->id,
                'room_number' => '101-xona',
                'started_at' => $now->copy()->subDays(2)->setTime(9, 0),
                'ended_at' => $now->copy()->subDays(2)->setTime(10, 30),
                'qr_secret_salt' => 'historical_session_salt_001',
            ]
        );

        Attendance::firstOrCreate(
            ['lesson_session_id' => $finishedSession->id, 'student_id' => $student1->id],
            ['scanned_at' => $finishedSession->started_at, 'status' => 'present', 'is_manual' => false]
        );
        Attendance::firstOrCreate(
            ['lesson_session_id' => $finishedSession->id, 'student_id' => $student2->id],
            ['scanned_at' => $finishedSession->started_at, 'status' => 'present', 'is_manual' => false]
        );

        // ---------------------------------------------------------------------
        // 12. DRIVINGS & REVIEWS
        // ---------------------------------------------------------------------
        $driving1 = Driving::firstOrCreate(
            [
                'student_id' => $student1->id,
                'instructor_id' => $instructor1->id,
                'date' => $now->copy()->subDays(2)->toDateString(),
            ],
            [
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group1->id,
                'contract_id' => $contract1->id,
                'autodrome_id' => $autodromeChilonzor->id,
                'vehicle_id' => $carCobalt->id,
                'start_time' => '10:00:00',
                'end_time' => '12:00:00',
                'status' => 'completed',
                'instructor_comment' => 'Estakada va ilon izi mashqlarini xatosiz bajardi. A\'lo darajada!',
            ]
        );

        Review::firstOrCreate(
            ['driving_id' => $driving1->id],
            [
                'rating' => 5,
                'reason_tags' => ['Sabrli va tushunarli', 'Avtomobil toza', 'Vaqtida boshlandi'],
                'comment' => 'Alisher aka juda yaxshi o\'rgatdilar, mashinani qaltiramay haydashni o\'rgandim!',
            ]
        );

        // Scheduled future driving
        Driving::firstOrCreate(
            [
                'student_id' => $student2->id,
                'instructor_id' => $instructor1->id,
                'date' => $now->copy()->addDays(1)->toDateString(),
            ],
            [
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group1->id,
                'contract_id' => $contract2->id,
                'autodrome_id' => $autodromeChilonzor->id,
                'vehicle_id' => $carCobalt->id,
                'start_time' => '14:00:00',
                'end_time' => '16:00:00',
                'status' => 'scheduled',
                'instructor_comment' => null,
            ]
        );

        // Completed driving with 4 stars
        $driving3 = Driving::firstOrCreate(
            [
                'student_id' => $student3->id,
                'instructor_id' => $instructor1->id,
                'date' => $now->copy()->subDays(5)->toDateString(),
            ],
            [
                'branch_id' => $branchChilonzor->id,
                'group_id' => $group1->id,
                'contract_id' => $contract3->id,
                'autodrome_id' => $autodromeChilonzor->id,
                'vehicle_id' => $carCobalt->id,
                'start_time' => '16:00:00',
                'end_time' => '18:00:00',
                'status' => 'completed',
                'instructor_comment' => 'Parallel parkovkada ozgina xatolik bo\'ldi, keyingi darsda mustahkamlaymiz.',
            ]
        );

        Review::firstOrCreate(
            ['driving_id' => $driving3->id],
            [
                'rating' => 4,
                'reason_tags' => ['Yaxshi tushuntirish'],
                'comment' => 'Dars juda foydali bo\'ldi, parkovkani yana takrorlaymiz.',
            ]
        );

        // ---------------------------------------------------------------------
        // 13. CERTIFICATES
        // ---------------------------------------------------------------------
        Certificate::firstOrCreate(
            ['certificate_number' => 'AF-2026-0001'],
            [
                'branch_id' => $branchChilonzor->id,
                'student_id' => $student1->id,
                'contract_id' => $contract1->id,
                'group_id' => $group1->id,
                'issued_by_user_id' => $superAdmin->id,
                'series' => 'AF',
                'category' => 'B',
                'theory_score' => 19,
                'practical_status' => 'passed',
                'attendance_rate' => 96.50,
                'issued_date' => $now->copy()->subDays(1)->toDateString(),
                'qr_verify_hash' => 'autoprime_verify_cert_olimjon_2026',
                'status' => 'issued',
            ]
        );

        // ---------------------------------------------------------------------
        // 14. CRM LEADS (KANBAN ALL STAGES)
        // ---------------------------------------------------------------------
        Lead::firstOrCreate(
            ['phone' => '+998909876543'],
            [
                'full_name' => 'Javohir Saidov',
                'branch_id' => $branchChilonzor->id,
                'assigned_user_id' => $reception->id,
                'category' => 'B',
                'preferred_time' => 'Kechki',
                'source' => 'telegram_bot',
                'stage' => 'new_lead',
                'notes' => 'Telegram bot orqali murojaat qildi, kechki guruhga qiziqmoqda',
            ]
        );

        Lead::firstOrCreate(
            ['phone' => '+998935432109'],
            [
                'full_name' => 'Gulnoza Xamidova',
                'branch_id' => $branchChilonzor->id,
                'assigned_user_id' => $reception->id,
                'category' => 'B',
                'preferred_time' => 'Ertalabki',
                'source' => 'instagram',
                'stage' => 'form_sent',
                'form_token' => 'form_token_gulnoza_123',
                'notes' => 'Instagram reklama orqali yozdi, passport anketasi linki yuborildi',
            ]
        );

        Lead::firstOrCreate(
            ['phone' => '+998971239876'],
            [
                'full_name' => 'Dilshod Akramov',
                'branch_id' => $branchYunusobod->id,
                'assigned_user_id' => $superAdmin->id,
                'category' => 'B',
                'preferred_time' => 'Shanba-Yakshanba',
                'source' => 'website',
                'stage' => 'form_completed',
                'is_form_completed' => true,
                'passport_series' => 'AB',
                'passport_number' => '4433221',
                'pinfl' => '32204961234567',
                'birth_date' => '1996-04-22',
                'address' => 'Toshkent sh., Yunusobod 15-mavze',
                'notes' => 'Anketani onlayn to\'ldirdi, shartnoma imzolashga filialga keladi',
            ]
        );

        Lead::firstOrCreate(
            ['phone' => '+998931112233'],
            [
                'full_name' => 'Olimjon Yoqubov',
                'branch_id' => $branchChilonzor->id,
                'assigned_user_id' => $reception->id,
                'student_id' => $student1->id,
                'contract_id' => $contract1->id,
                'category' => 'B',
                'source' => 'recommendation',
                'stage' => 'contract_signed',
                'notes' => 'Do\'sti tavsiyasi bilan kelgan, shartnoma imzolandi va 100% to\'landi',
            ]
        );

        Lead::firstOrCreate(
            ['phone' => '+998947778899'],
            [
                'full_name' => 'Temur Ismoilov',
                'branch_id' => $branchChilonzor->id,
                'assigned_user_id' => $reception->id,
                'category' => 'B',
                'source' => 'walk_in',
                'stage' => 'rejected',
                'lost_reason' => 'Boshqa viloyatga ko\'chib ketishi sababli o\'qiy olmasligini aytdi',
            ]
        );

        // ---------------------------------------------------------------------
        // 15. SALARIES & SALARY PAYMENTS
        // ---------------------------------------------------------------------
        $period = $now->format('Y-m');

        // Teacher Salary
        $salTeacher = Salary::firstOrCreate(
            ['user_id' => $teacher->id, 'period' => $period, 'salary_type' => 'base_salary'],
            [
                'branch_id' => $branchChilonzor->id,
                'created_by_user_id' => $accountant->id,
                'amount' => 4000000,
                'is_deduction' => false,
                'notes' => 'Oylik asosiy maosh (Nazariya o\'qituvchisi)',
                'accrued_at' => $now->copy()->startOfMonth(),
            ]
        );

        Salary::firstOrCreate(
            ['user_id' => $teacher->id, 'period' => $period, 'salary_type' => 'lesson_rate'],
            [
                'branch_id' => $branchChilonzor->id,
                'created_by_user_id' => $accountant->id,
                'amount' => 900000, // 12 lessons * 75,000
                'lessons_or_hours_count' => 12,
                'is_deduction' => false,
                'notes' => '12 ta o\'tilgan dars uchun gonorar (12 * 75 000 so\'m)',
                'accrued_at' => $now,
            ]
        );

        SalaryPayment::firstOrCreate(
            ['user_id' => $teacher->id, 'amount' => 2000000],
            [
                'salary_id' => $salTeacher->id,
                'cash_register_id' => $regChilonzorCash->id,
                'paid_by_user_id' => $kassir->id,
                'payment_method' => 'cash',
                'comment' => 'Oylik maoshdan bo\'nak (avans) berildi',
                'paid_at' => $now->copy()->subDays(8),
            ]
        );

        // Instructor Salary
        $salInstructor = Salary::firstOrCreate(
            ['user_id' => $instructor1->id, 'period' => $period, 'salary_type' => 'base_salary'],
            [
                'branch_id' => $branchChilonzor->id,
                'created_by_user_id' => $accountant->id,
                'amount' => 3500000,
                'is_deduction' => false,
                'notes' => 'Oylik asosiy stavka (Instruktor)',
                'accrued_at' => $now->copy()->startOfMonth(),
            ]
        );

        Salary::firstOrCreate(
            ['user_id' => $instructor1->id, 'period' => $period, 'salary_type' => 'driving_hourly_rate'],
            [
                'branch_id' => $branchChilonzor->id,
                'created_by_user_id' => $accountant->id,
                'amount' => 1440000, // 24 hours * 60,000
                'lessons_or_hours_count' => 24,
                'is_deduction' => false,
                'notes' => '24 soat amaliy haydash darsi (24 * 60 000 so\'m)',
                'accrued_at' => $now,
            ]
        );

        SalaryPayment::firstOrCreate(
            ['user_id' => $instructor1->id, 'amount' => 1500000],
            [
                'salary_id' => $salInstructor->id,
                'cash_register_id' => $regChilonzorCash->id,
                'paid_by_user_id' => $kassir->id,
                'payment_method' => 'cash',
                'comment' => 'Instruktorga oylikdan avans berildi',
                'paid_at' => $now->copy()->subDays(7),
            ]
        );

        // ---------------------------------------------------------------------
        // 16. TICKETS, QUESTIONS, ANSWERS & ATTEMPTS
        // ---------------------------------------------------------------------
        $ticket1 = Ticket::firstOrCreate(
            ['ticket_number' => 1],
            [
                'title_uz' => '1-Bilet. Umumiy qoidalar va belgilari',
                'title_ru' => 'Билет №1. Общие положения и знаки',
                'title_krill' => '1-Билет. Умумий қоидалар ва белгилар',
                'title_en' => 'Ticket #1. General Provisions and Signs',
                'description' => 'Haydovchilik guvohnomasi imtihoni uchun 1-bilet savollari',
                'is_active' => true,
            ]
        );

        $q1 = Question::firstOrCreate(
            ['ticket_id' => $ticket1->id, 'question_number' => 1],
            [
                'question_uz' => 'Ushbu yo\'l belgisi qanday ma\'noni bildiradi?',
                'question_ru' => 'Что означает данный дорожный знак?',
                'question_krill' => 'Ушбу йўл белгиси қандай маънони билдиради?',
                'question_en' => 'What does this road sign indicate?',
                'description_uz' => '2.1 - Asosiy yo\'l belgisi harakatlanish imtiyozini beradi.',
                'description_ru' => 'Знак 2.1 «Главная дорога» предоставляет право преимущественного проезда.',
                'image_url' => '/storage/signs/sign_2_1.png',
                'is_active' => true,
            ]
        );

        $ans1 = Answer::firstOrCreate(
            ['question_id' => $q1->id, 'answer_uz' => 'Asosiy yo\'l (Imtiyozli harakatlanish)'],
            [
                'answer_ru' => 'Главная дорога (Преимущественное право)',
                'answer_krill' => 'Асосий йўл (Имтиёзли ҳаракатланиш)',
                'answer_en' => 'Main Road (Priority of passage)',
                'is_correct' => true,
                'order' => 1,
            ]
        );

        Answer::firstOrCreate(
            ['question_id' => $q1->id, 'answer_uz' => 'Yo\'l bering'],
            [
                'answer_ru' => 'Уступите дорогу',
                'answer_krill' => 'Йўл беринг',
                'answer_en' => 'Give way',
                'is_correct' => false,
                'order' => 2,
            ]
        );

        Answer::firstOrCreate(
            ['question_id' => $q1->id, 'answer_uz' => 'To\'xtamasdan harakatlanish taqiqlangan'],
            [
                'answer_ru' => 'Движение без остановки запрещено',
                'answer_krill' => 'Тўхтамасдан ҳаракатланиш тақиқланган',
                'answer_en' => 'Stop without stopping is prohibited',
                'is_correct' => false,
                'order' => 3,
            ]
        );

        $q2 = Question::firstOrCreate(
            ['ticket_id' => $ticket1->id, 'question_number' => 2],
            [
                'question_uz' => 'Aholi punktlarida yengil avtomobillarning ruxsat etilgan eng yuqori tezligi qancha?',
                'question_ru' => 'Какова максимально разрешенная скорость легковых автомобилей в населенных пунктах?',
                'question_krill' => 'Аҳоли пунктларида енгил автомобилларнинг рухсат этилган энг юқори тезлиги қанча?',
                'question_en' => 'What is the maximum permitted speed of passenger cars in built-up areas?',
                'description_uz' => 'O\'zbekiston Respublikasi Yo\'l harakati qoidalariga ko\'ra 60 km/soat.',
                'description_ru' => 'Согласно ПДД Республики Узбекистан — 60 км/ч.',
                'is_active' => true,
            ]
        );

        Answer::firstOrCreate(
            ['question_id' => $q2->id, 'answer_uz' => '60 km/soat'],
            [
                'answer_ru' => '60 км/ч',
                'answer_krill' => '60 км/соат',
                'answer_en' => '60 km/h',
                'is_correct' => true,
                'order' => 1,
            ]
        );

        Answer::firstOrCreate(
            ['question_id' => $q2->id, 'answer_uz' => '70 km/soat'],
            [
                'answer_ru' => '70 км/ч',
                'answer_krill' => '70 км/соат',
                'answer_en' => '70 km/h',
                'is_correct' => false,
                'order' => 2,
            ]
        );

        Answer::firstOrCreate(
            ['question_id' => $q2->id, 'answer_uz' => '80 km/soat'],
            [
                'answer_ru' => '80 км/ч',
                'answer_krill' => '80 км/соат',
                'answer_en' => '80 km/h',
                'is_correct' => false,
                'order' => 3,
            ]
        );

        // Student Exam Attempt
        $attempt1 = Attempt::firstOrCreate(
            ['student_id' => $student1->id, 'ticket_id' => $ticket1->id],
            [
                'user_id' => null,
                'attempt_type' => 'ticket_exam',
                'total_questions' => 20,
                'correct_answers' => 19,
                'wrong_answers' => 1,
                'score_percentage' => 95.00,
                'is_passed' => true,
                'started_at' => $now->copy()->subDays(2)->subMinutes(20),
                'finished_at' => $now->copy()->subDays(2)->subMinutes(5),
                'duration_seconds' => 900,
            ]
        );

        AttemptAnswer::firstOrCreate(
            ['attempt_id' => $attempt1->id, 'question_id' => $q1->id],
            [
                'answer_id' => $ans1->id,
                'is_correct' => true,
                'answered_at' => $now->copy()->subDays(2)->subMinutes(18),
                'duration_seconds' => 45,
            ]
        );

        // ---------------------------------------------------------------------
        // 17. TRAFFIC SIGNS & ROAD LINES
        // ---------------------------------------------------------------------
        $catWarning = SignCategory::firstOrCreate(
            ['slug' => 'warning'],
            [
                'name_uz' => 'Ogohlantiruvchi belgilar',
                'name_ru' => 'Предупреждающие знаки',
                'name_krill' => 'Огоҳлантирувчи белгилар',
                'name_en' => 'Warning signs',
                'order' => 1,
            ]
        );

        $catPriority = SignCategory::firstOrCreate(
            ['slug' => 'priority'],
            [
                'name_uz' => 'Imtiyoz belgilari',
                'name_ru' => 'Знаки приоритета',
                'name_krill' => 'Имтиёз белгилари',
                'name_en' => 'Priority signs',
                'order' => 2,
            ]
        );

        $catProhibitory = SignCategory::firstOrCreate(
            ['slug' => 'prohibitory'],
            [
                'name_uz' => 'Taqiqlovchi belgilar',
                'name_ru' => 'Запрещающие знаки',
                'name_krill' => 'Тақиқловчи белгилар',
                'name_en' => 'Prohibitory signs',
                'order' => 3,
            ]
        );

        Sign::firstOrCreate(
            ['category_id' => $catPriority->id, 'sign_number' => '2.1'],
            [
                'name_uz' => 'Asosiy yo\'l',
                'name_ru' => 'Главная дорога',
                'name_krill' => 'Асосий йўл',
                'name_en' => 'Main Road',
                'description_uz' => 'Tartibga solinmagan chorrahalarda imtiyozli o\'tish huquqini beradi',
                'description_ru' => 'Предоставляет право преимущественного проезда нерегулируемых перекрестков',
                'image_url' => '/storage/signs/2_1.svg',
                'order' => 1,
            ]
        );

        Sign::firstOrCreate(
            ['category_id' => $catProhibitory->id, 'sign_number' => '3.1'],
            [
                'name_uz' => 'Kirish taqiqlangan',
                'name_ru' => 'Въезд запрещен',
                'name_krill' => 'Кириш тақиқланган',
                'name_en' => 'No Entry',
                'description_uz' => 'Barcha transport vositalarining mazkur yo\'nalishda kirishi taqiqlanadi',
                'description_ru' => 'Запрещается въезд всех транспортных средств в данном направлении',
                'image_url' => '/storage/signs/3_1.svg',
                'order' => 1,
            ]
        );

        RoadLine::firstOrCreate(
            ['line_number' => '1.1'],
            [
                'name_uz' => 'Yaxlit oq chiziq',
                'name_ru' => 'Сплошная белая линия',
                'name_krill' => 'Яхлит оқ чизиқ',
                'name_en' => 'Solid white line',
                'description_uz' => 'Qarama-qarshi yo\'nalishdagi transport oqimlarini ajratadi, uni bosib o\'tish qat\'iyan taqiqlanadi',
                'description_ru' => 'Разделяет транспортные потоки противоположных направлений. Пересекать запрещается.',
                'image_url' => '/storage/lines/1_1.svg',
            ]
        );

        RoadLine::firstOrCreate(
            ['line_number' => '1.14.1'],
            [
                'name_uz' => 'Piyodalar o\'tish joyi (Zebra)',
                'name_ru' => 'Пешеходный переход (Зебра)',
                'name_krill' => 'Пиёдалар ўтиш жойи (Зебра)',
                'name_en' => 'Pedestrian crossing (Zebra)',
                'description_uz' => 'Yo\'lning qatnov qismida piyodalar o\'tish joyini belgilaydi',
                'description_ru' => 'Обозначает пешеходный переход на проезжей части',
                'image_url' => '/storage/lines/1_14_1.svg',
            ]
        );

        // ---------------------------------------------------------------------
        // 18. ACTIVITY LOG
        // ---------------------------------------------------------------------
        Activity::firstOrCreate(
            ['description' => 'Demo ma\'lumotlar muvaffaqiyatli yuklandi'],
            [
                'log_name' => 'system',
                'subject_type' => User::class,
                'subject_id' => $superAdmin->id,
                'causer_type' => User::class,
                'causer_id' => $superAdmin->id,
                'properties' => [
                    'branches_count' => 2,
                    'users_count' => 8,
                    'students_count' => 6,
                    'contracts_count' => 6,
                ],
            ]
        );
    }
}
