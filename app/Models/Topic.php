<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Topic extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'title_uz',
        'title_ru',
        'title_krill',
        'title_en',
        'description',
        'video_url',
        'duration_minutes',
        'order_number',
        'is_active',
    ];

    protected $casts = [
        'duration_minutes' => 'integer',
        'order_number' => 'integer',
        'is_active' => 'boolean',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(LessonMaterial::class);
    }
}
