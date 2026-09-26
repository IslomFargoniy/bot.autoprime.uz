import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types/auth';

/**
 * Returns a checker for the current user's Spatie permissions.
 * Passing several permissions returns true when the user has any of them.
 */
export function useCan() {
    const { auth } = usePage<SharedData>().props;

    return (...permissions: string[]): boolean => {
        if (auth?.is_super_admin) {
            return true;
        }

        return permissions.some((permission) => auth?.permissions?.includes(permission));
    };
}
