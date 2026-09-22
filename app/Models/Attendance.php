<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'lesson_session_id',
        'student_id',
        'scanned_at',
        'status',
        'is_manual',
        'marked_by_user_id',
        'manual_reason',
        'ip_address',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
        'is_manual' => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(LessonSession::class, 'lesson_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function markedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by_user_id');
    }
}
