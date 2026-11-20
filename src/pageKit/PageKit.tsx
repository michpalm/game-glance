import { DialogButton, Focusable } from '@decky/ui';
import type { ComponentType, ReactNode } from 'react';
import { playNavSound } from '../home/navSound';
import { pageKitStyles } from './pageKitStyles';

type AnyComponent = ComponentType<Record<string, unknown>>;
const Button = DialogButton as unknown as AnyComponent;
const Area = Focusable as unknown as AnyComponent;
export interface PadEvent { detail?: { button?: number }; preventDefault?(): void; stopPropagation?(): void }

export interface PageFrameProps {
    className: string;
    title: string;
    backdrop?: ReactNode;
    onBack(): void;
    onOptions?(): void;
    optionsLabel?: string;
    /** Gamepad presses anywhere on the page (e.g. the tabs' L1/R1, from shoulderHandler). */
    onButtonDown?(evt: PadEvent): void;
    children: ReactNode;
}

/** A Game Glance page: the kit's root, its styles, the backdrop, the title; B goes back, Y opens Options when given (as Storage and Downloads). */
export function PageFrame({ className, title, backdrop, onBack, onOptions, optionsLabel = 'Options', onButtonDown, children }: PageFrameProps) {
    const options = onOptions ? { onOptionsButton: onOptions, onOptionsActionDescription: optionsLabel } : {};
    return <Area className={`gg-pk ${className}`.trim()} onCancelButton={onBack} onCancelActionDescription="Back" onButtonDown={onButtonDown} {...options}>
        <style>{pageKitStyles}</style>
        {backdrop}
        <h1 className="gg-pk-title">{title}</h1>
        {children}
    </Area>;
}

export interface KitTab { key: string; label: string; count: number | null }

/** The tab L1 (button 5) or R1 (6) moves to, wrapping round at the ends (Michael, PS5 check 2026-11-19); null for any other button. */
export function shoulderTab(keys: string[], active: string, button: number): string | null {
    const step = button === 5 ? -1 : button === 6 ? 1 : 0;
    if (step === 0 || keys.length === 0) return null;
    const at = Math.max(0, keys.indexOf(active));
    return keys[(at + step + keys.length) % keys.length];
}

/**
 * L1/R1 for a page's tabs. Steam sends a press up from the focused element, so a page puts this on its root (PageFrame's
 * onButtonDown): the shoulders then switch tabs from a focused cover as well as from the tabs row.
 */
export function shoulderHandler(keys: string[], active: string, onChange: (key: string) => void) {
    return (evt: PadEvent) => {
        const next = shoulderTab(keys, active, Number(evt?.detail?.button));
        if (next === null) return;
        evt.preventDefault?.();
        evt.stopPropagation?.();
        if (next !== active) {
            playNavSound('ChangeTabs');
            onChange(next);
        }
    };
}

const EDGE = 24;
/** Keeps the active tab inside the row (sideways only: scrollIntoView could also move the page). Run on every render via a fresh ref callback: a stable one runs only on mount. */
export function keepActiveTabInView(list: { scrollLeft: number; clientWidth: number; querySelector(sel: string): unknown } | null) {
    const tab = list?.querySelector('[aria-selected="true"]') as { offsetLeft: number; offsetWidth: number } | null | undefined;
    if (!list || !tab) return;
    if (tab.offsetLeft < list.scrollLeft + EDGE) list.scrollLeft = Math.max(0, tab.offsetLeft - EDGE);
    else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth - EDGE) list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth + EDGE;
}

/** A row of tabs between L1 and R1 glyphs, scrolling sideways when they don't fit; the shoulders move one tab. */
export function Tabs({ tabs, active, onChange }: { tabs: KitTab[]; active: string; onChange(key: string): void }) {
    const onButtonDown = shoulderHandler(tabs.map(t => t.key), active, onChange);
    return <Area className="gg-pk-tabs" flow-children="row" onButtonDown={onButtonDown}>
        <span className="gg-pk-bumper" aria-hidden="true">L1</span>
        <div className="gg-pk-tabs-list" ref={(el: HTMLDivElement | null) => keepActiveTabInView(el)}>
            {tabs.map(t => <Button key={t.key} className="gg-pk-tab" aria-selected={t.key === active} data-gg-focus={`tab:${t.key}`}
                onClick={() => onChange(t.key)}>{t.count === null ? t.label : `${t.label} · ${t.count}`}</Button>)}
        </div>
        <span className="gg-pk-bumper" aria-hidden="true">R1</span>
    </Area>;
}

export function Bar({ ratio, tone = 'accent' }: { ratio: number; tone?: 'accent' | 'ok' }) {
    const r = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
    return <span className={tone === 'ok' ? 'gg-pk-bar gg-pk-bar-ok' : 'gg-pk-bar'}><span className="gg-pk-bar-fill" style={{ width: `${Math.round(r * 1000) / 10}%` }} /></span>;
}

export const Pill = ({ children }: { children: ReactNode }) => <span className="gg-pk-pill">{children}</span>;
export const Eyebrow = ({ children }: { children: ReactNode }) => <p className="gg-pk-eyebrow">{children}</p>;
export const Fact = ({ label, value }: { label: string; value: string }) =>
    <span className="gg-pk-fact"><span className="gg-pk-fact-label">{label}</span><span className="gg-pk-fact-value">{value}</span></span>;
