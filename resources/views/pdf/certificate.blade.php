<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>Bitiruv Guvohnomasi #{{ $certificate->certificate_number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; text-align: center; color: #1e293b; padding: 40px 30px; border: 12px double #1e3a8a; }
        .school-name { font-size: 26px; font-weight: bold; color: #1e3a8a; letter-spacing: 2px; }
        .doc-title { font-size: 20px; font-weight: bold; margin-top: 15px; color: #b45309; text-transform: uppercase; }
        .cert-number { font-size: 14px; color: #64748b; margin-top: 5px; }
        .recipient { font-size: 22px; font-weight: bold; margin: 25px 0 10px 0; border-bottom: 2px solid #cbd5e1; display: inline-block; padding: 0 40px 5px 40px; }
        .body-text { font-size: 14px; line-height: 1.8; margin: 15px 40px; color: #334155; }
        .category-badge { display: inline-block; background: #1e3a8a; color: white; padding: 4px 14px; font-size: 16px; font-weight: bold; border-radius: 4px; }
        .footer { margin-top: 45px; display: table; width: 100%; }
        .footer-col { display: table-cell; width: 33%; vertical-align: middle; text-align: center; }
        .qr-placeholder { font-size: 10px; color: #64748b; word-break: break-all; }
        .stamp-circle { border: 2px dashed #94a3b8; width: 90px; height: 90px; border-radius: 50%; line-height: 90px; margin: 0 auto; color: #94a3b8; font-size: 11px; }
    </style>
</head>
<body>
    <div class="school-name">AUTOPRIME AVTOMAKTABI</div>
    <div class="doc-title">BITIRUV GUVOHNOMASI</div>
    <div class="cert-number">№ {{ $certificate->certificate_number }}</div>

    <div style="margin-top: 30px; font-size: 14px; color: #64748b;">Ushbu guvohnoma tasdiqlaydiki:</div>
    <div class="recipient">{{ $student->full_name }}</div>

    <div class="body-text">
        AutoPrime avtomaktabining <strong>{{ $branch->name ?? 'Toshkent' }}</strong> filialida
        <span class="category-badge">{{ $certificate->category ?? 'B' }}</span> toifali avtotransport vositalarini boshqarish bo'yicha to'liq nazariy va amaliy o'quv dasturini muvaffaqiyatli tamomladi hamda ichki imtihonlarni a'lo darajada topshirdi.
    </div>

    <div class="footer">
        <div class="footer-col">
            <p><strong>Avtomaktab Rahbari:</strong></p>
            <p style="margin-top: 25px;">___________________</p>
        </div>
        <div class="footer-col">
            <div class="stamp-circle">M.O'. (Muhr)</div>
            <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Berilgan sana: {{ $certificate->issued_date }}</p>
        </div>
        <div class="footer-col">
            <div class="qr-placeholder">
                <p><strong>QR Tekshiruv:</strong></p>
                <p style="font-size: 9px;">{{ $verifyUrl }}</p>
            </div>
        </div>
    </div>
</body>
</html>
