import { useEffect, useState } from 'react';

/** The value once it has stayed the same for `ms` (spec §5: the hero waits for the highlight to rest). */
export function useSettled<T>(value: T, ms = 150): T {
    const [settled, setSettled] = useState(value);
    useEffect(() => {
        if (Object.is(value, settled)) return undefined;
        const timer = setTimeout(() => setSettled(value), ms);
        return () => clearTimeout(timer);
    }, [value, ms]);
    return settled;
}
