import { callable } from '@decky/api';

export interface KvBackend {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    deletePrefix(prefix: string): Promise<number>;
}

const kvGet = callable<[key: string], unknown>('kv_get');
const kvSet = callable<[key: string, value: unknown], void>('kv_set');
const kvDelete = callable<[key: string], void>('kv_delete');
const kvDeletePrefix = callable<[prefix: string], number>('kv_delete_prefix');

export const backendKv: KvBackend = {
    get: (key) => kvGet(key),
    set: (key, value) => kvSet(key, value),
    delete: (key) => kvDelete(key),
    deletePrefix: (prefix) => kvDeletePrefix(prefix),
};

/** In-memory KvBackend for tests. */
export function memoryKv(): KvBackend {
    const map = new Map<string, unknown>();
    return {
        async get(key) {
            return map.has(key) ? map.get(key) : null;
        },
        async set(key, value) {
            map.set(key, value);
        },
        async delete(key) {
            map.delete(key);
        },
        async deletePrefix(prefix) {
            let removed = 0;
            for (const key of [...map.keys()]) {
                if (key.startsWith(prefix)) {
                    map.delete(key);
                    removed++;
                }
            }
            return removed;
        },
    };
}
