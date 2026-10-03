import { Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { printReceipt } from '@/lib/print-receipt';

interface Props {
    url: string;
    className?: string;
}

/**
 * Reprints the receipt of a payment or expense that was saved earlier.
 */
export function ReceiptButton({ url, className }: Props) {
    const { t } = useTranslation();
    const label = t('finance.print_receipt', 'Chek');

    return (
        <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => printReceipt(url)}
            title={label}
            className={
                className ??
                'h-7 px-2 text-xs text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/30'
            }
        >
            <Printer className="mr-1 h-3.5 w-3.5" />
            {label}
        </Button>
    );
}
