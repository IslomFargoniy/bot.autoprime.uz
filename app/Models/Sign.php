<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sign extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'sign_number',
        'name_uz',
        'name_ru',
        'name_krill',
        'name_en',
        'description_uz',
        'description_ru',
        'description_krill',
        'description_en',
        'image_url',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(SignCategory::class, 'category_id');
    }
}
