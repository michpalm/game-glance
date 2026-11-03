import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import type { ReactElement } from 'react';
import { LuArrowUpRight, LuChevronRight, LuPlay } from 'react-icons/lu';
import { everyPageAvailable, homeRows, ROW_STYLE_LABELS, statusRows, type CategoryId } from '../../data/settingsCategories';
import { ROW_SORTS, rowSortLabel, sortByLabel, type RowSort } from '../../home/collections';
import { HERO_FIT_COPY, HERO_FITS, type HeroFit } from '../../home/heroFit';
import { PAGE_SHADING_COPY, PAGE_SHADINGS, type PageShading } from '../../home/pageShading';
import { ROW_STYLES, type RowStyle } from '../../home/recentsLayout';
import { HOME_ROW_VIEW } from '../views';
import type { PageProps } from './gameGlanceTypes';
import { MenuAction } from './MenuAction';
import { Crumb, SegmentRow, ToggleRow } from './SettingRows';

const rows = (children: ReactElement[] | ReactElement) => <Focusable className="gg-plugin-rows" flow-children="column">{children}</Focusable>;
const error = (text: string) => text ? <p className="gg-menu-error" role="alert">{text}</p> : null;

export function HomePage({ v, a }: PageProps) {
    const s = v.settings;
    const shown = homeRows(s, v.collectionRow);
    const has = (row: (typeof shown)[number]) => shown.includes(row);
    return <>
        <Crumb parent="Game Glance" title="Home" />
        {rows(<>
            <ToggleRow id="gg:home:spotlightHome" label="Spotlight Home" description="Replaces Steam's Home screen. Off returns Steam's own Home."
                checked={s.spotlightHome} onChange={value => a.run(a.store.setSpotlightHome(value))} />
            {has('gamesRow') && <h3>Games row</h3>}
            {has('gamesRow') && <MenuAction id="gg:home:games" className="gg-plugin-picker" onAction={() => a.open(HOME_ROW_VIEW)}>
                <span>Games</span><span className="gg-plugin-value">{v.rowName}<LuChevronRight aria-hidden="true" /></span>
            </MenuAction>}
            {has('rowSort') && <SegmentRow<RowSort> id="gg:home:sort" label={sortByLabel()} options={ROW_SORTS}
                labels={Object.fromEntries(ROW_SORTS.map(sort => [sort, rowSortLabel(sort)])) as Record<RowSort, string>}
                value={s.homeRowSort} onSelect={value => a.run(a.store.setHomeRowSort(value))} />}
            {has('rowStyle') && <SegmentRow<RowStyle> id="gg:home:rowStyle" label="Style" options={ROW_STYLES} labels={ROW_STYLE_LABELS}
                description="Steam: the first game stays wide. Spotlight: the selected game stays wide at the left. Minimal: all cards stay small."
                value={s.homeRowStyle} onSelect={value => a.run(a.store.setHomeRowStyle(value))} />}
            {has('grayUninstalled') && <ToggleRow id="gg:home:grayUninstalled" label="Gray out uninstalled games"
                description="Shows uninstalled Steam games in gray until selected." checked={s.homeGrayUninstalled}
                onChange={value => a.run(a.store.setHomeGrayUninstalled(value))} />}
            {has('news') && <h3>Feed</h3>}
            {has('news') && <ToggleRow id="gg:home:news" label="What's new" description="News and events from your games, and recently updated games."
                checked={s.feedTabs.news} onChange={value => a.run(a.store.setFeedTab('news', value))} />}
            {has('friends') && <ToggleRow id="gg:home:friends" label="Friends" description="What your friends are playing, and what is trending among them."
                checked={s.feedTabs.friends} onChange={value => a.run(a.store.setFeedTab('friends', value))} />}
            {has('recommended') && <ToggleRow id="gg:home:recommended" label="Recommended" description="Games from your library to play next."
                checked={s.feedTabs.recommended} onChange={value => a.run(a.store.setFeedTab('recommended', value))} />}
            {has('wishlistDeals') && <ToggleRow id="gg:home:wishlistDeals" label="Show wishlist deals"
                description="Sends your Steam ID to Steam's public store to find games on sale from your wishlist. Off by default."
                checked={s.wishlistDeals} onChange={value => a.run(a.store.setWishlistDeals(value))} />}
        </>)}
        {error(v.error)}
    </>;
}

