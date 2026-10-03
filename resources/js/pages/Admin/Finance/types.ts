export interface CashRegister {
    id: number;
    branch_id?: number | null;
    cash_register_type_id?: number;
    name: string;
    balance: number | string;
    type?: { id: number; code: string; name: string };
    branch?: { id: number; name: string } | null;
    is_active: boolean;
}

export interface Payment {
    id: number;
    receipt_number: string;
    amount: number | string;
    payment_method: string;
    paid_at: string;
    student?: { full_name: string; phone: string };
    contract?: { contract_number: string };
    cash_register?: { name: string };
    received_by?: { name: string };
}

export interface Expense {
    id: number;
    receipt_number?: string;
    amount: number | string;
    description: string;
    spent_at?: string;
    expense_date?: string;
    category?: { name: string };
    cash_register?: { name: string };
    user?: { name: string };
}

export interface CashTransaction {
    id: number;
    receipt_url?: string | null;
    cash_register_id: number;
    type: 'in' | 'out';
    category:
        | 'payment'
        | 'expense'
        | 'transfer_in'
        | 'transfer_out'
        | 'sweep_in'
        | 'sweep_out'
        | 'refund'
        | 'initial'
        | 'salary'
        | 'maintenance';
    amount: number | string;
    balance_before: number | string;
    balance_after: number | string;
    description?: string;
    user?: { name: string };
    cash_register?: {
        id: number;
        name: string;
        branch?: { id: number; name: string } | null;
        type?: { id: number; name: string; code: string };
    };
    transacted_at: string;
}

export interface CashTransfer {
    id: number;
    from_cash_register?: { name: string };
    to_cash_register?: { name: string };
    amount: number | string;
    status: 'pending' | 'approved' | 'rejected';
    sent_by_user_id?: number | null;
    can_review?: boolean;
    transferred_by?: { name: string };
    approved_by?: { name: string };
    notes?: string | null;
    created_at: string;
}

export interface SweepItem {
    cash_register_id: number;
    name: string;
    branch_name: string;
    type_name: string;
    target_name: string;
    balance: number;
    amount: number;
    selected: boolean;
}

export interface PageProps {
    cashRegisters: CashRegister[];
    superadminRegisters: CashRegister[];
    payments: {
        data: Payment[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
    };
    expenses: {
        data: Expense[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
    };
    transactions: {
        data: CashTransaction[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
    };
    transfers: {
        data: CashTransfer[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
    };
    branches: Array<{ id: number; name: string }>;
    expenseCategories: Array<{ id: number; name: string }>;
    registerTypes: Array<{ id: number; code: string; name: string }>;
    students: Array<{ id: number; full_name: string; phone: string }>;
    contracts: Array<{
        id: number;
        student_id: number;
        contract_number: string;
        final_amount: number | string;
        paid_amount: number | string;
        debt_amount: number | string;
    }>;
    filters?: {
        branch_id?: string | number;
        per_page?: string;
        history_register_id?: string | number;
        history_category?: string;
        history_from?: string;
        history_to?: string;
    };
}
