<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Group;
use App\Models\Lead;
use App\Models\Student;
use App\Services\BranchSessionService;
use App\Services\TelegramService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LeadController extends Controller
{
    public function index(Request $request): Response
    {
        $targetBranchId = BranchSessionService::getActiveBranchId($request);

        $query = Lead::with(['branch', 'assignedTo', 'convertedStudent'])
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

        $leads = $query->paginate(30)->withQueryString();

        $contractTypes = ContractType::where('is_active', true)
            ->when($targetBranchId, function ($q) use ($targetBranchId) {
                $q->where(function ($sub) use ($targetBranchId) {
                    $sub->where('branch_id', $targetBranchId)->orWhereNull('branch_id');
                });
            })
            ->get();

        $groups = Group::where('status', 'active')
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
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'category' => 'nullable|string|in:A,B,C,BC,D,E',
            'source' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $targetBranchId = $validated['branch_id'] ?? BranchSessionService::getActiveBranchId($request) ?? $request->user()->branch_id;

        Lead::create([
            'branch_id' => $targetBranchId,
            'created_by_user_id' => $request->user()->id,
            'full_name' => $validated['full_name'],
            'phone' => $validated['phone'],
            'category' => $validated['category'] ?? 'B',
            'source' => $validated['source'] ?? 'reception_manual',
            'stage' => 'new_lead',
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Lid muvaffaqiyatli saqlandi.');
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        $validated = $request->validate([
            'stage' => 'sometimes|required|in:new_lead,form_sent,form_completed,contract_signed,rejected',
            'notes' => 'nullable|string',
            'category' => 'nullable|string|in:A,B,C,BC,D,E',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

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
            'group_id' => 'nullable|exists:groups,id',
            'discount_amount' => 'nullable|numeric|min:0',
        ]);

        $contractType = ContractType::findOrFail($validated['contract_type_id']);
        $branchId = $validated['branch_id'] ?? $lead->branch_id ?? BranchSessionService::getActiveBranchId($request) ?? $request->user()->branch_id;
        $discount = (float) ($validated['discount_amount'] ?? 0);
        $totalAmount = (float) $contractType->price;
        $finalAmount = max(0, $totalAmount - $discount);

        $student = null;
        $contract = null;

        DB::transaction(function () use ($lead, $contractType, $branchId, $validated, $totalAmount, $discount, $finalAmount, $request, &$student, &$contract) {
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
            $contractCount = Contract::count() + 1;
            $contractNumber = 'AP-'.date('Y').'-'.str_pad((string) $contractCount, 4, '0', STR_PAD_LEFT);

            // Create Contract
            $contract = Contract::create([
                'branch_id' => $branchId,
                'student_id' => $student->id,
                'contract_type_id' => $contractType->id,
                'group_id' => $validated['group_id'] ?? null,
                'created_by_user_id' => $request->user()->id,
                'contract_number' => $contractNumber,
                'contract_date' => now()->toDateString(),
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
            ]);

            // Update Lead
            $lead->update([
                'stage' => 'contract_signed',
                'converted_student_id' => $student->id,
                'converted_at' => now(),
            ]);
        });

        if ($contract) {
            $telegramService->sendContractSignedNotification($contract);
        }

        return redirect()->back()->with('success', "O'quvchi ochildi va shartnoma tuzildi: #{$contract?->contract_number}");
    }

    public function destroy(Lead $lead): RedirectResponse
    {
        $lead->delete();

        return redirect()->back()->with('success', 'Lid o\'chirildi.');
    }
}
