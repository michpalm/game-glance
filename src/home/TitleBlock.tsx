import { RefObject, useLayoutEffect, useRef } from 'react';
import { GameTitle } from '../components/GameTitle';
import { fitTitleSize, TITLE_ONE_LINE_SIZES } from './giveWay';
import type { Chip } from './chips';

function ChipView({ chip }: { chip: Chip }) {
    const progress = chip.progress;
    return (
        <div className="gh-chip" data-chip={chip.key}>
            <div className="gh-chip-label">{chip.label}</div>
            {/* data-text: the open transition can draw an accent copy of the words over them (homeCss.openingRules) */}
            <div className="gh-chip-value" data-text={chip.value}>{chip.value}</div>
            {progress !== undefined && Number.isFinite(progress) && (
                <div className="gh-chip-bar">
                    <div className="gh-chip-fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
                </div>
            )}
        </div>
    );
}

/**
 * Title, eyebrow (accent) and stat chips. The parent `.gh-title-block` column also holds the actions. The title sits at the bottom
 * of a two-line slot and the chip row is always there at a fixed height, so a longer title only grows upward and
 * the eyebrow, chips and actions never move when the game changes (homeCss.titleBlockLayout). With the logo option the
 * game's logo takes the title's place, bottom-aligned in the same slot (GameTitle; `appId` 0, the library tile, keeps its text).
 */
const px = (n: number) => `${n}px`;

/** The title's padding on each side (homeCss TITLE_BLOCK.titleBleed), outside the lines it measures. */
const TITLE_BLEED = 16;

/**
 * With the title slot down to one line (`oneLine`, home/giveWay step 2), a text title takes the largest size at which it
 * fits the slot (giveWay.fitTitleSize), measured in place; back to the stylesheet's size otherwise.
 */
function useOneLineTitle(slot: RefObject<HTMLDivElement | null>, oneLine: boolean, key: string) {
    useLayoutEffect(() => {
        const box = slot.current;
        if (!box) return undefined;
        const fit = () => {
            const el = box.querySelector<HTMLElement>('.gh-title');
            if (!el) return;
            el.style.removeProperty('font-size');
            el.style.removeProperty('-webkit-line-clamp');
            if (!oneLine) return;
            const lineSlot = TITLE_ONE_LINE_SIZES[0];
            const fits = (size: number) => {
                el.style.setProperty('font-size', `${size}px`, 'important');
                return el.clientHeight - 2 * TITLE_BLEED <= lineSlot + 0.5;
            };
            const size = fitTitleSize(fits);
            el.style.setProperty('font-size', `${size}px`, 'important');
            el.style.setProperty('-webkit-line-clamp', String(Math.max(1, Math.floor(lineSlot / size))), 'important');
        };
        fit();
        // The text title can arrive after this effect (GameTitle shows it once a logo turns out missing) and the font can
        // load late: fit again then. The fit itself only changes the title's style, which this does not watch.
        const View = box.ownerDocument?.defaultView as (Window & { MutationObserver?: typeof MutationObserver }) | null;
        const observer = View?.MutationObserver ? new View.MutationObserver(fit) : null;
        observer?.observe(box, { childList: true, subtree: true, characterData: true });
        let live = true;
        box.ownerDocument?.fonts?.ready?.then(() => live && fit()).catch(() => undefined);
        return () => {
            live = false;
            observer?.disconnect();
        };
    }, [oneLine, key]);
}

export function TitleBlock({ eyebrow, title, chips, appId = 0, logo = false, version = 0, resolve = true, oneLine = false }: { eyebrow: string; title: string; chips: Chip[]; appId?: number; logo?: boolean; version?: number; resolve?: boolean; oneLine?: boolean }) {
    const slot = useRef<HTMLDivElement>(null);
    useOneLineTitle(slot, oneLine, `${appId}:${title}:${logo}:${version}`);
    return (
        <>
            <div className="gh-title-slot" ref={slot}>
                <GameTitle appId={appId} name={title} logo={logo} className="gh-title" logoClassName="gh-logo" unit={px} version={version} resolve={resolve} />
            </div>
            <div className="gh-eyebrow">{eyebrow}</div>
            <div className="gh-chips">
                {chips.map((chip) => (
                    <ChipView key={chip.key} chip={chip} />
                ))}
            </div>
        </>
    );
}
