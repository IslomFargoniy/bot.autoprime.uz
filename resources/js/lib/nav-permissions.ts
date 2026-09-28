/**
 * Permissions that open each admin page (any one of them is enough).
 * Pages missing from this map are superadmin-only.
 */
export const NAV_PERMISSIONS: Record<string, string[]> = {
    '/admin/dashboard': ['dashboard.view'],
    '/admin/leads': ['crm.view'],
    '/admin/contracts': ['contracts.view'],
    '/admin/contract-types': ['contracts.view', 'contract_types.manage'],
    '/admin/courses': ['lms.view'],
    '/admin/groups': ['groups.view'],
    '/admin/students': ['students.view'],
    '/admin/attendance': ['attendance.view'],
    '/admin/tests': ['tickets.manage', 'attempts.view'],
    '/admin/certificates': ['certificates.view'],
    '/admin/drivings': ['drivings.view'],
    '/admin/vehicles': ['fleet.view'],
    '/admin/autodromes': ['autodromes.manage'],
    '/admin/instructors': ['users.view'],
    '/admin/staff': ['users.view'],
    '/admin/salaries': ['salaries.view'],
    '/admin/finance': ['finance.view'],
};

export const SUPERADMIN_ONLY = '__superadmin_only__';

export function navPermissionsFor(href: string): string[] {
    return NAV_PERMISSIONS[href] ?? [SUPERADMIN_ONLY];
}
