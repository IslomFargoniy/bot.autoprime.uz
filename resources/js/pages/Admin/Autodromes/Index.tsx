import { useState, useMemo, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit2, Plus, MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Branch, SharedData } from '@/types/auth';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Autodrome {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    branch_id?: number | null;
    branch?: Branch | null;
    completed_drivings_count?: number;
}

interface PageProps {
    autodromes: Autodrome[];
    branches?: Branch[];
}

function LocationMarker({ position, setPosition, radius }: { position: L.LatLng | null; setPosition: (pos: L.LatLng) => void; radius: number }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    if (!position) return null;

    return (
        <>
            <Marker position={position}></Marker>
            <Circle center={position} pathOptions={{ fillColor: 'blue' }} radius={radius} />
        </>
    );
}

function MapController({ center }: { center: L.LatLng | null }) {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
            if (center) {
                map.setView(center, 15, { animate: true });
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [center, map]);
    return null;
}

export default function AutodromesIndex({ autodromes, branches = [] }: PageProps) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth?.user?.role === 'instructor';

    const [editing, setEditing] = useState<Autodrome | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [locating, setLocating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    
    // Default to Tashkent coordinates if no position is selected
    const defaultCenter = useMemo(() => new L.LatLng(41.2995, 69.2401), []);
    const [position, setPosition] = useState<L.LatLng | null>(null);

    const isSuperAdmin = auth?.user?.role === 'superadmin' || auth?.user?.id === 1;

    const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
        name: '',
        latitude: '',
        longitude: '',
        radius_meters: '100',
        branch_id: '' as string | number,
    });

    const getPhoneLocation = (onSuccess: (lat: number, lng: number) => void, onError?: (err: any) => void) => {
        if (!navigator.geolocation) {
            if (onError) onError(new Error('Geolocation not supported'));
            return;
        }

        // Pass 1: Try high accuracy (GPS) with 6-second timeout
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onSuccess(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                console.warn('High accuracy geolocation failed or timed out, trying low accuracy fallback:', err);
                // Pass 2: Fallback to low accuracy (Wi-Fi/Cell/IP) with 12-second timeout
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        onSuccess(pos.coords.latitude, pos.coords.longitude);
                    },
                    (finalErr) => {
                        console.error('All geolocation attempts failed:', finalErr);
                        if (onError) onError(finalErr);
                    },
                    { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
                );
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
        );
    };

    useEffect(() => {
        if (showForm && !editing && !position) {
            setLocating(true);
            getPhoneLocation(
                (lat, lng) => {
                    const userLatLng = new L.LatLng(lat, lng);
                    setPosition(userLatLng);
                    setLocating(false);
                    toast.success(t('autodromes.location_found', 'Hozirgi joylashuvingiz belgilandi'));
                },
                (err) => {
                    setLocating(false);
                    console.log('Location error:', err);
                }
            );
        }
    }, [showForm, editing]);

    useEffect(() => {
        if (position) {
            setData((prev) => ({
                ...prev,
                latitude: String(position.lat),
                longitude: String(position.lng)
            }));
        }
    }, [position]);

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            toast.error(t('autodromes.geolocation_not_supported', 'Brauzeringiz geolokatsiyani qo\'llab-quvvatlamaydi'));
            return;
        }

        setLocating(true);
        getPhoneLocation(
            (lat, lng) => {
                const userLatLng = new L.LatLng(lat, lng);
                setPosition(userLatLng);
                setLocating(false);
                toast.success(t('autodromes.location_found', 'Hozirgi joylashuvingiz belgilandi'));
            },
            (err) => {
                setLocating(false);
                toast.error(t('autodromes.geolocation_denied', 'Joylashuvni aniqlab bo\'lmadi. Qushimcha ruxsatni tekshiring.'));
            }
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return;
        if (editing) {
            put('/admin/autodromes/' + editing.id, {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('autodromes.edit', 'Avtodrom yangilandi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] || t('drivings.error', 'Xatolik yuz berdi')),
            });
        } else {
            post('/admin/autodromes', {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('autodromes.new', 'Avtodrom yaratildi'));
                },
                onError: (err) => toast.error(Object.values(err)[0] || t('drivings.error', 'Xatolik yuz berdi')),
            });
        }
    };

    const handleEdit = (autodrome: Autodrome) => {
        setEditing(autodrome);
        setData({
            name: autodrome.name,
            latitude: String(autodrome.latitude),
            longitude: String(autodrome.longitude),
            radius_meters: String(autodrome.radius_meters),
            branch_id: autodrome.branch_id ? String(autodrome.branch_id) : '',
        });
        setPosition(new L.LatLng(autodrome.latitude, autodrome.longitude));
        setShowForm(true);
    };

    const handleDelete = (id: number) => {
        if (isDeleting === id) return;
        if (confirm(t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"))) {
            setIsDeleting(id);
            destroy('/admin/autodromes/' + id, {
                onSuccess: () => toast.success(t('common.delete', "O'chirildi")),
                onError: (err) => toast.error(Object.values(err)[0] || t('drivings.error', 'Xatolik yuz berdi')),
                onFinish: () => setIsDeleting(null),
            });
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setTimeout(() => {
            setEditing(null);
            setPosition(null);
            reset();
        }, 300);
    };

    return (
        <div className="p-6">
            <Head title={t('autodromes.title', 'Avtodromlar')} />
            
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t('autodromes.title', 'Avtodromlar')}</h1>
                {!isInstructor && (
                    <Button onClick={() => setShowForm(true)} variant="brand" className="text-xs">
                        <Plus className="w-4 h-4 mr-1.5" />
                        {t('common.add', "Qo'shish")}
                    </Button>
                )}
            </div>

            <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            {editing ? t('autodromes.edit', 'Avtodromni tahrirlash') : t('autodromes.new', 'Yangi Avtodrom')}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing ? t('common.edit', 'Tahrirlash') : t('common.add', "Qo'shish")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label required htmlFor="name">{t('autodromes.name', 'Nomi')}</Label>
                                <Input id="name" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Masalan: Asosiy avtodrom" required className="mt-1" />
                                {errors.name && <div className="text-destructive text-sm mt-1">{errors.name}</div>}
                            </div>
                            <div>
                                <Label required htmlFor="radius_meters">{t('autodromes.radius_label', 'Radius (metrda)')}</Label>
                                <Input type="number" id="radius_meters" value={data.radius_meters} onChange={e => setData('radius_meters', e.target.value)} placeholder="Masalan: 100" required min="10" className="mt-1" />
                                {errors.radius_meters && <div className="text-destructive text-sm mt-1">{errors.radius_meters}</div>}
                            </div>
                        </div>

                        <div className="border rounded-xl p-2 bg-muted/40 dark:bg-slate-900/50 h-[400px]">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> 
                                    {t('autodromes.map_hint', 'Xaritadan joyni tanlang (ustiga bosing)')}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLocateMe}
                                    disabled={locating}
                                    className="h-8 text-xs bg-background text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 shadow-xs"
                                >
                                    {locating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Navigation className="w-3.5 h-3.5 mr-1" />}
                                    {t('autodromes.locate_me', 'Hozirgi joylashuvim')}
                                </Button>
                            </div>
                            <MapContainer 
                                center={position || defaultCenter} 
                                zoom={position ? 15 : 12} 
                                style={{ height: 'calc(100% - 36px)', width: '100%', borderRadius: '0.5rem' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapController center={position} />
                                <LocationMarker 
                                    position={position} 
                                    setPosition={setPosition} 
                                    radius={Number(data.radius_meters) || 100} 
                                />
                            </MapContainer>
                        </div>
                        
                        {(errors.latitude || errors.longitude) && (
                            <div className="text-destructive text-sm">{t('autodromes.location_required', 'Xaritadan manzilni belgilash majburiy.')}</div>
                        )}

                        {isSuperAdmin && (
                            <div>
                                <Label htmlFor="branch_id">{t('branches.branch', 'Filial')}</Label>
                                <SearchableSelect
                                    id="branch_id"
                                    value={data.branch_id}
                                    onChange={(val) => setData('branch_id', val ? String(val) : '')}
                                    options={[
                                        { value: '', label: t('branches.branch_optional', 'Filial (Ixtiyoriy)') },
                                        ...(branches || []).map((b) => ({ value: b.id, label: b.name })),
                                    ]}
                                    placeholder={t('branches.branch_optional', 'Filial (Ixtiyoriy)')}
                                    allowClear
                                    triggerClassName="h-10 text-sm mt-1"
                                />
                                {errors.branch_id && <div className="text-destructive text-sm mt-1">{errors.branch_id}</div>}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={closeForm}>{t('common.cancel', 'Bekor qilish')}</Button>
                            <Button type="submit" variant="brand" disabled={processing || !position}>{t('common.save', 'Saqlash')}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="bg-card border rounded-xl shadow-xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">{t('common.number', '№')}</TableHead>
                            <TableHead>{t('autodromes.name', 'Nomi')}</TableHead>
                            <TableHead>{t('branches.branch', 'Filial')}</TableHead>
                            <TableHead>{t('autodromes.coordinates', 'Kordinatalar')}</TableHead>
                            <TableHead>{t('autodromes.radius', 'Radius (metr)')}</TableHead>
                            <TableHead className="text-center">{t('autodromes.completed_drivings', 'Tugagan darslar')}</TableHead>
                            {!isInstructor && <TableHead className="text-right">{t('common.actions', 'Amallar')}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {autodromes.length === 0 ? (
                            <TableEmpty
                                colSpan={isInstructor ? 6 : 7}
                                icon={MapPin}
                                title={t('common.no_data', "Ma'lumot topilmadi")}
                            />
                        ) : (
                            autodromes.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-gray-500">{index + 1}</TableCell>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">{item.name}</TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400">{item.branch?.name || '-'}</TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                                        {item.latitude}, {item.longitude}
                                    </TableCell>
                                    <TableCell className="font-semibold text-blue-600 dark:text-blue-400">{item.radius_meters}m</TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                            {item.completed_drivings_count || 0}
                                        </span>
                                    </TableCell>
                                    {!isInstructor && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="h-7 w-7 p-0">
                                                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleDelete(item.id)} disabled={isDeleting === item.id}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