export function HomeRowPicker({ v, a }: PageProps) {
    return <>
        <Crumb parent="Home" title="Games row" />
        <Focusable className="gg-plugin-list" flow-children="column">{v.rowChoices.map(choice =>
            <MenuAction key={choice.id} id={`gg:home:row:${choice.id}`} className="gg-plugin-picker" selected={choice.id === v.rowChosen}
                onAction={() => { a.run(a.store.setHomeRow(choice.id)); a.back(); }}>{choice.label}</MenuAction>)}
        </Focusable>
    </>;
}

export function GamePage({ v, a }: PageProps) {
    const game = v.game;
    return <>
        <Crumb parent="Game Glance" title="Game page" />
        {rows(<>
            <SegmentRow<'full' | 'clean'> id="gg:game-page:look" label="Look" options={['full', 'clean']} labels={{ full: 'Full', clean: 'Clean' }}
                description="Full: description and HowLongToBeat cards. Clean: one row at the bottom over the full art."
                value={v.settings.cleanPage ? 'clean' : 'full'} onSelect={value => a.run(a.store.setCleanPage(value === 'clean'))} />
            <h3>HowLongToBeat match</h3>
            {game ? <div className="gg-plugin-card">
                <div className="gg-plugin-card-title"><span>{game.name}</span><span className="gg-plugin-dim">{game.match}</span></div>
                <Focusable className="gg-plugin-buttons" flow-children="row">
                    <MenuAction id="gg:game-page:change" onAction={a.changeMatch}>Change match</MenuAction>
                    {game.matched && <MenuAction id="gg:game-page:open" onAction={a.openHltb}><LuArrowUpRight aria-hidden="true" />Open on HowLongToBeat</MenuAction>}
                    {game.override && <MenuAction id="gg:game-page:remove" onAction={a.removeOverride}>Remove override</MenuAction>}
                </Focusable>
            </div> : <p className="gg-plugin-note">Open a game page first.</p>}
        </>)}
        {error(v.error)}
    </>;
}

export function StatusBarPage({ v, a }: PageProps) {
    const s = v.settings;
    const shown = statusRows(s);
    return <>
        <Crumb parent="Game Glance" title="Status bar & footer" />
        {shown.length === 0 ? <p className="gg-plugin-note">Turn on Spotlight Home to use the status bar and footer.</p> : rows(<>
            <ToggleRow id="gg:status-bar:statusBar" label="Status bar" description="Clock, battery and connection at the top-right of Home."
                checked={s.homeStatusBar} onChange={value => a.run(a.store.setHomeStatusBar(value))} />
            {shown.includes('statusAvatar') && <ToggleRow id="gg:status-bar:statusAvatar" label="Profile picture"
                description="Your avatar, ringed in your online colour, instead of the dot." checked={s.statusAvatar}
                onChange={value => a.run(a.store.setStatusAvatar(value))} />}
            {shown.includes('expandedControls') && <h3>Controls</h3>}
            {shown.includes('expandedControls') && <ToggleRow id="gg:status-bar:expandedControls" label="Expanded Home controls"
                description="Matching controller prompts and individually selectable status items." checked={s.homeExpandedControls}
                onChange={value => a.run(a.store.setHomeExpandedControls(value))} />}
            {shown.includes('everyPage') && <ToggleRow id="gg:status-bar:everyPage" label="On every page"
                description="The status bar and footer on every Steam page, not only Home." checked={s.chromeEveryPage}
                disabled={!everyPageAvailable(s)} onChange={value => a.run(a.store.setChromeEveryPage(value))} />}
        </>)}
        {error(v.error)}
    </>;
}

export function MenuPage({ v, a }: PageProps) {
    return <>
        <Crumb parent="Game Glance" title="Menu" />
        {rows(<>
            <ToggleRow id="gg:menu:enabled" label="Game Glance menu" description="Replaces the Home and quick access menus. Off closes this menu and returns Steam's own."
                checked={v.menuEnabled} disabled={!v.menuReady} onChange={value => a.run(a.setMenuEnabled(value))} />
            <h3>Social</h3>
            <SegmentRow<'compact' | 'radial'> id="gg:menu:keyboard" label="Keyboard" description="The keyboard for the message field."
                options={['compact', 'radial']} labels={{ compact: 'Compact', radial: 'Radial' }} value={v.socialKeyboard}
                onSelect={value => a.run(a.setSocialKeyboard(value))} />
        </>)}
        {error(v.error)}
    </>;
}

