import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Car,
    Wrench,
    Fuel,
    Calendar,
    Search,
    Trash2,
    Edit2,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface VehicleMaintenance {
    id: number;
    maintenance_type: string;
    cost: number | string;
    performed_date: string;
    next_due_date?: string;
    odometer?: number;
    notes?: string;
}

interface Vehicle {
    id: number;
    plate_number: string;
    model: string;
    year?: number;
    fuel_type: string;
    status: string;
    default_instructor_id?: number;
    default_instructor?: { id: number; name: string };
    branch?: { id: number; name: string };
    current_mileage?: number;
    maintenances?: VehicleMaintenance[];
}

interface PageProps {
    vehicles: {
        data: Vehicle[];
        links: any[];
        total: number;
    };
    instructors: Array<{ id: number; name: string }>;
    branches: Array<{ id: number; name: string }>;
    filters: {
        search?: string;
        branch_id?: string | number;
    };
}

export default function VehiclesIndex({
    vehicles,
    instructors,
    branches,
    filters,
}: PageProps) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [maintainingVehicle, setMaintainingVehicle] = useState<Vehicle | null>(null);

    const vehicleForm = useForm({
        branch_id: branches[0]?.id || '',
        default_instructor_id: '',
        plate_number: '',
        model: '',
        year: 2024,
        fuel_type: 'petrol',
        status: 'active',
        notes: '',
    });

    const maintenanceForm = useForm({
        maintenance_type: 'Moy almashtirish (Oil change)',
        cost: '',
        performed_date: new Date().toISOString().split('T')[0],
        next_due_date: '',
        odometer: '',
        notes: '',
    });

    const openCreate = () => {
        setEditingVehicle(null);
        vehicleForm.reset();
        setShowModal(true);
    };

    const openMaintenance = (v: Vehicle) => {
        setMaintainingVehicle(v);
        maintenanceForm.setData({
            maintenance_type: 'Moy almashtirish (Oil change)',
            cost: '',
            performed_date: new Date().toISOString().split('T')[0],
            next_due_date: '',
            odometer: v.current_mileage ? String(v.current_mileage) : '',
            notes: '',
        });
    };

    const openEdit = (v: Vehicle) => {
        setEditingVehicle(v);
        let fuel = v.fuel_type;
        if (fuel === 'methane') fuel = 'gas_methane';
        if (fuel === 'propane') fuel = 'gas_propane';
        let status = v.status;
        if (status === 'retired') status = 'out_of_service';

        vehicleForm.setData({
            branch_id: v.branch?.id || branches[0]?.id || '',
            default_instructor_id: v.default_instructor_id ? String(v.default_instructor_id) : '',
            plate_number: v.plate_number,
            model: v.model,
            year: v.year || 2024,
            fuel_type: fuel,
            status: status,
            notes: '',
        });
        setShowModal(true);
    };

    const handleVehicleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingVehicle) {
            vehicleForm.put(`/admin/vehicles/${editingVehicle.id}`, {
                onSuccess: () => {
                    setShowModal(false);
                    toast.success(t('vehicles.updated', 'Avtomobil yangilandi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        } else {
            vehicleForm.post('/admin/vehicles', {
                onSuccess: () => {
                    setShowModal(false);
                    vehicleForm.reset();
                    toast.success(t('vehicles.created', 'Avtomobil qo\'shildi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleMaintenanceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!maintainingVehicle) return;

        maintenanceForm.post(`/admin/vehicles/${maintainingVehicle.id}/maintenances`, {
            onSuccess: () => {
                setMaintainingVehicle(null);
                maintenanceForm.reset();
                toast.success(t('vehicles.maintenance_saved', 'Texnik xizmat kiritildi'));
            },
            onError: (err) => toast.error(Object.values(err)[0] as string || t('common.error', 'Xatolik yuz berdi')),
        });
    };

    const handleDelete = (v: Vehicle) => {
        if (confirm(t('common.confirm_delete', 'Rostdan ham o\'chirmoqchimisiz?'))) {
            router.delete(`/admin/vehicles/${v.id}`, {
                onSuccess: () => toast.success(t('common.deleted', 'O\'chirildi')),
            });
        }
    };

    return (
        <div className="p-6">
            <Head title={t('vehicles.title', 'Avtopark (Mashinalar)')} />

            {/* Page Title & Add Button */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('vehicles.title', 'Avtopark (Mashinalar)')}</h1>
                <Button onClick={openCreate} size="icon" className="shrink-0 md:w-auto md:px-4 md:py-2">
                    <Plus className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">{t('vehicles.add_vehicle', 'Mashina Qo\'shish')}</span>
                </Button>
            </div>

            {/* Vehicles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.data.map((v) => (
                    <div
                        key={v.id}
                        className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="px-2.5 py-1 rounded-md bg-gray-900 text-white font-mono font-bold text-xs tracking-wider">
                                    {v.plate_number}
                                </span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                    v.status === 'active'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                        : v.status === 'maintenance'
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}>
                                    {t(`vehicles.status_${v.status}`, v.status)}
                                </span>
                            </div>

                            <h3 className="font-bold text-base text-gray-900 dark:text-white mt-2">
                                {v.model} {v.year ? `(${v.year})` : ''}
                            </h3>

                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                    <span>{t('vehicles.instructor', 'Instruktor')}:</span>
                                    <span className="font-semibold">{v.default_instructor?.name || t('common.not_assigned', 'Biriktirilmagan')}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                    <span>{t('vehicles.fuel', 'Yoqilg\'i')}:</span>
                                    <span className="font-semibold">
                                        {v.fuel_type === 'gas_methane' || v.fuel_type === 'methane'
                                            ? 'Metan Gaz (Methane)'
                                            : v.fuel_type === 'gas_propane' || v.fuel_type === 'propane'
                                            ? 'Propan Gaz (Propane)'
                                            : v.fuel_type === 'diesel'
                                            ? 'Dizel'
                                            : v.fuel_type === 'electric'
                                            ? 'Elektromobil'
                                            : 'Benzin (Petrol)'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                    <span>{t('vehicles.branch', 'Filial')}:</span>
                                    <span className="font-semibold">{v.branch?.name || '-'}</span>
                                </div>
                            </div>

                            {/* Recent Maintenance Alert */}
                            {v.maintenances && v.maintenances.length > 0 && (
                                <div className="mt-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40 text-[11px] space-y-1">
                                    <span className="text-gray-500 dark:text-gray-400 block font-medium">Oxirgi texnik xizmat:</span>
                                    <div className="flex justify-between font-semibold">
                                        <span>{v.maintenances[0].maintenance_type}</span>
                                        <span>{Number(v.maintenances[0].cost).toLocaleString('uz-UZ')} UZS</span>
                                    </div>
                                    <span className="text-gray-400 dark:text-gray-500 block text-[10px]">{v.maintenances[0].performed_date}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMaintenance(v)}
                                className="h-8 text-xs text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                                <Wrench className="w-3.5 h-3.5 mr-1" />
                                {t('vehicles.maintenance_button', '+ Texnik xizmat')}
                            </Button>
                            <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openEdit(v)} className="h-8 text-xs">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(v)} className="h-8 text-xs text-red-500 hover:text-red-700">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Vehicle Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingVehicle ? t('vehicles.edit_title', 'Avtomobilni Tahrirlash') : t('vehicles.create_title', 'Yangi Avtomobil Qo\'shish')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleVehicleSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="v_plate">{t('vehicles.plate', 'Davlat Raqami')}</Label>
                                <Input
                                    id="v_plate"
                                    value={vehicleForm.data.plate_number}
                                    onChange={(e) => vehicleForm.setData('plate_number', e.target.value.toUpperCase())}
                                    placeholder="01 A 777 AA"
                                    required
                                    className="mt-1 font-mono uppercase"
                                />
                            </div>
                            <div>
                                <Label htmlFor="v_model">{t('vehicles.model', 'Model')}</Label>
                                <Input
                                    id="v_model"
                                    value={vehicleForm.data.model}
                                    onChange={(e) => vehicleForm.setData('model', e.target.value)}
                                    placeholder="Chevrolet Cobalt"
                                    required
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="v_fuel">{t('vehicles.fuel', 'Yoqilg\'i turi')}</Label>
                                <SearchableSelect
                                    id="v_fuel"
                                    value={vehicleForm.data.fuel_type}
                                    onChange={(val) => vehicleForm.setData('fuel_type', val)}
                                    options={[
                                        { value: 'petrol', label: t('vehicles.fuel_petrol', 'Benzin (Petrol)') },
                                        { value: 'gas_methane', label: t('vehicles.fuel_methane', 'Metan Gaz (Methane)') },
                                        { value: 'gas_propane', label: t('vehicles.fuel_propane', 'Propan Gaz (Propane)') },
                                        { value: 'diesel', label: t('vehicles.fuel_diesel', 'Dizel (Diesel)') },
                                        { value: 'electric', label: t('vehicles.fuel_electric', 'Elektromobil') },
                                    ]}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="v_inst">{t('vehicles.instructor', 'Asosiy Instruktor')}</Label>
                                <SearchableSelect
                                    id="v_inst"
                                    value={vehicleForm.data.default_instructor_id}
                                    onChange={(val) => vehicleForm.setData('default_instructor_id', val ? String(val) : '')}
                                    options={[
                                        { value: '', label: t('common.not_assigned', 'Biriktirilmagan') },
                                        ...instructors.map((ins) => ({ value: String(ins.id), label: ins.name })),
                                    ]}
                                    placeholder={t('common.not_assigned', 'Biriktirilmagan')}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="v_branch">{t('vehicles.branch', 'Filial')}</Label>
                                <SearchableSelect
                                    id="v_branch"
                                    value={vehicleForm.data.branch_id}
                                    onChange={(val) => vehicleForm.setData('branch_id', val ? String(val) : '')}
                                    options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                                    placeholder={t('branches.branch', 'Filial')}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="v_status">{t('vehicles.status', 'Holat')}</Label>
                                <SearchableSelect
                                    id="v_status"
                                    value={vehicleForm.data.status}
                                    onChange={(val) => vehicleForm.setData('status', val)}
                                    options={[
                                        { value: 'active', label: t('vehicles.status_active', 'Faol') },
                                        { value: 'maintenance', label: t('vehicles.status_maintenance', "Ta'mirda / Texnik ko'rikda") },
                                        { value: 'out_of_service', label: t('vehicles.status_retired', 'Hisobdan chiqarilgan') },
                                    ]}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button type="submit" disabled={vehicleForm.processing}>
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Maintenance Modal */}
            <Dialog open={!!maintainingVehicle} onOpenChange={(open) => !open && setMaintainingVehicle(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('vehicles.maintenance_title', 'Texnik Xizmat Kiritish')}</DialogTitle>
                    </DialogHeader>
                    {maintainingVehicle && (
                        <form onSubmit={handleMaintenanceSubmit} className="space-y-4 text-xs">
                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <p className="font-semibold text-gray-900 dark:text-white">{maintainingVehicle.model} ({maintainingVehicle.plate_number})</p>
                            </div>

                            <div>
                                <Label htmlFor="m_type">{t('vehicles.maintenance_type', 'Xizmat Turi')}</Label>
                                <SearchableSelect
                                    id="m_type"
                                    value={maintenanceForm.data.maintenance_type}
                                    onChange={(val) => maintenanceForm.setData('maintenance_type', String(val))}
                                    options={[
                                        { value: 'Moy almashtirish (Oil change)', label: 'Moy almashtirish (Oil change)' },
                                        { value: 'Gaz baloni tekshiruvi (Methane inspection)', label: 'Gaz baloni tekshiruvi' },
                                        { value: "Sug'urta (Insurance)", label: "Sug'urta rasmiylashtirish" },
                                        { value: "Texnik ko'rik (Vehicle inspection)", label: "Davlat texnik ko'rigi" },
                                        { value: 'Shina almashtirish (Tire change)', label: 'Shina almashtirish' },
                                        { value: "Tormoz tizimi ta'miri (Brakes)", label: "Tormoz tizimi ta'miri" },
                                        { value: "Boshqa ta'mir", label: "Boshqa ta'mir" },
                                    ]}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="m_cost">{t('vehicles.cost', 'Xarajat (UZS)')}</Label>
                                    <Input
                                        id="m_cost"
                                        type="number"
                                        value={maintenanceForm.data.cost}
                                        onChange={(e) => maintenanceForm.setData('cost', e.target.value)}
                                        required
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="m_odo">{t('vehicles.odometer', 'Probeg (km)')}</Label>
                                    <Input
                                        id="m_odo"
                                        type="number"
                                        value={maintenanceForm.data.odometer}
                                        onChange={(e) => maintenanceForm.setData('odometer', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="m_date">{t('vehicles.performed_date', 'Bajarilgan sana')}</Label>
                                    <DatePicker
                                        id="m_date"
                                        value={maintenanceForm.data.performed_date}
                                        onChange={(val) => maintenanceForm.setData('performed_date', val)}
                                        placeholder="YYYY-MM-DD"
                                        required
                                        className="mt-1 h-9 text-xs"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="m_next">{t('vehicles.next_due_date', 'Keyingi muddat')}</Label>
                                    <DatePicker
                                        id="m_next"
                                        value={maintenanceForm.data.next_due_date}
                                        onChange={(val) => maintenanceForm.setData('next_due_date', val)}
                                        placeholder="YYYY-MM-DD"
                                        className="mt-1 h-9 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setMaintainingVehicle(null)}>
                                    {t('common.cancel', 'Bekor qilish')}
                                </Button>
                                <Button type="submit" disabled={maintenanceForm.processing}>
                                    {t('common.save', 'Saqlash')}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
