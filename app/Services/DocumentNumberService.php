<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\Contract;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Model;

class DocumentNumberService
{
    /**
     * Generate the next sequential document number for the given prefix
     * (e.g. "AP-2026-" → "AP-2026-0007").
     *
     * The sequence is derived from the highest existing number with the same
     * prefix rather than from a row count, so deleted records never cause the
     * next number to collide with an existing one. Call it inside a
     * DB::transaction so the row lock holds until the new record is inserted.
     *
     * @param  class-string<Model>  $modelClass
     */
    public static function next(string $modelClass, string $column, string $prefix, int $padLength = 4): string
    {
        $latestNumber = $modelClass::query()
            ->where($column, 'like', $prefix.'%')
            ->orderByRaw("LENGTH({$column}) DESC")
            ->orderByDesc($column)
            ->lockForUpdate()
            ->value($column);

        $latestSequence = $latestNumber ? (int) substr($latestNumber, strlen($prefix)) : 0;

        return $prefix.str_pad((string) ($latestSequence + 1), $padLength, '0', STR_PAD_LEFT);
    }

    /**
     * Next contract number: AP-{year}-{seq}.
     */
    public static function nextContractNumber(): string
    {
        return self::next(Contract::class, 'contract_number', 'AP-'.date('Y').'-');
    }

    /**
     * Next payment receipt number: REC-{Ymd}-{seq}.
     */
    public static function nextReceiptNumber(): string
    {
        return self::next(Payment::class, 'receipt_number', 'REC-'.date('Ymd').'-');
    }

    /**
     * Next refund receipt number: REF-{Ymd}-{seq}.
     */
    public static function nextRefundNumber(): string
    {
        return self::next(Payment::class, 'receipt_number', 'REF-'.date('Ymd').'-');
    }

    /**
     * Next certificate number: CERT-{year}-{seq}.
     */
    public static function nextCertificateNumber(): string
    {
        return self::next(Certificate::class, 'certificate_number', 'CERT-'.date('Y').'-');
    }
}
