<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleMaintenance extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'maintenance_type',
        'cost',
        'mileage',
        'performed_at',
        'description',
        'invoice_photo_url',
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'mileage' => 'integer',
        'performed_at' => 'date',
    ];

    protected $appends = ['notes', 'performed_date', 'odometer'];

    public function getNotesAttribute(): ?string
    {
        return $this->description;
    }

    public function setNotesAttribute(?string $value): void
    {
        $this->attributes['description'] = $value;
    }

    public function getPerformedDateAttribute(): ?string
    {
        return $this->performed_at?->toDateString();
    }

    public function setPerformedDateAttribute($value): void
    {
        $this->attributes['performed_at'] = $value;
    }

    public function getOdometerAttribute(): ?int
    {
        return $this->mileage;
    }

    public function setOdometerAttribute(?int $value): void
    {
        $this->attributes['mileage'] = $value;
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
