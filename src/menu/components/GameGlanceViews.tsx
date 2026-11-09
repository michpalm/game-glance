import { Focusable, NavEntryPositionPreferences } from '@decky/ui';
import type { IconType } from 'react-icons';
import { LuGamepad2, LuHouse, LuImage, LuMenu, LuPanelTop, LuSettings2 } from 'react-icons/lu';
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from '../../data/settingsCategories';
import { categoryView } from '../views';
import type { PageProps } from './gameGlanceTypes';
import { MenuAction } from './MenuAction';
import { Crumb } from './SettingRows';

const ICONS: Record<CategoryId, IconType> = { home: LuHouse, 'game-page': LuGamepad2, 'status-bar': LuPanelTop, menu: LuMenu, screensaver: LuImage, general: LuSettings2 };

/** Game Glance's first view: one card per category, with what it shows now. */
export function GameGlanceGrid({ v, a }: PageProps) {
    return <>
        <Crumb parent="Plugins" title="Game Glance" aside={<span>{v.version}</span>} />
        <Focusable className="gg-menu-grid gg-plugin-cards" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>
            {CATEGORY_IDS.map(id => {
                const Icon = ICONS[id];
                return <MenuAction key={id} id={`gg:card:${id}`} onAction={() => a.open(categoryView(id))}>
                    <span className="gg-plugin-card-name"><Icon aria-hidden="true" />{CATEGORY_LABELS[id]}</span>
                    <span className="gg-plugin-dim">{v.summaries[id]}</span>
                </MenuAction>;
            })}
        </Focusable>
    </>;
}
