// Screenshot Steam's Game Mode window on the device through remote CEF debugging.
// Setup: ssh -N -L 18080:127.0.0.1:8080 <device>
// Usage: node scripts/cef-shot.mjs out.png
import { writeFileSync } from 'node:fs';

const base = process.env.CEF_URL ?? 'http://127.0.0.1:18080';
const out = process.argv[2] ?? 'shot.png';
const targets = await (await fetch(`${base}/json`)).json();
const target = targets.find((t) => /Big Picture/i.test(String(t.title)));
if (!target) {
    console.error('Targets:', targets.map((t) => t.title));
    process.exit(1);
}
const ws = new WebSocket(target.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, base.replace(/^http/, 'ws')));
await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
});
ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== 1) return;
    if (!msg.result?.data) {
        console.error(JSON.stringify(msg).slice(0, 500));
        process.exit(1);
    }
    writeFileSync(out, Buffer.from(msg.result.data, 'base64'));
    console.log(`saved ${out}`);
    ws.close();
});
