// Preview the game page at another screen size (e.g. a TV) by emulating the viewport, then restore it.
// Usage: node scripts/cef-viewport.mjs out-prefix WIDTHxHEIGHT@SCALE [...]   e.g. 1280x720@1.5 1920x1080@1
import { writeFileSync } from 'node:fs';

const base = process.env.CEF_URL ?? 'http://127.0.0.1:18080';
const [prefix, ...sizes] = process.argv.slice(2);
const targets = await (await fetch(`${base}/json`)).json();
const target = targets.find((t) => /Big Picture/i.test(String(t.title)));
const ws = new WebSocket(target.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, base.replace(/^http/, 'ws')));
await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
});
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
    }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
    for (const size of sizes) {
        const [, w, h, s] = size.match(/^(\d+)x(\d+)@([\d.]+)$/);
        await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: +s, mobile: false });
        await sleep(1500);
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const out = `${prefix}-${w}x${h}.png`;
        writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
        const m = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => { const r = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? [b.x, b.y, b.width, b.height].map(Math.round) : null; }; return JSON.stringify({ vp: [innerWidth, innerHeight], play: r('._1fHBRg7vFnKszK6EiOdIEY'), hero: r('.gg-hero'), tabs: r('.gg-more') }); })()` });
        console.log(out, m.result.result.value);
    }
} finally {
    await send('Emulation.clearDeviceMetricsOverride');
    ws.close();
}
