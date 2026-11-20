import { cloneElement, createElement, isValidElement, useEffect, useRef, useState, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { resolveArt } from '../home/HeroBackground';
import { peekSteamLanguage } from '../data/steam';
import { steamLanguageToLocale } from '../logic/format';
import { tr } from '../i18n/steamText';
import { cardModel } from './cardModel';
import type { GameMenuModel } from './reshape';
import { pageGroupFocus, rootChildren, rowClassName, viewRows, type Page, type Row } from './viewRows';
import { CHEVRON_LEFT, CHEVRON_RIGHT, Icon } from './icons';
import { Focusable } from '@decky/ui';
import { backOnCancel, holdAtPageEdge } from './pageCancel';
import { expandDeveloper } from './developerPage';

type Props = { model: GameMenuModel; instance?: unknown; overview?: unknown };

/** Game Glance's game menu (spec B), drawn in Steam's own MenuRoot with Steam's own MenuItems; every action is Steam's. */
export function GameMenuView({ model, overview }: Props) {
    const [page, setPage] = useState<Page>('main');
    const [opener, setOpener] = useState<string | null>(null);
    const pageRef = useRef<HTMLDivElement>(null);
    const card = cardModel(overview as Parameters<typeof cardModel>[0], Date.now() / 1000, steamLanguageToLocale(peekSteamLanguage() ?? 'english'));
    const appId = card?.appId ?? 0;
    const [art, setArt] = useState<string | null>(null);
    useEffect(() => {
        let live = true;
        setArt(null);
        if (appId > 0) resolveArt(appId).then((a) => { if (live && a.mode !== 'none') setArt(a.url); }, () => {});
        return () => { live = false; };
    }, [appId]);
    // Steam's Developer items, read in this render (its hooks run here, every render, in the same place).
    const dev = expandDeveloper(model.developer);
    const Root = model.types.tz as ComponentType<Record<string, unknown>>, Kt = model.types.kt as ComponentType<Record<string, unknown>>, Sep = model.types.K5 as ComponentType | null;
    const name = card?.name || model.name;
    const pageTitle = page === 'collections' ? tr('collections') : page === 'manage' ? model.manage?.label : page === 'developer' ? dev?.label : null;
    const header = page === 'main'
        ? <div className="gg-gm gg-gm-hero" key="head">
            {art && <div className="gg-gm-art" style={{ backgroundImage: `url("${art}")` }}/>}
            <div className="gg-gm-hero-text"><div className="gg-gm-eyebrow">{card?.eyebrow}</div><div className="gg-gm-name">{name}</div></div>
        </div>
        : <div className="gg-gm gg-gm-pagehead" key="head">{CHEVRON_LEFT}<div><div className="gg-gm-eyebrow">{name}</div><div className="gg-gm-title">{pageTitle}</div></div></div>;
    const open = (row: Row) => { setOpener(row.key); setPage(row.page!); };
    const back = () => setPage('main');
    const draw = (r: Row, first: boolean): ReactNode => {
        // Not focusable, no action: SteamGridDB's own row replaces it a frame later (menuCss hides it then).
        if (r.kind === 'slot') return <div key={r.key} className="contextMenuItem gg-gm-sgdb-slot" aria-hidden="true">{r.label}</div>;
        if (r.kind === 'separator') return Sep ? createElement(Sep, { key: r.key }) : <div key={r.key} className="gg-gm-sep"/>;
        if (r.kind === 'check') {
            const favorite = r.key === 'favorite';
            const box = <span className={`gg-gm-chk${r.on ? ' on' : ''}`}/>;
            return <Kt key={r.key} className="gg-gm-row" bInteractableItem disabled={Boolean(r.run?.props.disabled)} preferredFocus={first && page !== 'main'}
                onClick={(e: unknown) => r.run?.props.onSelected?.(e)}>
                {favorite ? <><Icon name="star"/><span className="gg-gm-label">{tr('favorites')}</span><span className="gg-gm-end">{box}</span></>
                    : <>{box}<span className="gg-gm-label">{r.label}</span></>}
            </Kt>;
        }
        if (r.kind === 'page') return <Kt key={r.key} className="gg-gm-row" bInteractableItem preferredFocus={page === 'main' && opener === r.key} onClick={() => open(r)}>
            {r.icon && <Icon name={r.icon}/>}<span className="gg-gm-label">{r.label ?? tr('collections')}</span><span className="gg-gm-end">{r.end}{CHEVRON_RIGHT}</span>
        </Kt>;
        // Steam's own item: our icon in front where we know it; Steam's action and closing as Steam does them.
        const el = r.element;
        if (isValidElement(el) && el.type === Kt) {
            const item = el as ReactElement<{ className?: string; children?: ReactNode; preferredFocus?: boolean }>;
            return cloneElement(item, { key: r.key, className: `${item.props.className ?? ''} ${rowClassName(r)}`, preferredFocus: first && page !== 'main' ? true : item.props.preferredFocus },
                <>{r.icon && <Icon name={r.icon}/>}<span className="gg-gm-label">{item.props.children}</span></>);
        }
        return <div key={r.key} className={r.icon ? 'gg-gm-lead' : 'gg-gm-steam'}>{r.icon && <Icon name={r.icon}/>}{el}</div>;
    };
    const rows = viewRows(model, page, dev);
    const firstIndex = rows.findIndex((r) => r.kind !== 'separator');
    const drawn = rows.map((r, i) => draw(r, i === firstIndex));
    // On a page, B goes back: our own focus group catches it before Steam's MenuRoot (which would close the menu).
    const body = page === 'main' ? drawn
        : [<Focusable key={`page-${page}`} ref={pageRef} className="gg-gm-page" flow-children="column" {...pageGroupFocus()} onCancel={backOnCancel(back)} {...steamMoves(() => holdAtPageEdge(pageRef.current, 'first'), () => holdAtPageEdge(pageRef.current, 'last'))}>{drawn}</Focusable>];
    return <Root label={null}>{rootChildren(page, header, body)}</Root>;
}

/** Steam's Panel takes onMoveUp / onMoveDown (its MenuRoot uses onMoveLeft the same way); Decky's FocusableProps does not list them. */
const steamMoves = (onMoveUp: () => boolean, onMoveDown: () => boolean) => ({ onMoveUp, onMoveDown }) as object;
