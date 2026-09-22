<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'question_number',
        'question_uz',
        'question_ru',
        'question_krill',
        'question_en',
        'description_uz',
        'description_ru',
        'description_krill',
        'description_en',
        'image_url',
        'audio_url_uz',
        'audio_url_ru',
        'audio_url_krill',
        'audio_url_en',
        'is_active',
    ];

    protected $casts = [
        'question_number' => 'integer',
        'is_active' => 'boolean',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(Answer::class)->orderBy('order');
    }
}
