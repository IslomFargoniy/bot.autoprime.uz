<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title') #{{ $number }}</title>
    <style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #e5e7eb; font-family: 'DejaVu Sans Mono', 'Courier New', monospace; color: #000; }
        .receipt { width: 72mm; margin: 12px auto; padding: 4mm; background: #fff; font-size: 11px; line-height: 1.45; }
        .center { text-align: center; }
        .brand { font-size: 14px; font-weight: bold; letter-spacing: 1px; }
        .title { font-size: 13px; font-weight: bold; margin: 6px 0 2px; text-transform: uppercase; }
        .muted { font-size: 10px; }
        hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; gap: 6px; }
        .row .label { flex: 0 0 auto; }
        .row .value { text-align: right; word-break: break-word; }
        .total { margin: 6px 0; padding: 4px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
        .total .amount { font-size: 17px; font-weight: bold; }
        .sign { margin-top: 14px; }
        .sign div { margin-top: 12px; }
        .actions { text-align: center; margin: 8px 0 16px; }
        .actions button { padding: 8px 18px; font-size: 14px; cursor: pointer; }
        @media print {
            body { background: #fff; }
            .receipt { margin: 0; width: 72mm; }
            .actions { display: none; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="center">
            <div class="brand">AUTOPRIME AVTOMAKTABI</div>
            @if ($branch)
                <div class="muted">{{ $branch->name }}</div>
                @if ($branch->address)<div class="muted">{{ $branch->address }}</div>@endif
                @if ($branch->phone)<div class="muted">Tel: {{ $branch->phone }}</div>@endif
            @endif
            <div class="title">@yield('heading')</div>
            <div>№ {{ $number }}</div>
            <div class="muted">{{ $dateTime }}</div>
        </div>
        <hr>
        @yield('body')
        <div class="total center">
            <div class="muted">SUMMA</div>
            <div class="amount">{{ number_format((float) $amount, 0, '.', ' ') }} UZS</div>
        </div>
        @yield('footer')
        <hr>
        <div class="center muted">Chop etilgan: {{ now()->format('Y-m-d H:i') }}</div>
        <div class="center muted">Rahmat!</div>
    </div>

    <div class="actions">
        <button type="button" onclick="window.print()">Chop etish</button>
    </div>

    @if ($autoprint)
        <script>
            // Opened in its own tab it prints itself; inside the app's print frame the app prints it.
            if (window.self === window.top) {
                window.addEventListener('load', function () { window.print(); });
            }
        </script>
    @endif
</body>
</html>
