import { Focusable } from '@decky/ui';
import { useLayoutEffect, useRef, useState } from 'react';
import { takeSteamFocus } from '../../home/steamFocus';

/** One entry of a menu dropdown. `dot`: a CSS colour, or 'ring' for a hollow ring (Invisible). */
export interface PickerOption<T extends string | number> { id: T; label: string; sub?: string; dot?: string }

export interface MenuPickerViewProps<T extends string | number> {
    id: string; label?: string; text: string; dot?: string; options: PickerOption<T>[]; selected: T | null;
    open: boolean; onOpen(): void; onPick(id: T): void; onClose(): void;
}

type CancelEvent = { stopPropagation?(): void; preventDefault?(): void } | undefined;

/** Where focus goes when the list opens: the ticked entry, or the first. */
export function pickerFocusTarget(list: Element | null | undefined): HTMLElement | null {
    if (!list) return null;
    return list.querySelector<HTMLElement>('.gg-menu-picker-option[data-selected]') ?? list.querySelector<HTMLElement>('.gg-menu-picker-option');
}
/** DOM focus and Steam's gamepad focus together, as the rest of the menu moves focus. */
function focusOn(el: HTMLElement | null | undefined): void {
    if (!el) return;
    el.focus({ preventScroll: true });
    takeSteamFocus(el);
}

const Dot = ({ dot }: { dot?: string }) => dot ? <span className="gg-menu-picker-dot" data-dot={dot === 'ring' ? 'ring' : undefined} style={dot === 'ring' ? undefined : { background: dot }} aria-hidden="true" /> : null;
const Chevron = () => <svg className="gg-menu-picker-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** A glass pill that opens a short list under it, inside the menu panel (spec 2026-11-12-status-and-audio-pickers). Stateless. */
export function MenuPickerView<T extends string | number>({ id, label, text, dot, options, selected, open, onOpen, onPick, onClose }: MenuPickerViewProps<T>) {
    // B closes the list only: stopped here, it never reaches the menu, which would go back or close.
    const cancel = (event?: CancelEvent) => { event?.stopPropagation?.(); event?.preventDefault?.(); onClose(); };
    return (
        <div className="gg-menu-picker-host">
            <Focusable id={id} className="gg-menu-picker" onActivate={onOpen} onClick={onOpen} aria-haspopup="listbox" aria-expanded={open}>
                {label && <span className="gg-menu-picker-label">{label}</span>}
                <Dot dot={dot} />
                <span className="gg-menu-picker-text">{text}</span>
                <Chevron />
            </Focusable>
            {open && (
                <Focusable className="gg-menu-picker-list" role="listbox" flow-children="column" onCancel={cancel}>
                    {options.map((option) => (
                        <Focusable key={String(option.id)} className="gg-menu-picker-option" role="option" aria-selected={option.id === selected}
                            data-selected={option.id === selected ? '' : undefined} onActivate={() => onPick(option.id)} onClick={() => onPick(option.id)} onCancel={cancel}>
                            <Dot dot={option.dot} />
                            <span className="gg-menu-picker-option-text">{option.label}{option.sub && <span className="gg-menu-picker-sub">{option.sub}</span>}</span>
                        </Focusable>
                    ))}
                </Focusable>
            )}
        </div>
    );
}

/**
 * The dropdown with its open state. Opening moves focus into the list (the ticked entry); picking or B closes it and
 * puts focus back on the pill; focus leaving the picker closes it too. Opening only ever opens (a double A can't shut it).
 */
export function MenuPicker<T extends string | number>(props: Omit<MenuPickerViewProps<T>, 'open' | 'onOpen' | 'onClose'>) {
    const [open, setOpen] = useState(false);
    const host = useRef<HTMLDivElement | null>(null);
    const returnFocus = useRef(false);
    useLayoutEffect(() => {
        const root = host.current;
        if (open) focusOn(pickerFocusTarget(root?.querySelector('.gg-menu-picker-list')));
        else if (returnFocus.current) { returnFocus.current = false; focusOn(root?.querySelector<HTMLElement>('.gg-menu-picker')); }
    }, [open]);
    const close = () => { returnFocus.current = true; setOpen(false); };
    const blur = (event: { relatedTarget: EventTarget | null }) => {
        if (open && !host.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
    };
    return (
        <div ref={host} className="gg-menu-picker-anchor" onBlur={blur}>
            <MenuPickerView {...props} open={open} onOpen={() => setOpen(true)} onPick={(id) => { close(); props.onPick(id); }} onClose={close} />
        </div>
    );
}
