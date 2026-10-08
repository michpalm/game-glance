// Mock implementation of @decky/api for local browser preview

export function callable(methodName: string) {
    return async (...args: any[]) => {
        console.log(`[Decky API Call] ${methodName}`, args);
        if (methodName === 'get_store') {
            return { store: 'steam' };
        }
        if (methodName === 'kv_get') {
            return null;
        }
        if (methodName === 'get_version') {
            return '2.1.0';
        }
        return null;
    };
}

export async function fetchNoCors(url: string, options?: any) {
    console.log('[Decky fetchNoCors]', url);
    return fetch(url, options);
}

export const routerHook = {
    addPatch: () => () => {},
    removePatch: () => {},
};

export const toaster = {
    toast: (opts: any) => {
        console.log('[Toaster]', opts);
        alert(typeof opts === 'string' ? opts : (opts?.title ?? 'Notification'));
    },
};

export function definePlugin(fn: any) {
    return fn;
}
