import type { Stop } from '../model';

/** A retained wrapper becomes inert after cleanup, even when another plugin has wrapped it. */
export function ownMethod<T extends object, K extends keyof T>(target: T, key: K, decorate: (next: T[K]) => T[K]): Stop {
    const own = Object.getOwnPropertyDescriptor(target, key);
    let source: object | null = target;
    let descriptor = own;
    while (!descriptor && (source = Object.getPrototypeOf(source))) descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || typeof descriptor.value !== 'function' || descriptor.writable === false || own?.configurable === false) throw new Error(`Unpatchable menu method: ${String(key)}`);
    const original = descriptor.value as T[K];
    const decorated = decorate(original);
    let active = true;
    const wrapped = function(this: unknown, ...args: unknown[]) {
        return Reflect.apply((active ? decorated : original) as (...args: unknown[]) => unknown, this, args);
    };
    Object.defineProperty(target, key, { configurable: true, writable: true, enumerable: descriptor.enumerable ?? false, value: wrapped });
    return () => {
        active = false;
        if (Object.getOwnPropertyDescriptor(target, key)?.value !== wrapped) return;
        if (own) Object.defineProperty(target, key, own);
        else Reflect.deleteProperty(target, key);
    };
}
