// Steam's two play time counters side by side: the overview's minutes_playtime_forever and the details' nPlaytimeForever.
// Read-only: it presses nothing and opens nothing. Names go to the screen only, never to a file.
// Setup: ssh -N -L 18080:127.0.0.1:8080 <device>   (keeps the debugger private to this Mac)
// Usage: node scripts/cef-playtime.mjs [limit=30]   (limit: games per table)
const base = process.env.CEF_URL ?? 'http://127.0.0.1:18080';
const limit = Number(process.argv[2]) || 30;

const targets = await (await fetch(`${base}/json`)).json();
const target = targets.find((t) => t.title === 'SharedJSContext');
if (!target) {
    console.error('Targets:', targets.map((t) => t.title));
    process.exit(1);
}
const wsUrl = target.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, base.replace(/^http/, 'ws'));
const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
});

const page = `(async () => {
    const LIMIT = ${limit};
    const detailsMinutes = async (appid) => {
        try {
            const d = appDetailsStore.GetAppDetails(appid);
            if (d && typeof d === 'object' && d.nPlaytimeForever !== undefined) return d.nPlaytimeForever;
            const got = await new Promise((resolve) => {
                let reg = null, done = false;
                const finish = (x) => { if (done) return; done = true; clearTimeout(timer); try { reg && reg.unregister(); } catch (e) {} resolve(x); };
                const timer = setTimeout(() => finish(null), 2000);
                reg = SteamClient.Apps.RegisterForAppDetails(appid, (x) => finish(x));
                if (done) { try { reg.unregister(); } catch (e) {} }
            });
            return got ? got.nPlaytimeForever : null;
        } catch (e) { return null; }
    };
    const rows = async (apps) => {
        const out = [];
        for (const a of apps) out.push({ appid: a.appid, name: a.display_name, overview: a.minutes_playtime_forever || 0, details: await detailsMinutes(a.appid) });
        return out;
    };
    const all = Array.from(appStore.allApps);
    const steam = all.filter((a) => a.app_type === 1 && a.minutes_playtime_forever > 0).sort((a, b) => b.minutes_playtime_forever - a.minutes_playtime_forever).slice(0, LIMIT);
    const shortcuts = all.filter((a) => a.app_type === 1073741824).sort((a, b) => (b.minutes_playtime_forever > 0) - (a.minutes_playtime_forever > 0) || b.minutes_playtime_forever - a.minutes_playtime_forever);
    return JSON.stringify({ steam: await rows(steam), shortcuts: await rows(shortcuts), counts: { steamAll: all.filter((a) => a.app_type === 1 && a.minutes_playtime_forever > 0).length, shortcuts: shortcuts.length } });
})()`;

const result = await new Promise((resolve) => {
    ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === 1) resolve(msg.result);
    });
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: page, awaitPromise: true, returnByValue: true } }));
});
ws.close();
if (result?.exceptionDetails) {
    console.error(`EXCEPTION: ${JSON.stringify(result.exceptionDetails).slice(0, 800)}`);
    process.exit(1);
}
const data = JSON.parse(result.result.value);

function table(title, rows) {
    console.log(`\n${title}`);
    console.log(`${'appid'.padStart(11)}  ${'name'.padEnd(32)} ${'overview'.padStart(9)} ${'details'.padStart(9)} ${'difference'.padStart(11)}`);
    let differ = 0;
    let detailsLarger = 0;
    let largest = 0;
    for (const r of rows) {
        const diff = typeof r.details === 'number' ? r.details - r.overview : null;
        if (diff !== null && diff !== 0) differ++;
        if (diff !== null && diff > 0) detailsLarger++;
        if (diff !== null) largest = Math.max(largest, Math.abs(diff));
        console.log(`${String(r.appid).padStart(11)}  ${String(r.name).slice(0, 32).padEnd(32)} ${String(r.overview).padStart(9)} ${String(r.details ?? 'n/a').padStart(9)} ${(diff === null ? 'n/a' : String(diff)).padStart(11)}`);
    }
    console.log(`${rows.length} games: ${differ} differ, ${detailsLarger} with details larger than overview, largest difference ${(largest / 60).toFixed(1)} h`);
}

table(`Steam games with play time (${data.steam.length} of ${data.counts.steamAll}, most played first)`, data.steam);
table(`Non-Steam shortcuts (${data.counts.shortcuts}, those with play time first)`, data.shortcuts);
