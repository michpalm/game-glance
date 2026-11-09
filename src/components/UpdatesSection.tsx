import { toaster } from '@decky/api';
import { ButtonItem, DropdownItem, PanelSection, PanelSectionRow } from '@decky/ui';
import { useState } from 'react';
import { createInstallGate, installUpdate, installVersion, isPreRelease, sameVersion, UpdateState, useUpdate } from '../data/update';
import { versionChoices, versionsNote } from '../data/versionChoices';
import { useVersionCatalog } from '../data/useVersionCatalog';
import { PLUGIN_NAME } from '../constants';

/** The Updates section's line under the title: the installed version and what the check found. */
export function updateLine(state: UpdateState): string {
    const version = state.current ? `Version ${state.current}${isPreRelease(state.current) ? ' · prerelease' : ''}` : 'Game Glance';
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
    const [showPrereleases, setShowPrereleases] = useState(false);
    const [selected, setSelected] = useState('');
    const [installing, setInstalling] = useState(false);
    const [installGate] = useState(() => createInstallGate(setInstalling));
    const catalog = useVersionCatalog(choosing);
    const current = state.current;
    const choices = versionChoices(catalog.releases, { current, showPrereleases });
    const release = choices.some(c => c.version === selected) ? catalog.releases.find((r) => r.version === selected) : undefined;
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
                <ButtonItem layout="below" onClick={() => {
                    setChoosing(!choosing);
                    setShowPrereleases(false);
                    setSelected('');
                }}>
                    {choosing ? 'Hide versions' : 'Choose version'}
                </ButtonItem>
            </PanelSectionRow>
            {choosing && <>
                <PanelSectionRow>
                    <ButtonItem layout="below" onClick={() => {
                        setShowPrereleases(!showPrereleases);
                        setSelected('');
                    }}>{showPrereleases ? 'Hide prereleases' : 'Show prereleases'}</ButtonItem>
                </PanelSectionRow>
                <PanelSectionRow>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {versionsNote({ loading: catalog.loading, error: catalog.error, showPrereleases, count: choices.length })}
                    </div>
                </PanelSectionRow>
                {choices.length > 0 && <PanelSectionRow>
                    <DropdownItem
                        label="Version"
                        menuLabel="Choose version"
                        selectedOption={release?.version ?? ''}
                        rgOptions={choices.map(c => ({ data: c.version, label: c.label }))}
                        onChange={(option) => setSelected(String(option.data))}
                        disabled={catalog.loading || installing}
                    />
                </PanelSectionRow>}
                <PanelSectionRow>
                    <ButtonItem layout="below" description={release && isPreRelease(release.version) ? 'Optional test build. You can switch back to stable here.' : undefined} disabled={!release || !current || sameVersion(release.version, current) || catalog.loading || installing} onClick={() => { if (release && current) void requestInstall(() => installVersion(release, current)); }}>
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

