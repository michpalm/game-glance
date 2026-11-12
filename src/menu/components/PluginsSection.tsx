import { useState } from 'react';
import { activateDeckyPlugin, listDeckyPlugins } from '../steam/deckyPlugins';
import type { NativeRequest } from '../steam/runtime';
import { PluginsList } from './PluginsList';

interface SectionProps { handoff(request: NativeRequest): void }

/** The menu's Plugins section: the other plugins, each opening in Decky (Game Glance's settings are in Navigate). */
export function PluginsSection({ handoff }: SectionProps) {
    // Read once when the section opens, as Decky's own list is.
    const [plugins] = useState(listDeckyPlugins);
    const openDecky = () => handoff({ kind: 'qam', tab: 'decky' });
    const openPlugin = (name: string) => { activateDeckyPlugin(name); openDecky(); };
    return <PluginsList plugins={plugins} openOther={openPlugin} openDecky={openDecky} />;
}
