<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SignCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name_uz',
        'name_ru',
        'name_krill',
        'name_en',
        'slug',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    public function signs(): HasMany
    {
        return $this->hasMany(Sign::class, 'category_id')->orderBy('order');
    }
}
