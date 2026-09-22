<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'instructor_id',
        'make_model',
        'plate_number',
        'fuel_type',
        'current_mileage',
        'last_oil_change_mileage',
        'next_oil_change_mileage',
        'insurance_expiry_date',
        'gas_inspection_expiry_date',
        'mot_expiry_date',
        'status',
    ];

    protected $casts = [
        'current_mileage' => 'integer',
        'last_oil_change_mileage' => 'integer',
        'next_oil_change_mileage' => 'integer',
        'insurance_expiry_date' => 'date',
        'gas_inspection_expiry_date' => 'date',
        'mot_expiry_date' => 'date',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function defaultInstructor(): BelongsTo
    {
        return $this->instructor();
    }

    public function drivings(): HasMany
    {
        return $this->hasMany(Driving::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(VehicleMaintenance::class);
    }
}
