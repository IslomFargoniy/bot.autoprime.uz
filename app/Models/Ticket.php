<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'title_uz',
        'title_ru',
        'title_krill',
        'title_en',
        'description',
        'is_active',
    ];

    protected $casts = [
        'ticket_number' => 'integer',
        'is_active' => 'boolean',
    ];

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('question_number');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(Attempt::class);
    }
}
