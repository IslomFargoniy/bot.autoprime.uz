@extends('receipts.layout')

@section('title', $isRefund ? 'Qaytarish cheki' : "To'lov cheki")
@section('heading', $isRefund ? 'QAYTARISH CHEKI' : "TO'LOV CHEKI")

@section('body')
    <div class="row"><span class="label">O'quvchi:</span><span class="value">{{ $payment->student?->full_name ?? '-' }}</span></div>
    @if ($payment->student?->phone)
        <div class="row"><span class="label">Telefon:</span><span class="value">{{ $payment->student->phone }}</span></div>
    @endif
    @if ($payment->contract)
        <div class="row"><span class="label">Shartnoma:</span><span class="value">#{{ $payment->contract->contract_number }}</span></div>
        @if ($payment->contract->contractType)
            <div class="row"><span class="label">Tarif:</span><span class="value">{{ $payment->contract->contractType->name }}</span></div>
        @endif
    @endif
    <div class="row"><span class="label">Usul:</span><span class="value">{{ $methodLabel }}</span></div>
    <div class="row"><span class="label">Kassa:</span><span class="value">{{ $payment->cashRegister?->name ?? '-' }}</span></div>
    @if ($payment->comment)
        <div class="row"><span class="label">Izoh:</span><span class="value">{{ $payment->comment }}</span></div>
    @endif
@endsection

@section('footer')
    @if ($payment->contract)
        <div class="row"><span class="label">Jami to'langan:</span><span class="value">{{ number_format((float) $payment->contract->paid_amount, 0, '.', ' ') }}</span></div>
        <div class="row"><span class="label">Qolgan qarz:</span><span class="value">{{ number_format((float) $payment->contract->debt_amount, 0, '.', ' ') }}</span></div>
    @endif
    <div class="row"><span class="label">Qabul qildi:</span><span class="value">{{ $payment->receivedBy?->name ?? '-' }}</span></div>
    <div class="sign">
        <div>Kassir imzosi: ____________</div>
        <div>Mijoz imzosi: ____________</div>
    </div>
@endsection
