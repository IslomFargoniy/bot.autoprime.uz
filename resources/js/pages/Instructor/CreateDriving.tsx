import { useState, useMemo, FormEvent } from 'react';
import { useForm, Link } from '@inertiajs/react';
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
        if (!data.group_id) return null;
        return groups.find(g => g.id.toString() === data.group_id.toString());
    }, [data.group_id, groups]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (processing) return;
        post('/instructor/drivings');
    };

    return (
        <TMALayout title={t('drivings.new', 'Yangi Mashg\'ulot')}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-36 shadow-sm border border-gray-100 dark:border-gray-700">
                <form onSubmit={submit} className="space-y-4">
                    
                    {/* Group Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('instructor_panel.select_group', 'Guruhni tanlang')}</label>
                        <select
                            value={data.group_id}
                            onChange={e => {
                                setData('group_id', e.target.value);
                                setData('student_id', ''); // reset student when group changes
                            }}
                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 dark:text-white"
                        >
                            <option value="">{t('common.select', '-- Tanlang --')}</option>
                            {groups.map(group => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>
                        {errors.group_id && <div className="text-red-500 text-xs mt-1">{errors.group_id}</div>}
                    </div>

                    {/* Student Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('instructor_panel.select_student', 'O\'quvchini tanlang')}</label>
                        <select
                            value={data.student_id}
                            onChange={e => setData('student_id', e.target.value)}
                            disabled={!selectedGroup}
                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 dark:text-white"
                        >
                            <option value="">{t('common.select', '-- Tanlang --')}</option>
                            {selectedGroup?.students.map(student => (
                                <option key={student.id} value={student.id}>{student.full_name} ({student.phone || '-'})</option>
                            ))}
                        </select>
                        {errors.student_id && <div className="text-red-500 text-xs mt-1">{errors.student_id}</div>}
                    </div>

                    {/* Start Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('instructor_panel.start_time', 'Boshlanish vaqti')}</label>
                        <input
                            type="datetime-local"
                            value={data.start_time}
                            onChange={e => setData('start_time', e.target.value)}
                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 dark:text-white"
                        />
                        {errors.start_time && <div className="text-red-500 text-xs mt-1">{errors.start_time}</div>}
                    </div>

                    {/* End Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('instructor_panel.end_time', 'Tugash vaqti')}</label>
                        <input
                            type="datetime-local"
                            value={data.end_time}
                            onChange={e => setData('end_time', e.target.value)}
                            className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 dark:text-white"
                        />
                        {errors.end_time && <div className="text-red-500 text-xs mt-1">{errors.end_time}</div>}
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Link
                            href="/admin/dashboard"
                            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-3 px-4 rounded-xl text-center transition-colors"
                        >
                            {t('common.cancel', 'Bekor qilish')}
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl text-center transition-colors disabled:opacity-70"
                        >
                            {processing ? t('common.saving', 'Saqlanmoqda...') : t('common.save', 'Saqlash')}
                        </button>
                    </div>
                </form>
            </div>
        </TMALayout>
    );
}
