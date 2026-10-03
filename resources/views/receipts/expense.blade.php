@extends('receipts.layout')

@section('title', 'Chiqim orderi')
@section('heading', 'CHIQIM ORDERI')

@section('body')
    <div class="row"><span class="label">Toifa:</span><span class="value">{{ $expense->category?->name ?? '-' }}</span></div>
    @if ($expense->recipient)
        <div class="row"><span class="label">Oluvchi:</span><span class="value">{{ $expense->recipient }}</span></div>
    @endif
    @if ($expense->description)
        <div class="row"><span class="label">Tavsif:</span><span class="value">{{ $expense->description }}</span></div>
    @endif
    <div class="row"><span class="label">Kassa:</span><span class="value">{{ $expense->cashRegister?->name ?? '-' }}</span></div>
@endsection

@section('footer')
    <div class="row"><span class="label">Chiqardi:</span><span class="value">{{ $expense->user?->name ?? '-' }}</span></div>
    <div class="sign">
        <div>Berdi: ____________</div>
        <div>Oldi: ____________</div>
    </div>
@endsection
