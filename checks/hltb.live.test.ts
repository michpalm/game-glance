// Live check against howlongtobeat.com (network). Run: pnpm check:hltb
// Not part of `pnpm test`; use it when HowLongToBeat lookups stop working.
import { fetchNoCors } from '@decky/api';
import { DOMParser } from 'linkedom';
import { expect, it, vi } from 'vitest';
import { fetchHltbGameStats } from '../src/vendor/hltb-for-deck/hooks/HltbApi';

// Steam's browser has DOMParser; Node does not.
(globalThis as { DOMParser?: unknown }).DOMParser = DOMParser;

it('finds The Witcher 3 on HowLongToBeat', async () => {
    const seen: string[] = [];
    vi.mocked(fetchNoCors).mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => { const r = await fetch(url, init); seen.push(`${r.status} ${String(url).slice(0, 110)}`); return r; });
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        errors.push(args.map((a: any) => `${a?.constructor?.name}:${a?.message ?? ''}:${a?.status ?? ''}:${String(a?.stack ?? a).slice(0, 600)}`).join(' '));
    });
    const stats = await fetchHltbGameStats('The Witcher 3: Wild Hunt', 292030);
    expect(stats, [...seen, ...errors].join(' | ')).not.toBeNull();
    expect(Number.parseFloat(stats!.mainStat)).toBeGreaterThan(20);
}, 60_000);
