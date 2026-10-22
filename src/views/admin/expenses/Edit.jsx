import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import fetch from '@/utils/fetch';
import { useAuthStore } from '@/store/authStore';
import { groupPriceInput } from '@/utils/money.js';
import ExpenseForm from './ExpenseForm.jsx';
import { expenseError } from './expenseForm.js';

export default function Edit() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const lockedOffice = useAuthStore((state) => state.user?.branch_id);
    const [ready, setReady] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        Promise.all([
            fetch.get(`admin/expenses/${id}`),
            fetch.get('branches/options'),
            fetch.get('admin/expense-categories/all'),
            fetch.get('admin/currencies?limit=1000'),
        ]).then(([expenseRes, branchRes, categoryRes, currencyRes]) => {
            if (!active) return;
            const expense = expenseRes.data?.data;
            if (!expense) {
                navigate('/admin/expenses/index');
                return;
            }
            const allOffices = branchRes.data?.data?.branches || [];
            let offices = lockedOffice
                ? allOffices.filter((office) => String(office.id) === String(lockedOffice))
                : allOffices;
            if (
                expense.branch_id
                && !offices.some((office) => String(office.id) === String(expense.branch_id))
            ) {
                offices = [
                    ...offices,
                    { id: expense.branch_id, name: expense.branch_name || String(expense.branch_id) },
                ];
            }
            setReady({
                closed: Boolean(expense.books_closed),
                offices,
                categories: categoryRes.data?.data || [],
                currencies: currencyRes.data?.data || [],
                initial: {
                    name: expense.name || '',
                    expense_category_id: expense.expense_category_id ? String(expense.expense_category_id) : '',
                    currency_id: expense.currency_id ? String(expense.currency_id) : '',
                    branch_id: expense.branch_id ? String(expense.branch_id) : (offices[0] ? String(offices[0].id) : ''),
                    branch_name: expense.branch_name || '',
                    price: groupPriceInput(expense.price),
                    date: expense.date || '',
                    note: expense.note || '',
                    reason: '',
                    approval_status: expense.approval_status || 'pending',
                },
            });
        }).catch((err) => {
            if (!active) return;
            if (err.response?.status === 404) navigate('/admin/expenses/index');
            else setError(expenseError(err, t));
        });
        return () => { active = false; };
    }, [id, lockedOffice, navigate, t]);

    const submit = async (payload, setFieldErrors) => {
        setSaving(true);
        setError('');
        try {
            await fetch.put(`admin/expenses/${id}`, payload);
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

    if (ready.closed) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Alert severity="info" sx={{ mb: 2 }}>{t('expenses.month_closed')}</Alert>
                <Button onClick={() => navigate(`/admin/expenses/${id}/show`)}>{t('common.back')}</Button>
            </Box>
        );
    }

    return (
        <ExpenseForm
            title={t('expenses.edit_title')}
            initial={ready.initial}
            offices={ready.offices}
            categories={ready.categories}
            currencies={ready.currencies}
            saving={saving}
            error={error}
            askReason={ready.initial.approval_status === 'approved'}
            notice={ready.initial.approval_status === 'approved' ? '' : t('expenses.approval_hint')}
            officeLocked={Boolean(lockedOffice)}
            currencyLocked
            onSubmit={submit}
            onCancel={() => navigate(`/admin/expenses/${id}/show`)}
        />
    );
}
