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

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
