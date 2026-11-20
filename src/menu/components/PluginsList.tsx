import { Focusable } from '@decky/ui';
import { LuArrowUpRight, LuPuzzle } from 'react-icons/lu';
import { PLUGIN_NAME } from '../../constants';
import type { DeckyPlugin } from '../steam/deckyPlugins';
import { pluginFocusKey } from '../views';
import { MenuAction } from './MenuAction';

/** The Plugins section: every other loaded plugin, each opening in Decky (Game Glance's own settings are a Navigate tile). */
export function PluginsList({ plugins, openOther, openDecky }: {
    plugins: DeckyPlugin[] | null; openOther(name: string): void; openDecky(): void;
}) {
    return <>
        <div className="gg-menu-heading"><h2>Plugins</h2><MenuAction id="plugins:native" onAction={openDecky}><LuArrowUpRight aria-hidden="true" />Open in Steam</MenuAction></div>
        {plugins === null ? <p className="gg-plugin-note">Plugins could not be listed.</p> :
            <Focusable className="gg-plugin-list" flow-children="column">{plugins.filter(plugin => plugin.name !== PLUGIN_NAME).map(plugin =>
                <MenuAction key={plugin.name} id={pluginFocusKey(plugin.name)} className="gg-plugin-row" onAction={() => openOther(plugin.name)}>
                    <span className="gg-plugin-icon" aria-hidden="true">{plugin.icon ?? <LuPuzzle />}</span>
                    <span className="gg-plugin-name"><span>{plugin.name}</span><span className="gg-plugin-dim">{plugin.version}</span></span>
                    <span className="gg-plugin-end">Opens in Steam<LuArrowUpRight aria-hidden="true" /></span>
                </MenuAction>)}</Focusable>}
    </>;
}
