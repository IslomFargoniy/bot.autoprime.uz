<?php

/*
|--------------------------------------------------------------------------
| Roles & Permissions
|--------------------------------------------------------------------------
|
| Single definition of every permission and which role receives it. The
| RolePermissionSynchronizer (seeder + migrations) syncs the database from
| here. A role's permissions are its defaults; staff can additionally be
| granted permissions of other staff roles one by one (see "grantable_roles"),
| e.g. a receptionist who also works as a cashier.
|
| The "superadmin" role bypasses all gates (see AppServiceProvider).
|
*/

/*
| Permission => human readable label (shown in the staff permission dialog).
*/
$labels = [
    'dashboard.view' => 'Bosh sahifa',

    'branches.view' => 'Filiallarni ko\'rish',
    'branches.manage' => 'Filiallarni boshqarish',
    'users.view' => 'Xodimlarni ko\'rish',
    'users.manage' => 'Xodimlarni boshqarish',
    'roles.manage' => 'Xodimlarga ruxsat berish',

    'students.view' => 'O\'quvchilarni ko\'rish',
    'students.create' => 'O\'quvchi qo\'shish',
    'students.edit' => 'O\'quvchini tahrirlash',
    'students.delete' => 'O\'quvchini o\'chirish',
    'groups.view' => 'Guruhlarni ko\'rish',
    'groups.manage' => 'Guruhlarni boshqarish',

    'contracts.view' => 'Shartnomalarni ko\'rish',
    'contracts.create' => 'Shartnoma tuzish',
    'contracts.edit' => 'Shartnomani tahrirlash / o\'chirish',
    'contracts.print' => 'Shartnomani chop etish',
    'contract_types.manage' => 'Tariflarni boshqarish',
    'certificates.view' => 'Guvohnomalarni ko\'rish',
    'certificates.create' => 'Guvohnoma berish',
    'certificates.print' => 'Guvohnomani chop etish',

    'finance.view' => 'Moliya & Kassa oynasi',
    'payments.create' => 'To\'lov qabul qilish',
    'payments.edit' => 'To\'lovni o\'chirish / pul qaytarish',
    'expenses.create' => 'Xarajat kiritish',
    'expenses.delete' => 'Xarajatni o\'chirish',
    'cash_transfers.create' => 'Kassalar orasida o\'tkazma',
    'cash_transfers.approve' => 'O\'tkazmani tasdiqlash',

    'salaries.view' => 'Oyliklarni ko\'rish',
    'salaries.accrue' => 'Oylik / bonus / jarima hisoblash',
    'salaries.pay' => 'Oylik to\'lash',

    'attendance.view' => 'Davomatni ko\'rish',
    'attendance.start_session' => 'Dars (QR) boshlash',
    'attendance.mark_manual' => 'Davomatni qo\'lda belgilash',

    'drivings.view' => 'Mashg\'ulotlarni ko\'rish',
    'drivings.manage' => 'Mashg\'ulotlarni rejalashtirish',
    'autodromes.manage' => 'Avtodromlarni boshqarish',

    'lms.view' => 'LMS kurslarini ko\'rish',
    'lms.manage_materials' => 'LMS materiallarini boshqarish',
    'tickets.manage' => 'Test biletlarini boshqarish',
    'attempts.view' => 'Test natijalarini ko\'rish',

    'crm.view' => 'CRM lidlarni ko\'rish',
    'leads.manage' => 'Lidlarni boshqarish',
    'fleet.view' => 'Avtoparkni ko\'rish',
    'fleet.manage' => 'Avtoparkni boshqarish',

    'drivings.conduct' => 'Haydash darslarini o\'tkazadi (instruktor)',
    'lessons.teach' => 'Nazariy dars o\'tkazadi (o\'qituvchi)',
];

/*
| Capabilities describe work a person does rather than a screen they can open:
| holders appear in instructor / teacher pickers, see only their own students
| and get paid per driving hour / lesson. Superadmin and admin never hold them.
*/
$capabilities = ['drivings.conduct', 'lessons.teach'];

$permissions = array_keys($labels);

return [
    'permissions' => $permissions,

    'labels' => $labels,

    'capabilities' => $capabilities,

    'role_labels' => [
        'superadmin' => 'Superadmin',
        'admin' => 'Admin',
        'accountant' => 'Hisobchi',
        'reception' => 'Reception',
        'kassir' => 'Kassir',
        'teacher' => 'O\'qituvchi',
        'instructor' => 'Instruktor',
    ],

    /*
    | Roles that the staff page may assign, and whose permission sets can be
    | granted to other staff as extras. Admins are managed by superadmins on
    | the admins page and are not salaried.
    */
    'staff_roles' => ['reception', 'kassir', 'accountant', 'teacher', 'instructor'],

    /*
    | Roles whose members are not on the payroll.
    */
    'unsalaried_roles' => ['superadmin', 'admin'],

    'roles' => [
        'superadmin' => array_values(array_diff($permissions, $capabilities)),

        'admin' => [
            'dashboard.view',
            'users.view',
            'users.manage',
            'roles.manage',
            'students.view',
            'students.create',
            'students.edit',
            'students.delete',
            'groups.view',
            'groups.manage',
            'contracts.view',
            'contracts.create',
            'contracts.edit',
            'contracts.print',
            'contract_types.manage',
            'certificates.view',
            'certificates.create',
            'certificates.print',
            'finance.view',
            'payments.create',
            'payments.edit',
            'expenses.create',
            'expenses.delete',
            'cash_transfers.create',
            'salaries.view',
            'salaries.accrue',
            'salaries.pay',
            'attendance.view',
            'attendance.start_session',
            'attendance.mark_manual',
            'drivings.view',
            'drivings.manage',
            'autodromes.manage',
            'lms.view',
            'lms.manage_materials',
            'tickets.manage',
            'attempts.view',
            'crm.view',
            'leads.manage',
            'fleet.view',
            'fleet.manage',
        ],

        'accountant' => [
            'finance.view',
            'payments.create',
            'payments.edit',
            'expenses.create',
            'expenses.delete',
            'cash_transfers.create',
            'cash_transfers.approve',
            'salaries.view',
            'salaries.accrue',
            'salaries.pay',
            'contracts.view',
            'contracts.print',
        ],

        'reception' => [
            'dashboard.view',
            'students.view',
            'students.create',
            'students.edit',
            'groups.view',
            'contracts.view',
            'contracts.create',
            'contracts.print',
            'certificates.view',
            'certificates.print',
            'payments.create',
            'drivings.view',
            'drivings.manage',
            'crm.view',
            'leads.manage',
        ],

        'kassir' => [
            'finance.view',
            'payments.create',
            'expenses.create',
            'cash_transfers.create',
            'contracts.view',
            'salaries.view',
            'salaries.pay',
        ],

        'teacher' => [
            'lessons.teach',
            'attendance.view',
            'attendance.start_session',
            'attendance.mark_manual',
            'lms.view',
            'lms.manage_materials',
            'attempts.view',
            'groups.view',
            'students.view',
        ],

        'instructor' => [
            'drivings.conduct',
            'dashboard.view',
            'groups.view',
            'students.view',
            'drivings.view',
            'drivings.manage',
            'fleet.view',
        ],
    ],
];
