type Stop = () => void;

/** The artwork accent Home is actually displaying, including its held color during fast navigation. */
export function createShownAccent() {
    let current: string | undefined;
    const listeners = new Set<Stop>();
    return {
        get: (): string | undefined => current,
        set(color: string | undefined): void {
            if (color === current) return;
            current = color; listeners.forEach(listener => listener());
        },
        subscribe(listener: Stop): Stop { listeners.add(listener); return () => { listeners.delete(listener); }; },
    };
}
export const shownAccent = createShownAccent();
