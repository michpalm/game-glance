import { findModuleExport } from '@decky/ui';
import { ComponentType } from 'react';
import { memoLookup } from '../home/moduleLookup';

const nativeCopyDialog = memoLookup<ComponentType<{ active: boolean; onDismiss(): void; appID: number; details: unknown }>>('family copy chooser', () =>
    findModuleExport((value: unknown) => typeof value === 'function' && String(value).includes('SteamClient.FamilySharing.GetAvailableLenders') && String(value).includes('onDismiss')) ?? null,
);

/** Steam's existing chooser, usable from Home without mounting a game page. */
export function FamilyCopyDialog({ appId, open, onClose }: { appId: number; open: boolean; onClose(): void }) {
    if (!open) return null;
    const Dialog = nativeCopyDialog();
    if (!Dialog) return null;
    const g = globalThis as unknown as { appDetailsStore?: { GetAppDetails?(id: number): unknown }; appStore?: { GetAppOverviewByAppID?(id: number): { display_status?: number } } };
    const details = g.appDetailsStore?.GetAppDetails?.(appId) ?? { unAppID: appId, eDisplayStatus: g.appStore?.GetAppOverviewByAppID?.(appId)?.display_status };
    return <Dialog active appID={appId} details={details} onDismiss={onClose} />;
}
