import { describe, expect, it } from 'vitest';
import { CLOUD_COLOURS, CLOUD_STATUS as S, cloudState, sameCloud } from '../../src/home/cloud';

const on = (eCloudStatus: number, extra = {}) => ({ bCloudEnabledForApp: true, bCloudEnabledForAccount: true, bHasAnyLocalContent: true, eCloudStatus, nCloudProgressPercent: 0, ...extra });

describe('cloudState', () => {
    it('hidden exactly when the game page hides it', () => {
        expect(cloudState(null, 'game', false)).toBeNull();
        expect(cloudState(on(S.synchronized), 'shortcut', false)).toBeNull();
        expect(cloudState(on(S.synchronized), 'missing', false)).toBeNull();
        expect(cloudState(on(S.synchronized, { bCloudEnabledForApp: false }), 'game', false)).toBeNull();
        expect(cloudState(on(S.synchronized, { bCloudEnabledForAccount: false }), 'game', false)).toBeNull();
        expect(cloudState(on(S.synchronized, { bHasAnyLocalContent: false }), 'game', false)).toBeNull();
    });
    it('synced: green with Steam\'s check variant, A does nothing', () => {
        expect(cloudState(on(S.synchronized), 'game', false)).toMatchObject({ tone: 'ok', icon: { uploaded: true }, action: 'none', label: 'Steam Cloud: synced' });
    });
    it('checking, uploading, downloading: yellow with the save arrows, the percent in the label', () => {
        for (const s of [S.checking, S.uploading, S.downloading]) expect(cloudState(on(s), 'game', false)).toMatchObject({ tone: 'busy', icon: { save: true }, action: 'none' });
        expect(cloudState(on(S.uploading, { nCloudProgressPercent: 42.4 }), 'game', false)!.label).toBe('Steam Cloud: uploading 42%');
    });
    it('problems: red with the error mark; conflict opens the conflict dialog, pending-elsewhere nothing, the others retry', () => {
        expect(cloudState(on(S.conflict), 'game', false)).toMatchObject({ tone: 'bad', icon: { error: true }, action: 'conflict' });
        expect(cloudState(on(S.outOfSync), 'game', false)).toMatchObject({ tone: 'bad', icon: { error: true }, action: 'retry' });
        expect(cloudState(on(S.syncFailed), 'game', false)).toMatchObject({ tone: 'bad', icon: { error: true }, action: 'retry' });
        expect(cloudState(on(S.pendingElsewhere), 'game', false)).toMatchObject({ tone: 'bad', icon: { error: true }, action: 'none' });
    });
    it('unknown, disabled or offline: grey', () => {
        for (const s of [S.unknown, S.disabled, S.unknown2]) expect(cloudState(on(s), 'game', false)).toMatchObject({ tone: 'off', icon: {}, action: 'none' });
        expect(cloudState(on(S.synchronized), 'game', true)).toMatchObject({ tone: 'off', label: 'Steam Cloud: offline' });
        expect(cloudState(on(undefined as never), 'game', false)!.status).toBe(S.unknown);
    });
    it('sameCloud compares what renders', () => {
        const a = cloudState(on(S.synchronized), 'game', false);
        expect(sameCloud(a, cloudState(on(S.synchronized), 'game', false))).toBe(true);
        expect(sameCloud(a, cloudState(on(S.checking), 'game', false))).toBe(false);
        expect(sameCloud(null, null)).toBe(true);
        expect(sameCloud(a, null)).toBe(false);
    });
});

describe('CLOUD_COLOURS: four distinct, light tints readable on the dark circle', () => {
    const lum = (hex: string) => {
        const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const contrast = (a: string, b: string) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
    };
    it('at least 4.5:1 on the circle over mid-tone art (#2a2d30), 7:1 over dark art (#0c0e11)', () => {
        for (const c of Object.values(CLOUD_COLOURS)) {
            expect(contrast(c, '#2a2d30')).toBeGreaterThanOrEqual(4.5);
            expect(contrast(c, '#0c0e11')).toBeGreaterThanOrEqual(7);
        }
        expect(new Set(Object.values(CLOUD_COLOURS)).size).toBe(4);
    });
});

describe('cloudDialog (Steam\'s handlers on A)', () => {
    it('conflict: keep local / keep remote resolve the conflict for the game', async () => {
        const { cloudDialog } = await import('../../src/home/steamCloud');
        const calls: unknown[] = [];
        const api = () => ({ ResolveAppSyncConflict: (...a: unknown[]) => calls.push(['resolve', ...a]), RetryAppSync: (...a: unknown[]) => calls.push(['retry', ...a]) });
        const c = cloudDialog('conflict', 7, api)!;
        expect(c.dialog).toBe('conflict');
        expect(c.props).toMatchObject({ appid: 7, bOnAppLaunch: false });
        (c.props.keepLocal as () => void)();
        (c.props.keepRemote as () => void)();
        expect(calls).toEqual([['resolve', 7, true], ['resolve', 7, false]]);
    });
    it('retry: OK retries the sync; none: no dialog', async () => {
        const { cloudDialog } = await import('../../src/home/steamCloud');
        const calls: unknown[] = [];
        const r = cloudDialog('retry', 9, () => ({ RetryAppSync: (id: number) => calls.push(id) }))!;
        expect(r.dialog).toBe('retry');
        (r.props.onOK as () => void)();
        expect(calls).toEqual([9]);
        expect(cloudDialog('none', 9, () => undefined)).toBeNull();
        // A missing Steam call never throws.
        expect(() => (cloudDialog('retry', 9, () => undefined)!.props.onOK as () => void)()).not.toThrow();
    });
});
