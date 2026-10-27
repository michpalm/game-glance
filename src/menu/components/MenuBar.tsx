import { Focusable } from '@decky/ui';
import { LuCompass, LuSlidersHorizontal, LuUsers, LuPuzzle, LuCircleHelp, LuMusic, LuGamepad2, LuEllipsis } from 'react-icons/lu';
import { selectedBarSection, visibleSections, type MenuEvent, type MenuState, type SectionId } from '../model';
import { MenuAction } from './MenuAction';
import { steamPerformanceIcon } from '../steam/performanceIcons';
export const SECTION_LABELS: Record<SectionId, string> = { navigate: 'Navigate', 'quick-settings': 'Quick settings', performance: 'Performance', social: 'Social', plugins: 'Plugins', help: 'Help', soundtrack: 'Soundtrack', 'in-game': 'In game', more: 'More' };
const ICONS = { navigate: LuCompass, 'quick-settings': LuSlidersHorizontal, performance: () => { const Icon = steamPerformanceIcon('performance'); return Icon ? <span aria-hidden="true" className="gg-menu-native-icon"><Icon/></span> : null; }, social: LuUsers, plugins: LuPuzzle, help: LuCircleHelp, soundtrack: LuMusic, 'in-game': LuGamepad2, more: LuEllipsis };
export function MenuBar({ state, dispatch }: { state: MenuState; dispatch(event: MenuEvent): void }) {
    const active = selectedBarSection(state);
    return <Focusable className="gg-menu-bar" data-gg-frost-region="bar" flow-children="row" aria-label="Menu sections">
        <span className="gg-menu-shoulder" aria-hidden="true">‹ L1</span>
        <div className="gg-menu-tabs">{visibleSections(state).map(section => {
            const Icon = ICONS[section];
            return <MenuAction key={section} id={`section:${section}`} selected={active === section} className="gg-menu-tab" ariaLabel={section === 'more' ? 'More' : undefined} onAction={() => dispatch({ type: 'select', section })}><Icon aria-hidden="true" />{section !== 'more' && <span>{SECTION_LABELS[section]}</span>}</MenuAction>;
        })}</div>
        <span className="gg-menu-shoulder" aria-hidden="true">R1 ›</span>
    </Focusable>;
}
