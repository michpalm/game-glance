// Evaluate a JS expression in the device's Steam UI through remote CEF debugging.
// Setup: ssh -N -L 18080:127.0.0.1:8080 <device>   (keeps the debugger private to this Mac)
// Usage: node scripts/cef-eval.mjs '<expression>' [targetTitleSubstring]   (default target: Big Picture window)
const base = process.env.CEF_URL ?? 'http://127.0.0.1:18080';
const expression = process.argv[2];
const want = process.argv[3];
const targets = await (await fetch(`${base}/json`)).json();
const target = want
    ? targets.find((t) => String(t.title).includes(want))
    : targets.find((t) => /Big Picture/i.test(String(t.title))) ?? targets.find((t) => t.title === 'Steam');
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
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== 1) return;
    const r = msg.result;
    console.log(r?.exceptionDetails ? `EXCEPTION: ${JSON.stringify(r.exceptionDetails).slice(0, 800)}` : typeof r?.result?.value === 'string' ? r.result.value : JSON.stringify(r?.result?.value ?? r, null, 2));
    ws.close();
});
