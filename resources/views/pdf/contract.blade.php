<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>Shartnoma #{{ $contract->contract_number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #333; line-height: 1.5; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: bold; color: #1e3a8a; }
        .subtitle { font-size: 12px; color: #64748b; margin-top: 5px; }
        .section { margin-bottom: 15px; }
        .section-title { font-size: 13px; font-weight: bold; background: #f1f5f9; padding: 5px 8px; border-left: 4px solid #2563eb; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }
        th { background: #f8fafc; font-weight: bold; }
        .footer { margin-top: 30px; display: table; width: 100%; }
        .footer-col { display: table-cell; width: 50%; vertical-align: top; }
        .stamp-box { border: 1px dashed #94a3b8; height: 80px; margin-top: 10px; border-radius: 4px; text-align: center; line-height: 80px; color: #94a3b8; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">AUTOPRIME AVTOMAKTABI</div>
        <div class="subtitle">O'QITISH XIZMATLARI BO'YICHA SHARTNOMA #{{ $contract->contract_number }}</div>
    </div>

    <div class="section">
        <div class="section-title">1. SHARTNOMA TARAFLARI</div>
        <p><strong>Ta'lim Muassasasi:</strong> AutoPrime Avtomaktabi (Filial: {{ $branch->name ?? 'Bosh Filial' }})</p>
        <p><strong>Tinglovchi (O'quvchi):</strong> {{ $student->full_name }}</p>
        <p><strong>Telefon:</strong> {{ $student->phone }} | <strong>Pasport / ID:</strong> {{ $student->passport_series }} {{ $student->passport_number }}</p>
    </div>

    <div class="section">
        <div class="section-title">2. TA'LIM SHARTLARI VA MODULLAR</div>
        <table>
            <tr>
                <th>Ta'lim Yo'nalishi / Toifa</th>
                <td>{{ $contractType->category ?? 'B' }} toifa ({{ $contractType->name ?? 'Standart' }})</td>
            </tr>
            <tr>
                <th>Nazariy Darslar</th>
                <td>{{ $contract->has_theory ? "Mavjud ({$contract->required_theory_lessons} ta dars)" : "Yo'q" }}</td>
            </tr>
            <tr>
                <th>Amaliy Haydash (Vajdeniya)</th>
                <td>{{ $contract->has_driving ? "Mavjud ({$contract->required_driving_lessons} ta mashg'ulot)" : "Yo'q" }}</td>
            </tr>
            <tr>
                <th>LMS Video Darslar & Testlar</th>
                <td>{{ $contract->has_lms ? "To'liq ruxsat etilgan" : "Yo'q" }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">3. TO'LOV TARTIBI VA MIQDORI</div>
        <table>
            <tr>
                <th>Belgilangan To'lov:</th>
                <td>{{ number_format((float) $contract->total_amount, 0, '.', ' ') }} UZS</td>
            </tr>
            <tr>
                <th>Chegirma Miqdori:</th>
                <td>{{ number_format((float) $contract->discount_amount, 0, '.', ' ') }} UZS</td>
            </tr>
            <tr>
                <th>To'lanishi Kerak (Yakuniy):</th>
                <td><strong>{{ number_format((float) $contract->final_amount, 0, '.', ' ') }} UZS</strong></td>
            </tr>
            <tr>
                <th>Amaldagi To'langan Summa:</th>
                <td>{{ number_format((float) $contract->paid_amount, 0, '.', ' ') }} UZS ({{ $contract->payment_percentage }}%)</td>
            </tr>
            <tr>
                <th>Qoldiq Qarzdorlik:</th>
                <td>{{ number_format((float) $contract->debt_amount, 0, '.', ' ') }} UZS</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">4. MUHIM QOIDALAR</div>
        <p>1. Nazariy darslarga qatnashish uchun to'lov foizi kamida 30% bo'lishi shart.</p>
        <p>2. Amaliy haydash mashg'ulotlariga yozilish uchun shartnoma summasining kamida 75% to'langan bo'lishi shart.</p>
        <p>3. Bitiruv guvohnomasi (sertifikat) olish uchun qoldiq qarzdorlik to'liq yopilishi (0 UZS), nazariya davomati kamida 70% va amaliy mashg'ulotlar to'liq topshirilishi lozim.</p>
    </div>

    <div class="footer">
        <div class="footer-col">
            <p><strong>Avtomaktab Rahbari:</strong></p>
            <p>Imzo: ___________________</p>
            <div class="stamp-box">M.O'. (Muhr o'rni)</div>
        </div>
        <div class="footer-col">
            <p><strong>Tinglovchi (O'quvchi):</strong></p>
            <p>Imzo: ___________________</p>
            <p>Sana: {{ $contract->contract_date ?? now()->format('d.m.Y') }}</p>
        </div>
    </div>
</body>
</html>
