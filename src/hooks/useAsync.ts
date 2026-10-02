import { useEffect, useState } from 'react';

/** Runs `run` whenever `key` changes (a null key means "not yet"); ignores results that arrive after the key changed. */
export function useAsync<T>(key: string | null, run: () => Promise<T>): T | undefined {
    const [state, setState] = useState<{ key: string; value: T } | undefined>(undefined);
    useEffect(() => {
        if (key === null) return undefined;
        let active = true;
        run().then(
            (value) => {
                if (active) setState({ key, value });
            },
            () => undefined,
        );
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return key !== null && state?.key === key ? state.value : undefined;
}
