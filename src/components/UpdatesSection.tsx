import { toaster } from '@decky/api';
import { ButtonItem, DropdownItem, PanelSection, PanelSectionRow } from '@decky/ui';
import { useState } from 'react';
import { createInstallGate, installUpdate, installVersion, sameVersion, UpdateState, useUpdate } from '../data/update';
import { useVersionCatalog } from '../data/useVersionCatalog';
import { PLUGIN_NAME } from '../constants';

/** The Updates section's line under the title: the installed version and what the check found. */
function updateLine(state: UpdateState): string {
    const version = state.current ? `Version ${state.current}` : 'Game Glance';
    switch (state.status) {
        case 'checking':
            return `${version} · checking for updates…`;
        case 'upToDate':
            return `${version} · up to date`;
        case 'available':
            return `${version} · ${state.release.version} is available`;
        default:
            return `${version} · could not check for updates`;
    }
}

/**
 * Updates: checks GitHub's latest release once a day (data/update.ts: when Game Glance loads, then daily while it runs),
 * and installs a newer one through Decky's own installer, which asks to confirm and then reloads Game Glance. Check for
 * updates (always there; off while a check runs) asks GitHub again.
 */
export function UpdatesSection() {
    const { state, recheck } = useUpdate();
    const [choosing, setChoosing] = useState(false);
    const [selected, setSelected] = useState('');
    const [installing, setInstalling] = useState(false);
    const [installGate] = useState(() => createInstallGate(setInstalling));
    const catalog = useVersionCatalog(choosing);
    const release = catalog.releases.find((r) => r.version === selected);
    const current = state.current;
    const requestInstall = async (action: () => Promise<boolean>) => {
        if ((await installGate.run(action)) === false) {
            toaster.toast({ title: PLUGIN_NAME, body: 'Could not start the install. Try again or use the release page.' });
        }
    };
    return (
        <PanelSection title="Updates">
            <PanelSectionRow>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{updateLine(state)}</div>
            </PanelSectionRow>
            {state.status === 'available' && (
                <PanelSectionRow>
                    <ButtonItem
                        layout="below"
                        description="Decky asks to confirm, then installs it and reloads Game Glance."
                        disabled={installing}
                        onClick={() => requestInstall(() => installUpdate(state.release))}
                    >
                        Update to {state.release.version}
                    </ButtonItem>
                </PanelSectionRow>
            )}
            <PanelSectionRow>
                <ButtonItem layout="below" disabled={state.status === 'checking'} onClick={recheck}>
                    Check for updates
                </ButtonItem>
            </PanelSectionRow>
            <PanelSectionRow>
                <ButtonItem layout="below" onClick={() => setChoosing(!choosing)}>
                    {choosing ? 'Hide versions' : 'Choose version'}
                </ButtonItem>
            </PanelSectionRow>
            {choosing && <>
                <PanelSectionRow>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {catalog.loading ? 'Loading versions…' : catalog.error ? 'Could not refresh versions. Showing saved choices when available.' : catalog.releases.length === 0 ? 'No versions from 3.5.0 onward are available yet.' : 'Stable versions from 3.5.0 onward. Decky asks before installing.'}
                    </div>
                </PanelSectionRow>
                {catalog.releases.length > 0 && <PanelSectionRow>
                    <DropdownItem
                        label="Version"
                        menuLabel="Choose version"
                        selectedOption={release?.version ?? ''}
                        rgOptions={catalog.releases.map((r, i) => ({ data: r.version, label: `${r.version}${current && sameVersion(r.version, current) ? ' · installed' : ''}${i === 0 ? ' · latest' : ''}` }))}
                        onChange={(option) => setSelected(String(option.data))}
                        disabled={catalog.loading || installing}
                    />
                </PanelSectionRow>}
                <PanelSectionRow>
                    <ButtonItem layout="below" disabled={!release || !current || sameVersion(release.version, current) || catalog.loading || installing} onClick={() => { if (release && current) void requestInstall(() => installVersion(release, current)); }}>
                        {release ? `Install ${release.version}` : 'Select a version to install'}
                    </ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                    <ButtonItem layout="below" disabled={catalog.loading || installing} onClick={catalog.refresh}>
                        Refresh versions
                    </ButtonItem>
                </PanelSectionRow>
            </>}
        </PanelSection>
    );
}

