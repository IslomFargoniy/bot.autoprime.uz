<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Certificate;
use App\Models\Contract;
use App\Models\Driving;
use App\Services\BranchSessionService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CertificateController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = Certificate::with(['student', 'contract.contractType', 'issuedBy', 'branch'])
            ->orderBy('issued_date', 'desc');

        if ($targetBranchId) {
            $query->where('branch_id', $targetBranchId);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('certificate_number', 'like', "%{$s}%")
                    ->orWhereHas('student', function ($sub) use ($s) {
                        $sub->where('full_name', 'like', "%{$s}%");
                    });
            });
        }

        $certificates = $query->paginate(20)->withQueryString();

        // Candidates: students with active contracts
        $activeContracts = Contract::with(['student', 'contractType', 'group'])
            ->where('status', 'active')
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->get();

        $candidates = [];
        foreach ($activeContracts as $c) {
            $student = $c->student;
            if (! $student) {
                continue;
            }

            // Check 4 conditions
            $debtOk = (float) $c->debt_amount <= 0;

            // Attendance rate
            $totalAttendances = Attendance::where('student_id', $student->id)->count();
            $requiredTheory = $c->required_theory_lessons ?: 24;
            $attendanceRate = $requiredTheory > 0 ? round(($totalAttendances / $requiredTheory) * 100, 1) : 100;
            $attendanceOk = $attendanceRate >= 70.0;

            // Drivings count
            $completedDrivings = Driving::where('student_id', $student->id)->where('status', 'completed')->count();
            $requiredDriving = $c->required_driving_lessons ?: 10;
            $drivingOk = $completedDrivings >= $requiredDriving;

            // Internal exam pass
            $passedExam = $student->attempts()->where('is_passed', true)->exists();

            $isEligible = $debtOk && $attendanceOk && $drivingOk && $passedExam;

            $candidates[] = [
                'student_id' => $student->id,
                'student_name' => $student->full_name,
                'phone' => $student->phone,
                'contract_id' => $c->id,
                'contract_number' => $c->contract_number,
                'category' => $c->contractType ? $c->contractType->category : 'B',
                'debt_amount' => $c->debt_amount,
                'debt_ok' => $debtOk,
                'attendance_rate' => $attendanceRate,
                'attendance_ok' => $attendanceOk,
                'completed_drivings' => $completedDrivings,
                'required_drivings' => $requiredDriving,
                'driving_ok' => $drivingOk,
                'passed_exam' => $passedExam,
                'is_eligible' => $isEligible,
            ];
        }

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Certificates/Index', [
            'certificates' => $certificates,
            'candidates' => $candidates,
            'branches' => $branches,
            'filters' => [
                'search' => $request->search,
                'branch_id' => $targetBranchId,
            ],
        ]);
    }

    /**
     * Issue official Certificate after automated 4-condition check.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'contract_id' => 'required|exists:contracts,id',
            'notes' => 'nullable|string',
        ]);

        $contract = Contract::with(['student', 'contractType'])->findOrFail($validated['contract_id']);
        $student = $contract->student;
        if (! $student) {
            return redirect()->back()->withErrors([
                'contract_id' => 'Shartnomaga biriktirilgan o\'quvchi topilmadi.',
            ]);
        }

        // Verify 4 conditions strictly
        if ((float) $contract->debt_amount > 0) {
            return redirect()->back()->withErrors([
                'contract_id' => "O'quvchining shartnoma bo'yicha qoldiq qarzdorligi mavjud: {$contract->debt_amount} UZS. Guvohnoma berish taqiqlanadi.",
            ]);
        }

        $requiredTheory = $contract->required_theory_lessons ?: 24;
        $totalAttendances = Attendance::where('student_id', $student->id)->count();
        $attendanceRate = $requiredTheory > 0 ? ($totalAttendances / $requiredTheory) * 100 : 100;
        if ($attendanceRate < 70.0) {
            return redirect()->back()->withErrors([
                'contract_id' => "O'quvchining nazariy davomati 70% dan kam ({$attendanceRate}%).",
            ]);
        }

        $completedDrivings = Driving::where('student_id', $student->id)->where('status', 'completed')->count();
        $requiredDriving = $contract->required_driving_lessons ?: 10;
        if ($completedDrivings < $requiredDriving) {
            return redirect()->back()->withErrors([
                'contract_id' => "Amaliy haydash darslari to'liq o'tilmagan ({$completedDrivings}/{$requiredDriving}).",
            ]);
        }

        $passedExam = $student->attempts()->where('is_passed', true)->exists();
        if (! $passedExam) {
            return redirect()->back()->withErrors([
                'contract_id' => "O'quvchi ichki imtihondan (LMS test) muvaffaqiyatli o'tmagan.",
            ]);
        }

        // Generate Certificate
        $certCount = Certificate::count() + 1;
        $certNumber = 'CERT-'.date('Y').'-'.str_pad((string) $certCount, 4, '0', STR_PAD_LEFT);
        $verifyHash = hash('sha256', $student->id.$contract->id.uniqid().config('app.key'));

        Certificate::create([
            'branch_id' => $contract->branch_id ?? $student->branch_id ?? Branch::first()?->id ?? 1,
            'student_id' => $student->id,
            'contract_id' => $contract->id,
            'issued_by_user_id' => $request->user()->id,
            'certificate_number' => $certNumber,
            'qr_verify_hash' => $verifyHash,
            'category' => $contract->contractType ? $contract->contractType->category : 'B',
            'issued_date' => now()->toDateString(),
            'status' => 'issued',
            'notes' => $validated['notes'] ?? null,
        ]);

        $contract->update(['status' => 'completed']);

        return redirect()->back()->with('success', "Bitiruv Guvohnomasi rasmiylashtirildi: #{$certNumber}");
    }

    /**
     * Download PDF Certificate.
     */
    public function downloadPdf(Certificate $certificate)
    {
        $certificate->load(['student', 'contract.contractType', 'branch', 'issuedBy']);

        $pdf = Pdf::loadView('pdf.certificate', [
            'certificate' => $certificate,
            'student' => $certificate->student,
            'branch' => $certificate->branch,
            'verifyUrl' => route('certificates.verify', $certificate->qr_verify_hash),
        ]);

        return $pdf->download("Guvohnoma_{$certificate->certificate_number}.pdf");
    }

    /**
     * Public QR verification endpoint.
     */
    public function verify(string $hash)
    {
        $certificate = Certificate::with(['student', 'branch', 'contract.contractType'])
            ->where('qr_verify_hash', $hash)
            ->firstOrFail();

        return response()->json([
            'valid' => true,
            'certificate_number' => $certificate->certificate_number,
            'student_name' => $certificate->student?->full_name,
            'category' => $certificate->category,
            'issued_date' => $certificate->issued_date,
            'branch' => $certificate->branch?->name,
            'status' => $certificate->status,
        ]);
    }
}
