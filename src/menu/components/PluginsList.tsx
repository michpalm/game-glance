import { Focusable } from '@decky/ui';
import { LuArrowUpRight, LuChevronRight, LuPuzzle } from 'react-icons/lu';
import { PLUGIN_NAME } from '../../constants';
import type { DeckyPlugin } from '../steam/deckyPlugins';
import { pluginFocusKey } from '../views';
import { MenuAction } from './MenuAction';

/** The Plugins section: every loaded plugin; Game Glance opens here, the others in Decky. */
export function PluginsList({ plugins, openGameGlance, openOther, openDecky }: {
    plugins: DeckyPlugin[] | null; openGameGlance(): void; openOther(name: string): void; openDecky(): void;
}) {
    return <>
        <div className="gg-menu-heading"><h2>Plugins</h2><MenuAction id="plugins:native" onAction={openDecky}><LuArrowUpRight aria-hidden="true" />Open in Steam</MenuAction></div>
        {plugins === null ? <p className="gg-plugin-note">Plugins could not be listed.</p> :
            <Focusable className="gg-plugin-list" flow-children="column">{plugins.map(plugin => {
                const ours = plugin.name === PLUGIN_NAME;
                return <MenuAction key={plugin.name} id={pluginFocusKey(plugin.name)} className="gg-plugin-row" onAction={() => ours ? openGameGlance() : openOther(plugin.name)}>
                    <span className="gg-plugin-icon" aria-hidden="true">{plugin.icon ?? <LuPuzzle />}</span>
                    <span className="gg-plugin-name"><span>{plugin.name}</span><span className="gg-plugin-dim">{plugin.version}</span></span>
                    <span className="gg-plugin-end">{ours ? 'Settings' : 'Opens in Steam'}{ours ? <LuChevronRight aria-hidden="true" /> : <LuArrowUpRight aria-hidden="true" />}</span>
                </MenuAction>;
            })}</Focusable>}
    </>;
}
