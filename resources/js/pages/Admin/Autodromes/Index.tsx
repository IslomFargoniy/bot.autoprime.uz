import { Head, useForm, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import L from 'leaflet';
import { Trash2, Edit2, Plus, MapPin, Navigation, Loader2 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MapContainer,
    TileLayer,
    Marker,
    Circle,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import { toast } from 'sonner';
import { PageFilterBar } from '@/components/page-filter-bar';
import Pagination from '@/components/pagination';
import PerPageSelect from '@/components/per-page-select';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableEmpty,
} from '@/components/ui/table';
import type { Branch, SharedData } from '@/types/auth';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Autodrome {
    id: number;
    name: string;
    latitude: number | string;
    longitude: number | string;
    radius_meters: number;
    branch_id?: number | null;
    branch?: Branch | null;
    completed_drivings_count?: number;
}

interface PageProps {
    autodromes:
        | {
              data: Autodrome[];
              links: any[];
              total?: number;
              from?: number;
              to?: number;
          }
        | Autodrome[];
    branches?: Branch[];
    filters?: {
        branch_id?: string | number;
        per_page?: string;
    };
}

function LocationMarker({
    position,
    setPosition,
    radius,
}: {
    position: L.LatLng | null;
    setPosition: (pos: L.LatLng) => void;
    radius: number;
}) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    if (!position) {
        return null;
    }

    return (
        <>
            <Marker position={position}></Marker>
            <Circle
                center={position}
                pathOptions={{ fillColor: 'blue' }}
                radius={radius}
            />
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

export default function AutodromesIndex({
    autodromes,
    branches = [],
    filters = {},
}: PageProps) {
    const autodromesList: Autodrome[] = Array.isArray(autodromes)
        ? autodromes
        : autodromes?.data || [];
    const autodromesLinks = !Array.isArray(autodromes)
        ? autodromes?.links
        : undefined;
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const isInstructor = auth?.user?.role === 'instructor';

    const [perPage, setPerPage] = useState(filters?.per_page || '15');
    const [editing, setEditing] = useState<Autodrome | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [locating, setLocating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    const handlePerPageChange = (val: string) => {
        setPerPage(val);
        router.get(
            '/admin/autodromes',
            {
                ...filters,
                per_page: val,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    // Default to Tashkent coordinates if no position is selected
    const defaultCenter = useMemo(() => new L.LatLng(41.2995, 69.2401), []);
    const [position, setPosition] = useState<L.LatLng | null>(null);

    const isSuperAdmin = !!auth?.is_super_admin;

    const {
        data,
        setData,
        post,
        put,
        delete: destroy,
        reset,
        errors,
        processing,
    } = useForm({
        name: '',
        latitude: '',
        longitude: '',
        radius_meters: '100',
        branch_id: '' as string | number,
    });

    const getPhoneLocation = (
        onSuccess: (lat: number, lng: number) => void,
        onError?: (err: any) => void,
    ) => {
        if (!navigator.geolocation) {
            if (onError) {
                onError(new Error('Geolocation not supported'));
            }

            return;
        }

        // Pass 1: Try high accuracy (GPS) with 6-second timeout
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onSuccess(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                console.warn(
                    'High accuracy geolocation failed or timed out, trying low accuracy fallback:',
                    err,
                );
                // Pass 2: Fallback to low accuracy (Wi-Fi/Cell/IP) with 12-second timeout
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        onSuccess(pos.coords.latitude, pos.coords.longitude);
                    },
                    (finalErr) => {
                        console.error(
                            'All geolocation attempts failed:',
                            finalErr,
                        );

                        if (onError) {
                            onError(finalErr);
                        }
                    },
                    {
                        enableHighAccuracy: false,
                        timeout: 12000,
                        maximumAge: 60000,
                    },
                );
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
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
                    toast.success(
                        t(
                            'autodromes.location_found',
                            'Hozirgi joylashuvingiz belgilandi',
                        ),
                    );
                },
                (err) => {
                    setLocating(false);
                    console.log('Location error:', err);
                },
            );
        }
    }, [showForm, editing]);

    useEffect(() => {
        if (position) {
            setData((prev) => ({
                ...prev,
                latitude: String(position.lat),
                longitude: String(position.lng),
            }));
        }
    }, [position]);

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            toast.error(
                t(
                    'autodromes.geolocation_not_supported',
                    "Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi",
                ),
            );

            return;
        }

        setLocating(true);
        getPhoneLocation(
            (lat, lng) => {
                const userLatLng = new L.LatLng(lat, lng);
                setPosition(userLatLng);
                setLocating(false);
                toast.success(
                    t(
                        'autodromes.location_found',
                        'Hozirgi joylashuvingiz belgilandi',
                    ),
                );
            },
            () => {
                setLocating(false);
                toast.error(
                    t(
                        'autodromes.geolocation_denied',
                        "Joylashuvni aniqlab bo'lmadi. Qushimcha ruxsatni tekshiring.",
                    ),
                );
            },
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (processing) {
            return;
        }

        if (editing) {
            put('/admin/autodromes/' + editing.id, {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('autodromes.edit', 'Avtodrom yangilandi'));
                },
                onError: (err) =>
                    toast.error(
                        Object.values(err)[0] ||
                            t('drivings.error', 'Xatolik yuz berdi'),
                    ),
            });
        } else {
            post('/admin/autodromes', {
                onSuccess: () => {
                    closeForm();
                    toast.success(t('autodromes.new', 'Avtodrom yaratildi'));
                },
                onError: (err) =>
                    toast.error(
                        Object.values(err)[0] ||
                            t('drivings.error', 'Xatolik yuz berdi'),
                    ),
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
        setPosition(
            new L.LatLng(
                Number(autodrome.latitude),
                Number(autodrome.longitude),
            ),
        );
        setShowForm(true);
    };

    const handleDelete = (id: number) => {
        if (isDeleting === id) {
            return;
        }

        if (
            confirm(
                t('common.confirm_delete', "Rostdan ham o'chirmoqchimisiz?"),
            )
        ) {
            setIsDeleting(id);
            destroy('/admin/autodromes/' + id, {
                onSuccess: () =>
                    toast.success(t('common.delete', "O'chirildi")),
                onError: (err) =>
                    toast.error(
                        Object.values(err)[0] ||
                            t('drivings.error', 'Xatolik yuz berdi'),
                    ),
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
        <div className="space-y-4 p-4 md:space-y-6 md:p-6">
            <Head title={t('autodromes.title', 'Avtodromlar')} />

            <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold sm:text-2xl">
                    {t('autodromes.title', 'Avtodromlar')}
                </h1>
                {!isInstructor && (
                    <Button
                        onClick={() => setShowForm(true)}
                        variant="brand"
                        size="sm"
                        className="shrink-0 text-xs"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        <span>{t('common.add', "Qo'shish")}</span>
                    </Button>
                )}
            </div>

            <Dialog
                open={showForm}
                onOpenChange={(open) => !open && closeForm()}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            {editing
                                ? t('autodromes.edit', 'Avtodromni tahrirlash')
                                : t('autodromes.new', 'Yangi Avtodrom')}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing
                                ? t('common.edit', 'Tahrirlash')
                                : t('common.add', "Qo'shish")}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                            <div>
                                <Label required htmlFor="name">
                                    {t('autodromes.name', 'Nomi')}
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder="Masalan: Asosiy avtodrom"
                                    required
                                    className="mt-1"
                                />
                                {errors.name && (
                                    <div className="mt-1 text-sm text-destructive">
                                        {errors.name}
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label required htmlFor="radius_meters">
                                    {t(
                                        'autodromes.radius_label',
                                        'Radius (metrda)',
                                    )}
                                </Label>
                                <Input
                                    type="number"
                                    id="radius_meters"
                                    value={data.radius_meters}
                                    onChange={(e) =>
                                        setData('radius_meters', e.target.value)
                                    }
                                    placeholder="Masalan: 100"
                                    required
                                    min="10"
                                    className="mt-1"
                                />
                                {errors.radius_meters && (
                                    <div className="mt-1 text-sm text-destructive">
                                        {errors.radius_meters}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-[280px] rounded-xl border bg-muted/40 p-2 sm:h-[380px] dark:bg-slate-900/50">
                            <div className="mb-2 flex items-center justify-between px-1">
                                <p className="flex items-center gap-1.5 truncate text-xs font-medium text-muted-foreground sm:text-sm">
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                        {t(
                                            'autodromes.map_hint',
                                            'Xaritadan joyni tanlang (ustiga bosing)',
                                        )}
                                    </span>
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLocateMe}
                                    disabled={locating}
                                    className="h-7 shrink-0 border-blue-200 bg-background text-xs text-blue-600 shadow-xs hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/60"
                                >
                                    {locating ? (
                                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Navigation className="mr-1 h-3.5 w-3.5" />
                                    )}
                                    <span>
                                        {t(
                                            'autodromes.locate_me',
                                            'Joylashuvim',
                                        )}
                                    </span>
                                </Button>
                            </div>
                            <MapContainer
                                center={position || defaultCenter}
                                zoom={position ? 15 : 12}
                                style={{
                                    height: 'calc(100% - 36px)',
                                    width: '100%',
                                    borderRadius: '0.5rem',
                                }}
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
                            <div className="text-sm text-destructive">
                                {t(
                                    'autodromes.location_required',
                                    'Xaritadan manzilni belgilash majburiy.',
                                )}
                            </div>
                        )}

                        {isSuperAdmin && (
                            <div>
                                <Label htmlFor="branch_id">
                                    {t('branches.branch', 'Filial')}
                                </Label>
                                <SearchableSelect
                                    id="branch_id"
                                    value={data.branch_id}
                                    onChange={(val) =>
                                        setData(
                                            'branch_id',
                                            val ? String(val) : '',
                                        )
                                    }
                                    options={[
                                        {
                                            value: '',
                                            label: t(
                                                'branches.branch_optional',
                                                'Filial (Ixtiyoriy)',
                                            ),
                                        },
                                        ...(branches || []).map((b) => ({
                                            value: b.id,
                                            label: b.name,
                                        })),
                                    ]}
                                    placeholder={t(
                                        'branches.branch_optional',
                                        'Filial (Ixtiyoriy)',
                                    )}
                                    allowClear
                                    triggerClassName="h-10 text-sm mt-1"
                                />
                                {errors.branch_id && (
                                    <div className="mt-1 text-sm text-destructive">
                                        {errors.branch_id}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 border-t pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeForm}
                            >
                                {t('common.cancel', 'Bekor qilish')}
                            </Button>
                            <Button
                                type="submit"
                                variant="brand"
                                disabled={processing || !position}
                            >
                                {t('common.save', 'Saqlash')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Filter Toolbar */}
            <PageFilterBar>
                <div className="flex-1" />
                <PerPageSelect value={perPage} onChange={handlePerPageChange} />
            </PageFilterBar>

            {/* Desktop/Tablet Table */}
            <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-xs md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                {t('common.number', '№')}
                            </TableHead>
                            <TableHead>
                                {t('autodromes.name', 'Nomi')}
                            </TableHead>
                            <TableHead>
                                {t('branches.branch', 'Filial')}
                            </TableHead>
                            <TableHead>
                                {t('autodromes.coordinates', 'Kordinatalar')}
                            </TableHead>
                            <TableHead>
                                {t('autodromes.radius', 'Radius (metr)')}
                            </TableHead>
                            <TableHead className="text-center">
                                {t(
                                    'autodromes.completed_drivings',
                                    'Tugagan darslar',
                                )}
                            </TableHead>
                            {!isInstructor && (
                                <TableHead className="text-right">
                                    {t('common.actions', 'Amallar')}
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {autodromesList.length === 0 ? (
                            <TableEmpty
                                colSpan={isInstructor ? 6 : 7}
                                icon={MapPin}
                                title={t(
                                    'common.no_data',
                                    "Ma'lumot topilmadi",
                                )}
                            />
                        ) : (
                            autodromesList.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-gray-500">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400">
                                        {item.branch?.name || '-'}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                        {item.latitude}, {item.longitude}
                                    </TableCell>
                                    <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                                        {item.radius_meters}m
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                            {item.completed_drivings_count || 0}
                                        </span>
                                    </TableCell>
                                    {!isInstructor && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleEdit(item)
                                                    }
                                                    className="h-7 w-7 p-0"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                    onClick={() =>
                                                        handleDelete(item.id)
                                                    }
                                                    disabled={
                                                        isDeleting === item.id
                                                    }
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
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

            {/* Mobile Cards Feed */}
            <div className="space-y-3 md:hidden">
                {autodromesList.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-card p-4 py-8 text-center">
                        <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                        <div className="text-sm font-medium">
                            {t('common.no_data', "Ma'lumot topilmadi")}
                        </div>
                    </div>
                ) : (
                    autodromesList.map((item, index) => (
                        <div
                            key={item.id}
                            className="space-y-2.5 rounded-xl border bg-card p-3.5 shadow-2xs"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[10px] text-muted-foreground">
                                            #{index + 1}
                                        </span>
                                        <span className="truncate text-sm font-bold">
                                            {item.name}
                                        </span>
                                    </div>
                                    {item.branch && (
                                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                            {item.branch.name}
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                        {item.radius_meters}m
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-1.5 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1 truncate font-mono text-[11px]">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate">
                                        {Number(item.latitude || 0).toFixed(4)},{' '}
                                        {Number(item.longitude || 0).toFixed(4)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                    <span>
                                        {t(
                                            'autodromes.completed_drivings',
                                            'Darslar',
                                        )}
                                        :
                                    </span>
                                    <span className="font-bold">
                                        {item.completed_drivings_count || 0}
                                    </span>
                                </div>
                            </div>

                            {!isInstructor && (
                                <div className="flex justify-end gap-1 border-t pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(item)}
                                        className="h-8 gap-1 text-xs"
                                    >
                                        <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                                        <span>
                                            {t('common.edit', 'Tahrirlash')}
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                        onClick={() => handleDelete(item.id)}
                                        disabled={isDeleting === item.id}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>
                                            {t('common.delete', "O'chirish")}
                                        </span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {autodromesLinks && (
                <Pagination
                    links={autodromesLinks}
                    total={
                        !Array.isArray(autodromes)
                            ? autodromes.total
                            : undefined
                    }
                    from={
                        !Array.isArray(autodromes) ? autodromes.from : undefined
                    }
                    to={!Array.isArray(autodromes) ? autodromes.to : undefined}
                />
            )}
        </div>
    );
}
