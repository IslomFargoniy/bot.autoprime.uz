<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\BranchScopedValidationRules;
use App\Concerns\PersonalDataRules;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Group;
use App\Models\Lead;
use App\Models\Student;
use App\Services\BranchSessionService;
use App\Services\DocumentNumberService;
use App\Services\TelegramService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class LeadController extends Controller
{
    use BranchScopedValidationRules, PersonalDataRules;

    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = Lead::with(['branch', 'assignedTo', 'convertedStudent', 'contract'])
            ->orderBy('created_at', 'desc');

        if ($targetBranchId) {
            $query->where('branch_id', $targetBranchId);
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('full_name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            });
        }
        $leads = $query->paginate($this->perPage($request, fn () => $query->count()))->withQueryString();

        $contractTypes = ContractType::where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where(function ($sub) use ($targetBranchId) {
                    $sub->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
                });
            })
            ->get();

        $groups = Group::where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where('branch_id', $targetBranchId);
            })
            ->get();

        $branches = Branch::where('status', 'active')->get();

        return Inertia::render('Admin/Leads/Index', [
            'leads' => $leads,
            'contractTypes' => $contractTypes,
            'groups' => $groups,
            'branches' => $branches,
            'filters' => [
                'search' => $request->search,
                'stage' => $request->stage,
                'source' => $request->source,
                'branch_id' => $targetBranchId,
                'per_page' => $request->per_page,
            ],
        ]);
    }

    private const SOURCES = 'telegram_bot,website,instagram,recommendation,walk_in,reception_manual';

    /**
     * Fields shared by creating and editing a lead.
     *
     * @return array<string, mixed>
     */
    private function leadRules(Request $request, ?Lead $lead = null): array
    {
        return [
            'branch_id' => 'nullable|exists:branches,id',
            'category' => 'nullable|string|in:A,B,C,BC,D,E',
            'preferred_time' => 'nullable|string|max:50',
            'birth_date' => $this->rulesUnlessUnchanged($this->birthDateRules(), $request, $lead, 'birth_date'),
            'address' => 'nullable|string|max:500',
            'passport_series' => $this->rulesUnlessUnchanged($this->passportSeriesRules(), $request, $lead, 'passport_series'),
            'passport_number' => $this->rulesUnlessUnchanged($this->passportNumberRules(), $request, $lead, 'passport_number'),
            'pinfl' => $this->rulesUnlessUnchanged($this->pinflRules($request->input('birth_date')), $request, $lead, 'pinfl'),
            'notes' => 'nullable|string',
        ];
    }

    /**
     * A converted lead lives on as a student and contract, so only its notes stay editable.
     */
    private function isConverted(Lead $lead): bool
    {
        return (bool) ($lead->contract_id || $lead->student_id || $lead->stage === 'contract_signed');
    }

    public function store(Request $request): RedirectResponse
    {
        $this->normalizePersonalInput($request);

        $validated = $request->validate([
            ...$this->leadRules($request),
            'full_name' => 'required|string|max:255',
            'phone' => $this->phoneRules(),
            'source' => 'nullable|string|in:'.self::SOURCES,
        ], $this->personalDataMessages());

        $targetBranchId = $validated['branch_id'] ?? BranchSessionService::getActiveBranchId($request) ?? $request->user()->branch_id;

        Lead::create([
            'branch_id' => $targetBranchId,
            'full_name' => $validated['full_name'],
            'phone' => $validated['phone'],
            'category' => $validated['category'] ?? 'B',
            'preferred_time' => $validated['preferred_time'] ?? null,
            'birth_date' => $validated['birth_date'] ?? null,
            'address' => $validated['address'] ?? null,
            'passport_series' => $validated['passport_series'] ?? null,
            'passport_number' => $validated['passport_number'] ?? null,
            'pinfl' => $validated['pinfl'] ?? null,
            'source' => $validated['source'] ?? 'reception_manual',
            'stage' => 'new_lead',
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Lid muvaffaqiyatli saqlandi.');
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        if ($this->isConverted($lead)) {
            $locked = array_keys($request->except(['notes', '_method', '_token']));

            if ($locked !== []) {
                throw ValidationException::withMessages([
                    $locked[0] => "Shartnoma tuzilgan lidning faqat izohini o'zgartirish mumkin.",
                ]);
            }

            $lead->update($request->validate(['notes' => 'nullable|string']));

            return redirect()->back()->with('success', 'Lid yangilandi.');
        }

        $this->normalizePersonalInput($request);

        $validated = $request->validate([
            ...$this->leadRules($request, $lead),
            'full_name' => 'sometimes|required|string|max:255',
            'phone' => array_merge(['sometimes'], $this->rulesUnlessUnchanged($this->phoneRules(), $request, $lead, 'phone')),
            'source' => 'sometimes|required|string|in:'.self::SOURCES,
            'stage' => 'sometimes|required|in:new_lead,form_sent,form_completed,rejected',
            'lost_reason' => 'nullable|string|max:500|required_if:stage,rejected',
        ], $this->personalDataMessages());

        if (isset($validated['stage']) && $validated['stage'] !== 'rejected') {
            $validated['lost_reason'] = null;
        }

        $lead->update($validated);

        return redirect()->back()->with('success', 'Lid yangilandi.');
    }

    /**
     * 1-Click convert lead to Student and create Contract.
     */
    public function convert(Request $request, Lead $lead, TelegramService $telegramService): RedirectResponse
    {
        $validated = $request->validate([
            'contract_type_id' => 'required|exists:contract_types,id',
            'branch_id' => 'nullable|exists:branches,id',
            'group_id' => ['nullable', $this->activeGroupInUserBranch($request)],
            'discount_amount' => 'nullable|numeric|min:0|max:9999999999',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'terms' => 'nullable|string',
        ]);

        if ($lead->stage === 'contract_signed' || $lead->student_id || $lead->contract_id) {
            return redirect()->back()->withErrors([
                'lead' => 'Ushbu lid bilan allaqachon shartnoma tuzilgan.',
            ]);
        }

        if (Student::where('phone', Student::normalizePhone($lead->phone))->exists()) {
            return redirect()->back()->withErrors([
                'phone' => "Bu telefon raqami ({$lead->phone}) bilan o'quvchi allaqachon mavjud.",
            ]);
        }

        $contractType = ContractType::findOrFail($validated['contract_type_id']);
        if (! $contractType->is_active) {
            return redirect()->back()->withErrors(['contract_type_id' => 'Tanlangan tarif faol emas.']);
        }

        $this->ensureGroupHasRoom($validated['group_id'] ?? null);

        $leadGroup = ! empty($validated['group_id']) ? Group::find($validated['group_id']) : null;
        if ($leadGroup && $leadGroup->category !== $contractType->category) {
            return redirect()->back()->withErrors([
                'group_id' => "Guruh toifasi ({$leadGroup->category}) tarif toifasiga ({$contractType->category}) mos emas.",
            ]);
        }

        $branchId = $validated['branch_id'] ?? $lead->branch_id ?? BranchSessionService::getActiveBranchId($request) ?? $request->user()->branch_id;
        $discount = (float) ($validated['discount_amount'] ?? 0);
        $totalAmount = (float) $contractType->price;
        $finalAmount = max(0, $totalAmount - $discount);

        $student = null;
        $contract = null;

        try {
            DB::transaction(function () use ($lead, $contractType, $branchId, $validated, $totalAmount, $discount, $finalAmount, $request, &$student, &$contract) {
                $lockedLead = Lead::where('id', $lead->id)->lockForUpdate()->firstOrFail();
                if ($lockedLead->stage === 'contract_signed' || $lockedLead->student_id || $lockedLead->contract_id) {
                    throw new \DomainException('Ushbu lid bilan allaqachon shartnoma tuzilgan.');
                }

                // Create Student
                $student = Student::create([
                    'branch_id' => $branchId,
                    'group_id' => $validated['group_id'] ?? null,
                    'registered_by_user_id' => $request->user()->id,
                    'full_name' => $lead->full_name,
                    'phone' => $lead->phone,
                    'passport_series' => $lead->passport_series,
                    'passport_number' => $lead->passport_number,
                    'pinfl' => $lead->pinfl,
                    'birth_date' => $lead->birth_date,
                    'address' => $lead->address,
                    'photo_url' => $lead->photo_url,
                    'passport_photo_url' => $lead->passport_photo_url,
                    'medical_certificate_photo_url' => $lead->medical_certificate_photo_url,
                    'telegram_id' => $lead->telegram_id,
                    'telegram_chat_id' => $lead->telegram_id ? (int) $lead->telegram_id : null,
                    'status' => 'active',
                    'is_active' => true,
                ]);

                // Generate Contract number
                $contractNumber = DocumentNumberService::nextContractNumber();

                // Create Contract
                $contract = Contract::create([
                    'branch_id' => $branchId,
                    'student_id' => $student->id,
                    'contract_type_id' => $contractType->id,
                    'group_id' => $validated['group_id'] ?? null,
                    'created_by_user_id' => $request->user()->id,
                    'contract_number' => $contractNumber,
                    'contract_date' => now()->toDateString(),
                    'start_date' => $validated['start_date'] ?? null,
                    'end_date' => $validated['end_date'] ?? null,
                    'has_theory' => $contractType->has_theory,
                    'has_driving' => $contractType->has_driving,
                    'has_lms' => $contractType->has_lms,
                    'required_driving_lessons' => $contractType->required_driving_lessons,
                    'required_theory_lessons' => $contractType->required_theory_lessons,
                    'total_amount' => $totalAmount,
                    'discount_amount' => $discount,
                    'final_amount' => $finalAmount,
                    'paid_amount' => 0,
                    'debt_amount' => $finalAmount,
                    'overpaid_amount' => 0,
                    'status' => 'active',
                    'payment_status' => 'unpaid',
                    'terms' => $validated['terms'] ?? null,
                ]);

                // Update Lead
                $lead->update([
                    'stage' => 'contract_signed',
                    'student_id' => $student->id,
                    'contract_id' => $contract->id,
                ]);
            });
        } catch (\DomainException $e) {
            return redirect()->back()->withErrors([
                'lead' => $e->getMessage(),
            ]);
        }

        if ($contract) {
            $telegramService->sendContractSignedNotification($contract);
        }

        return redirect()->back()->with('success', "O'quvchi ochildi va shartnoma tuzildi: #{$contract?->contract_number}");
    }

    public function destroy(Lead $lead): RedirectResponse
    {
        if ($this->isConverted($lead)) {
            return redirect()->back()->withErrors([
                'delete' => 'Shartnoma tuzilgan lidni o\'chirib bo\'lmaydi.',
            ]);
        }

        $lead->delete();

        return redirect()->back()->with('success', 'Lid o\'chirildi.');
    }
}
