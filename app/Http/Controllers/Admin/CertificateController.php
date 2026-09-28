<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\BranchScopedValidationRules;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Certificate;
use App\Models\Contract;
use App\Models\Student;
use App\Services\BranchSessionService;
use App\Services\CertificateEligibilityService;
use App\Services\DocumentNumberService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CertificateController extends Controller
{
    use BranchScopedValidationRules;

    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $ownStudents = $request->user()->worksOnOwnRecordsOnly() ? Student::query()->visibleTo($request->user())->select('id') : null;

        $query = Certificate::with(['student', 'contract.contractType', 'issuedBy', 'branch'])
            ->when($ownStudents, fn ($q) => $q->whereIn('student_id', $ownStudents))
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
        $certificates = $query->paginate($this->perPage($request, fn () => $query->count()))->withQueryString();

        // Candidates: students with active contracts
        $activeContracts = Contract::with(['student', 'contractType', 'group'])
            ->where('status', 'active')
            ->when($ownStudents, fn ($q) => $q->whereIn('student_id', $ownStudents))
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->get();

        $eligibility = app(CertificateEligibilityService::class)->evaluate($activeContracts);

        $candidates = [];
        foreach ($activeContracts as $c) {
            $student = $c->student;
            if (! $student) {
                continue;
            }

            $candidates[] = [
                'student_id' => $student->id,
                'student_name' => $student->full_name,
                'phone' => $student->phone,
                'contract_id' => $c->id,
                'contract_number' => $c->contract_number,
                'category' => $c->contractType ? $c->contractType->category : 'B',
                'debt_amount' => $c->debt_amount,
                ...$eligibility[$c->id],
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
                'per_page' => $request->per_page,
            ],
        ]);
    }

    /**
     * Issue official Certificate after automated 4-condition check.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'contract_id' => ['required', $this->existsInUserBranch($request, 'contracts')],
            'notes' => 'nullable|string',
        ]);

        $contract = Contract::with(['student', 'contractType'])->findOrFail($validated['contract_id']);
        $student = $contract->student;
        $this->ensureCanSeeStudent($request, $student);
        if (! $student) {
            return redirect()->back()->withErrors([
                'contract_id' => 'Shartnomaga biriktirilgan o\'quvchi topilmadi.',
            ]);
        }

        if ($contract->status !== 'active') {
            return redirect()->back()->withErrors([
                'contract_id' => 'Guvohnoma faqat faol shartnoma uchun beriladi.',
            ]);
        }

        // Verify 4 conditions strictly
        $conditions = app(CertificateEligibilityService::class)->evaluateOne($contract);

        if (! $conditions['debt_ok']) {
            return redirect()->back()->withErrors([
                'contract_id' => "O'quvchining shartnoma bo'yicha qoldiq qarzdorligi mavjud: {$contract->debt_amount} UZS. Guvohnoma berish taqiqlanadi.",
            ]);
        }

        if (! $conditions['attendance_ok']) {
            return redirect()->back()->withErrors([
                'contract_id' => "O'quvchining nazariy davomati 70% dan kam ({$conditions['attendance_rate']}%).",
            ]);
        }

        if (! $conditions['driving_ok']) {
            return redirect()->back()->withErrors([
                'contract_id' => "Amaliy haydash darslari to'liq o'tilmagan ({$conditions['completed_drivings']}/{$conditions['required_drivings']}).",
            ]);
        }

        if (! $conditions['passed_exam']) {
            return redirect()->back()->withErrors([
                'contract_id' => "O'quvchi ichki imtihondan (LMS test) muvaffaqiyatli o'tmagan.",
            ]);
        }

        $certNumber = DB::transaction(function () use ($contract, $student, $request, $validated) {
            // Lock the contract so a double click cannot issue two certificates.
            $lockedContract = Contract::whereKey($contract->id)->lockForUpdate()->first();
            if ($lockedContract->status !== 'active' || Certificate::where('contract_id', $contract->id)->exists()) {
                return null;
            }

            $certNumber = DocumentNumberService::nextCertificateNumber();

            Certificate::create([
                'branch_id' => $contract->branch_id ?? $student->branch_id ?? Branch::first()->id ?? 1,
                'student_id' => $student->id,
                'contract_id' => $contract->id,
                'issued_by_user_id' => $request->user()->id,
                'certificate_number' => $certNumber,
                'qr_verify_hash' => hash('sha256', $student->id.$contract->id.uniqid().config('app.key')),
                'category' => $contract->contractType ? $contract->contractType->category : 'B',
                'issued_date' => now()->toDateString(),
                'status' => 'issued',
                'notes' => $validated['notes'] ?? null,
            ]);

            $lockedContract->update(['status' => 'completed']);

            return $certNumber;
        });

        if (! $certNumber) {
            return redirect()->back()->withErrors([
                'contract_id' => 'Ushbu shartnoma uchun guvohnoma allaqachon berilgan.',
            ]);
        }

        return redirect()->back()->with('success', "Bitiruv Guvohnomasi rasmiylashtirildi: #{$certNumber}");
    }

    /**
     * Download PDF Certificate.
     */
    public function downloadPdf(Request $request, Certificate $certificate)
    {
        $this->ensureCanSeeStudent($request, $certificate->student);

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
