<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoadLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'line_number',
        'name_uz',
        'name_ru',
        'name_krill',
        'name_en',
        'description_uz',
        'description_ru',
        'description_krill',
        'description_en',
        'image_url',
    ];
}
