export type Branch = {
    id: number;
    name: string;
    code: string;
    phone?: string | null;
    address?: string | null;
    status: 'active' | 'inactive';
    users_count?: number;
    groups_count?: number;
    students_count?: number;
    drivings_count?: number;
};

export type User = {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    branch_id?: number | null;
    branch?: Branch | null;
    telegram_id?: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    permissions: string[];
    is_super_admin: boolean;
    home_url: string;
};

export type SharedData = {
    auth: Auth;
    [key: string]: unknown;
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