export function ScreensaverPage({ v, a }: PageProps) {
    const saver = v.settings.screensaver;
    const preview = saver.enabled && v.screensaverAvailable
        ? <MenuAction id="gg:screensaver:preview" onAction={a.preview}><LuPlay aria-hidden="true" />Preview</MenuAction> : undefined;
    return <>
        <Crumb parent="Game Glance" title="Screensaver" aside={preview} />
        {!v.screensaverAvailable ? <p className="gg-plugin-note">Needs a newer Steam client, one with the screensaver (Settings → Customization → Screensaver).</p> : rows(<>
            <ToggleRow id="gg:screensaver:enabled" label="Game Glance screensaver"
                description="Steam's Game Slideshow with the games of your Games row and their custom art. Off returns Steam's own."
                checked={saver.enabled} onChange={value => a.run(a.store.setScreensaver({ enabled: value }))} />
            {saver.enabled && <h3>Show over the art</h3>}
            {saver.enabled && <Focusable className="gg-plugin-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
                <ToggleRow id="gg:screensaver:logo" label="Logo" checked={saver.logo} onChange={value => a.run(a.store.setScreensaver({ logo: value }))} />
                <ToggleRow id="gg:screensaver:statusBar" label="Status bar" checked={saver.statusBar} onChange={value => a.run(a.store.setScreensaver({ statusBar: value }))} />
                <ToggleRow id="gg:screensaver:stats" label="Stats" checked={saver.stats} onChange={value => a.run(a.store.setScreensaver({ stats: value }))} />
            </Focusable>}
            {saver.enabled && <p className="gg-plugin-note">Logo at the bottom-left, status bar at the top-right, and a stats card with play time, HowLongToBeat and achievements. Turn all three off for only the art.</p>}
        </>)}
        {error(v.error)}
    </>;
}

export function GeneralPage({ v, a }: PageProps) {
    const s = v.settings;
    const f = v.fetching;
    return <>
        <Crumb parent="Game Glance" title="General" />
        {rows(<>
            <ToggleRow id="gg:general:enabled" label="Game Glance" description="Off turns Game Glance off everywhere: game page, Home, menu and screensaver."
                checked={s.enabled} onChange={value => a.run(a.store.setEnabled(value))} />
            <h3>Look on Home and the game page</h3>
            <ToggleRow id="gg:general:gameLogo" label="Game logo" description="The game's logo instead of its name. A game without one keeps its name."
                checked={s.gameLogo} onChange={value => a.run(a.store.setGameLogo(value))} />
            <SegmentRow<HeroFit> id="gg:general:heroFit" label="Hero art" description={HERO_FIT_COPY[s.heroFit]} options={HERO_FITS}
                labels={{ fill: 'Fill', fit: 'Fit' }} value={s.heroFit} onSelect={value => a.run(a.store.setHeroFit(value))} />
            <SegmentRow<PageShading> id="gg:general:pageShading" label="Page shading" description={PAGE_SHADING_COPY[s.pageShading].description}
                options={PAGE_SHADINGS} labels={{ bottom: PAGE_SHADING_COPY.bottom.label, none: PAGE_SHADING_COPY.none.label }}
                value={s.pageShading} onSelect={value => a.run(a.store.setPageShading(value))} />
            <h3>Data</h3>
            <ToggleRow id="gg:general:autoPreload" label="Pre-load new games automatically" description="Checks for new installs every 30 minutes and fetches their game info."
                checked={s.autoPreload} onChange={value => a.run(a.store.setAutoPreload(value))} />
            <p className="gg-plugin-note">{f.running ? `${f.found} found so far. You can close this menu.` : 'Fills in times and descriptions for every installed game, about one per second.'}</p>
            <Focusable className="gg-plugin-buttons" flow-children="row">
                <MenuAction id="gg:general:preload" onAction={a.togglePreload}>{f.running ? `Stop (${f.done} / ${f.total || '…'})` : 'Pre-load installed games'}</MenuAction>
                <MenuAction id="gg:general:clearCache" onAction={a.clearCache}>Clear cached data</MenuAction>
            </Focusable>
            <h3>Updates</h3>
            <p className="gg-plugin-note">{v.update.line}</p>
            <Focusable className="gg-plugin-buttons" flow-children="row">
                {v.update.available && <MenuAction id="gg:general:update" disabled={v.update.installing} onAction={a.installUpdate}>{`Update to ${v.update.available}`}</MenuAction>}
                <MenuAction id="gg:general:check" disabled={v.update.checking} onAction={a.checkUpdate}>Check for updates</MenuAction>
                <MenuAction id="gg:general:versions" onAction={a.chooseVersion}>Choose version</MenuAction>
            </Focusable>
        </>)}
        {error(v.error)}
    </>;
}

export const CATEGORY_PAGES: Record<CategoryId, (props: PageProps) => ReactElement> = {
    home: HomePage, 'game-page': GamePage, 'status-bar': StatusBarPage, menu: MenuPage, screensaver: ScreensaverPage, general: GeneralPage,
};
