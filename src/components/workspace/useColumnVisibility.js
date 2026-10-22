import { useState } from 'react';

function readHidden(storageKey, allowed) {
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((key) => typeof key === 'string' && allowed.includes(key));
    } catch {
        return [];
    }
}

export function useColumnVisibility(storageKey, keys) {
    const [hidden, setHidden] = useState(() => readHidden(storageKey, keys));

    const toggle = (key) => {
        if (!keys.includes(key)) return;
        setHidden((current) => {
            const next = current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key];
            localStorage.setItem(storageKey, JSON.stringify(next));
            return next;
        });
    };

    const reset = () => {
        localStorage.removeItem(storageKey);
        setHidden([]);
    };

    return { hidden, toggle, reset };
}
