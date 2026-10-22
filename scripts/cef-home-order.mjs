// Read Steam's own Home order and the four lists it is made from, anonymized, for tests/home/fixtures/steam-home-*.json.
// Read-only: it presses nothing and opens nothing; any screen will do.
// Setup: ssh -N -L 18080:127.0.0.1:8080 <device>   (keeps the debugger private to this Mac)
// Usage: node scripts/cef-home-order.mjs <out.json>
import { writeFileSync } from 'node:fs';

const base = process.env.CEF_URL ?? 'http://127.0.0.1:18080';
const out = process.argv[2];
if (!out) {
    console.error('Usage: node scripts/cef-home-order.mjs <out.json>');
    process.exit(1);
}

async function evaluate(target, expression) {
    const wsUrl = target.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, base.replace(/^http/, 'ws'));
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', reject, { once: true });
    });
    const result = await new Promise((resolve) => {
        ws.addEventListener('message', (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id === 1) resolve(msg.result);
        });
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
    });
    ws.close();
    if (result?.exceptionDetails) throw new Error(`EXCEPTION: ${JSON.stringify(result.exceptionDetails).slice(0, 800)}`);
    return result?.result?.value;
}

const targets = await (await fetch(`${base}/json`)).json();
const shared = targets.find((t) => t.title === 'SharedJSContext');
const bigPicture = targets.find((t) => /Big.Picture/i.test(String(t.title))) ?? targets.find((t) => t.title === 'Steam');
if (!shared || !bigPicture) {
    console.error('Targets:', targets.map((t) => t.title));
    process.exit(1);
}

// Steam's Home module (37730, SteamOS 3.8.28, read 2026-10-20 on the Deck and the Ally), kept as it is apart from the names.
const page = `(() => {
    const reduce = (a) => ({
        appid: a.appid, display_name: a.display_name, app_type: a.app_type,
        rt_last_time_played: a.rt_last_time_played, rt_last_time_locally_played: a.rt_last_time_locally_played,
        rt_purchased_time: a.rt_purchased_time, rt_recent_activity_time: a.rt_recent_activity_time,
        rt_last_time_played_or_installed: a.rt_last_time_played_or_installed,
        local_per_client_data: { installed: !!(a.local_per_client_data && a.local_per_client_data.installed) },
        minutes_playtime_forever: a.minutes_playtime_forever,
    });
    const recent = collectionStore.recentAppsCollection.visibleApps.slice();
    const localPlayed = collectionStore.localPlayedGamesCollection.visibleApps.slice();
    const recentPurchased = collectionStore.recentPurchasedGamesCollection.visibleApps.slice();
    const localGames = collectionStore.localGamesCollection.visibleApps.slice();

    const oi = (a) => Math.max(a.rt_last_time_locally_played || 0, a.rt_purchased_time || 0, a.local_per_client_data && a.local_per_client_data.installed ? a.rt_last_time_played_or_installed || 0 : 0);
    let fr = recent, seen = [], list = localPlayed.slice();
    seen.push(...list.map((a) => a.appid));
    const first = list.shift();
    let bought = recentPurchased.filter((a) => !seen.includes(a.appid)); list.push(...bought); seen.push(...bought.map((a) => a.appid));
    let installed = localGames.filter((a) => !seen.includes(a.appid)); list.push(...installed); seen.push(...installed.map((a) => a.appid));
    list.sort((a, b) => oi(b) - oi(a));
    if (first) list.unshift(first);
    fr = fr.filter((a) => !seen.includes(a.appid));
    list.splice(15, 0, ...fr);
    list = list.filter((a) => !a.BIsApplicationOrTool() || a.minutes_playtime_forever > 0);
    list.splice(20);

    let unchanged = false;
    for (const [, mods] of window.webpackChunksteamui) {
        for (const id in mods) {
            const s = mods[id].toString();
            if (s.includes('LocalPlayed).visibleApps') && s.includes('.splice(15,0,') && s.includes('rt_last_time_played_or_installed')) unchanged = true;
        }
    }
    return JSON.stringify({
        steamHomeCode: unchanged ? 'unchanged' : 'changed',
        lists: { recent: recent.map(reduce), localPlayed: localPlayed.map(reduce), recentPurchased: recentPurchased.map(reduce), localGames: localGames.map(reduce) },
        steam: list.map((a) => ({ appid: a.appid, app_type: a.app_type })),
    });
})()`;

const raw = JSON.parse(await evaluate(shared, page));
const device = await evaluate(bigPicture, 'innerWidth + "x" + innerHeight');

// Anonymize: ids 1, 2, 3... in order of first appearance, names G<n>, times shifted so the smallest is 1000000.
const ids = new Map();
const idOf = (appid) => {
    if (!ids.has(appid)) ids.set(appid, ids.size + 1);
    return ids.get(appid);
};
const listNames = ['recent', 'localPlayed', 'recentPurchased', 'localGames'];
for (const name of listNames) for (const a of raw.lists[name]) idOf(a.appid);
for (const a of raw.steam) idOf(a.appid);

const TIMES = ['rt_last_time_played', 'rt_last_time_locally_played', 'rt_purchased_time', 'rt_recent_activity_time', 'rt_last_time_played_or_installed'];
const positive = listNames.flatMap((name) => raw.lists[name].flatMap((a) => TIMES.map((k) => a[k]).filter((t) => t > 0)));
const shift = positive.length ? 1000000 - Math.min(...positive) : 0;
const anonymize = (a) => {
    const n = idOf(a.appid);
    const b = { ...a, appid: n, display_name: `G${n}` };
    for (const k of TIMES) if (b[k] > 0) b[k] += shift;
    return b;
};

const result = {
    device,
    steamHomeCode: raw.steamHomeCode,
    lists: Object.fromEntries(listNames.map((name) => [name, raw.lists[name].map(anonymize)])),
    steam: raw.steam.map((a) => ({ appid: idOf(a.appid), app_type: a.app_type })),
};
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);

console.log(`device: ${device}`);
console.log(`steamHomeCode: ${result.steamHomeCode}`);
console.log(`games per list: ${listNames.map((name) => `${name} ${result.lists[name].length}`).join(', ')}; steam order ${result.steam.length}`);
if (result.steamHomeCode === 'changed') console.warn("WARNING: Steam's Home code changed. Compare the order by eye before trusting this fixture.");
