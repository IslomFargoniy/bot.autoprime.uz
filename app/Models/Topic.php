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

    protected $appends = ['title', 'is_published'];

    public function getTitleAttribute(): string
    {
        $locale = app()->getLocale();

        return match ($locale) {
            'ru' => $this->title_ru ?: ($this->title_uz ?? ''),
            'krill' => $this->title_krill ?: ($this->title_uz ?? ''),
            'en' => $this->title_en ?: ($this->title_uz ?? ''),
            default => $this->title_uz ?: '',
        };
    }

    public function setTitleAttribute(?string $value): void
    {
        $this->attributes['title_uz'] = $value;
    }

    public function getIsPublishedAttribute(): bool
    {
        return (bool) $this->is_active;
    }

    public function setIsPublishedAttribute(?bool $value): void
    {
        $this->attributes['is_active'] = (bool) $value;
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(LessonMaterial::class);
    }

    public function lessonMaterials(): HasMany
    {
        return $this->materials();
    }
}
