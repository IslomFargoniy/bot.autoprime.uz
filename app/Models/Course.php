<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'description',
        'thumbnail_url',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = ['title'];

    public function getTitleAttribute(): string
    {
        return $this->name ?? '';
    }

    public function setTitleAttribute(?string $value): void
    {
        $this->attributes['name'] = $value;
    }

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class)->orderBy('order_number');
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }
}
