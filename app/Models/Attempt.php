<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'user_id',
        'ticket_id',
        'attempt_type',
        'total_questions',
        'correct_answers',
        'wrong_answers',
        'score_percentage',
        'is_passed',
        'started_at',
        'finished_at',
        'duration_seconds',
    ];

    protected $casts = [
        'total_questions' => 'integer',
        'correct_answers' => 'integer',
        'wrong_answers' => 'integer',
        'score_percentage' => 'decimal:2',
        'is_passed' => 'boolean',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'duration_seconds' => 'integer',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(AttemptAnswer::class);
    }
}
