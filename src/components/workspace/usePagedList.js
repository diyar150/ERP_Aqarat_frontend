import { useCallback, useEffect, useState } from 'react';

function sameFilters(a = {}, b = {}) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
        if ((a[key] ?? '') !== (b[key] ?? '')) return false;
    }
    return true;
}

export function usePagedList(fetchPage, initial = {}) {
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState(initial.q || '');
    const [filters, setFilters] = useState(initial.filters || {});
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState(25);
    const [payload, setPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    const reload = useCallback(() => setReloadKey((value) => value + 1), []);

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetchPage({ page, q: query, filters })
            .then((data) => {
                if (!active) return;
                const body = data || {};
                setPayload(body);
                setItems(body.items || []);
                setTotal(Number(body.total || 0));
                setLimit(Number(body.limit || 25));
                setError('');
            })
            .catch((err) => {
                if (!active) return;
                const message = err?.response?.data?.error?.message || err?.message || '';
                setError(message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [page, query, filters, reloadKey, fetchPage]);

    const setSearch = useCallback((value) => {
        setQuery((current) => {
            if (current === value) return current;
            setPage(1);
            return value;
        });
    }, []);

    const setFilter = useCallback((key, value) => {
        setFilters((current) => {
            if (current[key] === value) return current;
            setPage(1);
            return { ...current, [key]: value };
        });
    }, []);

    /** Replace search + filters (e.g. when URL search params change). No-op if unchanged. */
    const applyQuery = useCallback(({ q = '', filters: nextFilters = {} } = {}) => {
        setQuery((currentQ) => {
            setFilters((currentF) => {
                if (currentQ === q && sameFilters(currentF, nextFilters)) return currentF;
                setPage(1);
                return { ...nextFilters };
            });
            return currentQ === q ? currentQ : q;
        });
    }, []);

    return {
        page,
        setPage,
        query,
        setSearch,
        filters,
        setFilter,
        applyQuery,
        items,
        total,
        limit,
        payload,
        loading,
        error,
        setError,
        reload,
        reloadKey,
    };
}
