import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, CircularProgress } from '@mui/material';
import fetch from '@/utils/fetch';
import { useAuthStore } from '@/store/authStore';
import ExpenseForm from './ExpenseForm.jsx';
import { expenseError, today } from './expenseForm.js';

export default function Create() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const lockedOffice = useAuthStore((state) => state.user?.branch_id);
    const [ready, setReady] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get('branches/options'),
            fetch.get('admin/expense-categories/all'),
            fetch.get('admin/currencies?limit=1000'),
            fetch.get('agency'),
        ]).then(([branchRes, categoryRes, currencyRes, agencyRes]) => {
            if (!active) return;
            const allOffices = branchRes.data?.data?.branches || [];
            const offices = lockedOffice
                ? allOffices.filter((office) => String(office.id) === String(lockedOffice))
                : allOffices;
            if (offices.length === 0) {
                setError(t('expenses.errors.branch_required'));
                return;
            }
            const categories = categoryRes.data?.data || [];
            const currencies = currencyRes.data?.data || [];
            const main = offices.find((office) => office.is_main) || offices[0];
            const agency = agencyRes.data?.data || {};
            const baseId = agency.base_currency_id;
            const currency = currencies.find((item) => Number(item.id) === Number(baseId))
                || currencies.find((item) => item.is_main_currency)
                || currencies[0];
            setReady({
                offices,
                categories,
                currencies,
                initial: {
                    name: '',
                    expense_category_id: '',
                    currency_id: currency ? String(currency.id) : '',
                    branch_id: String(main.id),
                    branch_name: main.name || '',
                    price: '',
                    date: today(),
                    note: '',
                },
            });
        }).catch((err) => {
            if (active) setError(expenseError(err, t));
        });
        return () => { active = false; };
    }, [lockedOffice, t]);

    const submit = async (payload, setFieldErrors) => {
        setSaving(true);
        setError('');
        try {
            await fetch.post('admin/expenses', payload);
            navigate('/admin/expenses/index');
        } catch (err) {
            const fields = err.response?.data?.error?.fields;
            if (fields) setFieldErrors(fields);
            else setError(expenseError(err, t));
        } finally {
            setSaving(false);
        }
    };

    if (!ready) {
        return (
            <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                {error || <CircularProgress size={28} />}
            </Box>
        );
    }

    return (
        <ExpenseForm
            title={t('expenses.create_title')}
            initial={ready.initial}
            offices={ready.offices}
            categories={ready.categories}
            currencies={ready.currencies}
            officeLocked={Boolean(lockedOffice)}
            notice={t('expenses.approval_hint')}
            saving={saving}
            error={error}
            onSubmit={submit}
            onCancel={() => navigate('/admin/expenses/index')}
        />
    );
}
