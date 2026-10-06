import { useEffect, useState } from 'react';

/**
 * `value` once it has stayed the same for `ms`: the first value at once, later ones only after they rest. Lets work
 * that only matters for where the user stops (a lookup, a colour sample) skip everything passed on the way.
 */
export function useSettled<T>(value: T, ms: number): T {
    const [settled, setSettled] = useState(value);
    useEffect(() => {
        if (Object.is(value, settled)) return undefined;
        const timer = setTimeout(() => setSettled(value), ms);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, ms]);
    return settled;
}
