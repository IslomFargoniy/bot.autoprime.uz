import { useForm, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TMALayout from '@/layouts/tma-layout';

interface Student {
    id: number;
    full_name: string;
    phone?: string;
}

interface Group {
    id: number;
    name: string;
    students: Student[];
}

interface PageProps {
    groups: Group[];
}

export default function CreateDriving({ groups = [] }: PageProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        group_id: '',
        student_id: '',
        start_time: '',
        end_time: '',
    });

    const selectedGroup = useMemo(() => {
        if (!data.group_id) {
            return null;
        }

        return groups.find((g) => g.id.toString() === data.group_id.toString());
    }, [data.group_id, groups]);

    const submit = (e: FormEvent) => {
        e.preventDefault();

        if (processing) {
            return;
        }

        post('/instructor/drivings');
    };

    return (
        <TMALayout title={t('drivings.new', "Yangi Mashg'ulot")}>
            <div className="mb-36 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <form onSubmit={submit} className="space-y-4">
                    {/* Group Selection */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t(
                                'instructor_panel.select_group',
                                'Guruhni tanlang',
                            )}
                        </label>
                        <select
                            value={data.group_id}
                            onChange={(e) => {
                                setData('group_id', e.target.value);
                                setData('student_id', ''); // reset student when group changes
                            }}
                            className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">
                                {t('common.select', '-- Tanlang --')}
                            </option>
                            {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                        {errors.group_id && (
                            <div className="mt-1 text-xs text-red-500">
                                {errors.group_id}
                            </div>
                        )}
                    </div>

                    {/* Student Selection */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t(
                                'instructor_panel.select_student',
                                "O'quvchini tanlang",
                            )}
                        </label>
                        <select
                            value={data.student_id}
                            onChange={(e) =>
                                setData('student_id', e.target.value)
                            }
                            disabled={!selectedGroup}
                            className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">
                                {t('common.select', '-- Tanlang --')}
                            </option>
                            {selectedGroup?.students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.full_name} ({student.phone || '-'})
                                </option>
                            ))}
                        </select>
                        {errors.student_id && (
                            <div className="mt-1 text-xs text-red-500">
                                {errors.student_id}
                            </div>
                        )}
                    </div>

                    {/* Start Time */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t(
                                'instructor_panel.start_time',
                                'Boshlanish vaqti',
                            )}
                        </label>
                        <input
                            type="datetime-local"
                            value={data.start_time}
                            onChange={(e) =>
                                setData('start_time', e.target.value)
                            }
                            className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.start_time && (
                            <div className="mt-1 text-xs text-red-500">
                                {errors.start_time}
                            </div>
                        )}
                    </div>

                    {/* End Time */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('instructor_panel.end_time', 'Tugash vaqti')}
                        </label>
                        <input
                            type="datetime-local"
                            value={data.end_time}
                            onChange={(e) =>
                                setData('end_time', e.target.value)
                            }
                            className="w-full rounded-xl border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        {errors.end_time && (
                            <div className="mt-1 text-xs text-red-500">
                                {errors.end_time}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Link
                            href="/admin/dashboard"
                            className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-center font-medium text-gray-800 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            {t('common.cancel', 'Bekor qilish')}
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
                        >
                            {processing
                                ? t('common.saving', 'Saqlanmoqda...')
                                : t('common.save', 'Saqlash')}
                        </button>
                    </div>
                </form>
            </div>
        </TMALayout>
    );
}
