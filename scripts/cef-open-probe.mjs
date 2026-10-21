// Record an open from Spotlight Home on the device: a timeline of what the user sees, plus screencast frames.
// Setup: ssh -N -L 18080:127.0.0.1:8080 <device>   (keeps the debugger private to this Mac)
// Usage: node scripts/cef-open-probe.mjs <outDir> <trial...>   (a trial is "none" = open, no B, or "tN" = B at N ms after A)
// Steam must be on Home with the game row focused. A and B go through Steam's own controller path
// (FocusNavController.DispatchVirtualButtonClick), as a physical press would; nothing else on the device is touched.
// Writes <outDir>/trial-<i>-<name>/<ms>.jpg (ms since A) and <outDir>/results.json. Brightness per frame: scripts/frame-bands.py.
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.CEF_URL ?? 'http://127.0.0.1:18080';
const [outDir, ...trialArgs] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A failure the user can act on: printed as a plain message, never a stack trace. It is thrown (not process.exit)
// so that the cleanup in the final `finally` always runs and the device is left as it was found.
class ProbeError extends Error {}
function fail(message) {
    throw new ProbeError(message);
}

const trials = trialArgs.map((arg) => {
    if (arg === 'none') return { name: 'none', b: null };
    const m = /^t(\d+)$/.exec(arg);
    return m ? { name: arg, b: Number(m[1]) } : null;
});

const CALL_TIMEOUT = 10_000;

async function connect(target) {
    const ws = new WebSocket(target.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, base.replace(/^http/, 'ws')));
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out opening the debugger socket for "${target.title}"`)), CALL_TIMEOUT);
        ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
        ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error(`cannot open the debugger socket for "${target.title}"`)); }, { once: true });
    });
    let id = 0;
    let closedWith = null;
    const waiting = new Map();
    const listeners = [];
    // A dropped tunnel must end every call in flight, not leave them waiting for an answer that cannot come.
    const closed = () => {
        closedWith ??= new Error(`the debugger socket for "${target.title}" closed (did the tunnel drop?)`);
        for (const { reject } of waiting.values()) reject(closedWith);
        waiting.clear();
    };
    ws.addEventListener('close', closed);
    ws.addEventListener('error', closed);
    ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && waiting.has(msg.id)) {
            waiting.get(msg.id).resolve(msg);
            waiting.delete(msg.id);
        } else if (msg.method) for (const l of listeners) l(msg);
    });
    const send = (method, params = {}, timeout = CALL_TIMEOUT) => new Promise((resolve, reject) => {
        if (closedWith) return reject(closedWith);
        const n = ++id;
        const timer = setTimeout(() => { waiting.delete(n); reject(new Error(`${method} on "${target.title}" got no answer in ${timeout / 1000} s`)); }, timeout);
        waiting.set(n, { resolve: (msg) => { clearTimeout(timer); resolve(msg); }, reject: (err) => { clearTimeout(timer); reject(err); } });
        try {
            ws.send(JSON.stringify({ id: n, method, params }));
        } catch (err) {
            clearTimeout(timer);
            waiting.delete(n);
            reject(err);
        }
    });
    const evaluate = async (expression, timeout) => {
        const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeout);
        if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500));
        return r.result?.result?.value;
    };
    return { send, evaluate, on: (l) => listeners.push(l), close: () => ws.close() };
}

// Installed in Big Picture's window: a timeline of what the user sees, in performance.now() ms.
// "Outside the copy" is the real Home or game page, not the frozen copy of Home that covers the swap.
const INSTRUMENT = `(() => {
  window.__ggProbe?.stop?.();
  const log = [];
  const t = () => Math.round(performance.now());
  const outsideCopy = (sel) => [...document.querySelectorAll(sel)].some((el) => !el.closest('[aria-hidden="true"][style*="99999"]'));
  let home = outsideCopy('.gh-root'), page = outsideCopy('.gg-pill'), opening = !!document.querySelector('.gh-root[data-gh-opening]');
  let box = null, lastOpacity = null;
  const watchBox = new MutationObserver(() => {
    if (!box) return;
    const o = box.style.opacity;
    if (o !== lastOpacity) { log.push([t(), 'copy opacity ' + o + ' ' + (box.style.transition || '').slice(0, 40)]); lastOpacity = o; }
  });
  const obs = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) if (n.nodeType === 1 && n.parentNode === document.body && n.querySelector?.('.gh-bridge')) { box = n; lastOpacity = null; log.push([t(), 'copy mounted']); watchBox.observe(n, { attributes: true, attributeFilter: ['style'] }); }
      for (const n of r.removedNodes) if (n === box) { log.push([t(), 'copy removed']); box = null; }
    }
    const h = outsideCopy('.gh-root'); if (h !== home) { home = h; log.push([t(), h ? 'HOME shown' : 'home gone']); }
    const p = outsideCopy('.gg-pill'); if (p !== page) { page = p; log.push([t(), p ? 'PAGE shown' : 'page gone']); }
    const o = !!document.querySelector('.gh-root[data-gh-opening]'); if (o !== opening) { opening = o; log.push([t(), o ? 'opening on' : 'opening off']); }
  });
  obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-gh-opening'] });
  window.__ggProbe = { log, stop: () => { obs.disconnect(); watchBox.disconnect(); } };
  return { home, page };
})()`;

let bp, shared;
let screencasting = false;
let stopped = false;
let cleaned = false;
// Leave the device as found: stop the screencast and the observer, close the sockets. Safe to call twice, and short
// timeouts so that a dead tunnel cannot hold it up.
async function cleanup() {
    stopped = true;
    if (cleaned) return;
    cleaned = true;
    if (screencasting) try { await bp.send('Page.stopScreencast', {}, 3000); } catch { /* the socket may already be gone */ }
    try { await bp?.evaluate('window.__ggProbe?.stop?.()', 3000); } catch { /* the socket may already be gone */ }
    bp?.close();
    shared?.close();
}
process.once('SIGINT', async () => {
    console.error('\nInterrupted; stopping the screencast and the observer on the device.');
    await cleanup();
    process.exit(130);
});

try {
    if (!outDir || trials.length === 0 || trials.includes(null)) {
        fail('Usage: CEF_URL=http://127.0.0.1:18080 node scripts/cef-open-probe.mjs <outDir> <trial...>   (trial: none, or tN = B at N ms after A)');
    }
    let targets;
    try {
        targets = await (await fetch(`${base}/json`, { signal: AbortSignal.timeout(CALL_TIMEOUT) })).json();
    } catch {
        fail(`No debugger at ${base}. Open the tunnel first: ssh -N -L 18080:127.0.0.1:8080 <device>`);
    }
    const bpTarget = targets.find((t) => /Big.Picture/i.test(String(t.title)));
    const sharedTarget = targets.find((t) => t.title === 'SharedJSContext');
    if (!bpTarget || !sharedTarget) fail(`Missing target (need Big Picture and SharedJSContext). Targets: ${targets.map((t) => t.title).join(', ')}`);
    bp = await connect(bpTarget);
    shared = await connect(sharedTarget);

    const pressA = () => shared.evaluate('FocusNavController.DispatchVirtualButtonClick(1), true');
    const pressB = () => shared.evaluate('FocusNavController.DispatchVirtualButtonClick(2), true');
    const frames = [];
    bp.on((msg) => {
        if (msg.method !== 'Page.screencastFrame') return;
        frames.push({ ts: msg.params.metadata.timestamp, data: msg.params.data });
        bp.send('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
    });
    const onHome = () => bp.evaluate(`[...document.querySelectorAll('.gh-root')].some((el) => !el.closest('[aria-hidden="true"][style*="99999"]'))`);

    mkdirSync(outDir, { recursive: true });
    const results = [];
    for (const [i, trial] of trials.entries()) {
        const path = await shared.evaluate('DFL.Router.WindowStore.GamepadUIMainWindowInstance.m_history.location.pathname');
        if (path !== '/library/home') {
            await shared.evaluate(`DFL.Navigation.Navigate('/library/home'), true`);
            await sleep(1500);
        }
        const state = await bp.evaluate(INSTRUMENT);
        if (!state.home || state.page) fail(`Trial ${i}: Steam is not on Home (${JSON.stringify(state)}).`);
        if (!(await bp.evaluate(`!!document.querySelector('.gh-root .gh-cap-sel, .gh-root .gh-cap-wide')`))) {
            fail(`Trial ${i}: Home has no game card (.gh-cap-sel / .gh-cap-wide). Is Spotlight Home on?`);
        }

        // A goes to whatever has focus, so it must be on the game row: anywhere else it would press something else.
        const FOCUS = "Focus Home's game row on the device (press Down/B until a game card is selected), then run again.";
        if (!(await bp.evaluate(`!!document.activeElement?.closest('.gh-recents')`))) fail(`Trial ${i}: focus is not on Home's game row. ${FOCUS}`);

        frames.length = 0;
        screencasting = true;
        await bp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 640, everyNthFrame: 1 });
        await sleep(300);
        // The device's clock, read together with performance.now(), so frames and the log share one origin.
        // Frames carry the device's wall clock and the log carries performance.now(); neither is the Mac's, so align by content.
        const [t0, wall0] = await bp.evaluate('[performance.now(), Date.now() / 1000]');
        const macA = Date.now();
        await pressA();
        // B is timed on its own so that polling for the open never delays it. If A turns out to have done nothing,
        // `cancelled` (or a cleanup) keeps a B still waiting for its time from landing on Home. A B whose time comes
        // before the one-second verdict (tN with N under 1000) cannot be held back: it is sent as scheduled.
        let pressedAt = null;
        let cancelled = false;
        const sendB = async () => {
            if (trial.b === null) return;
            const left = trial.b - (Date.now() - macA);
            if (left > 0) await sleep(left);
            if (cancelled || stopped) return;
            pressedAt = Date.now() - macA;
            await pressB();
        };
        // Did A start an open? Give it one second to show.
        const watchStart = async () => {
            while (Date.now() - macA < 1000) {
                if (await bp.evaluate(`window.__ggProbe.log.some(([, e]) => e === 'opening on' || e === 'PAGE shown')`)) return true;
                await sleep(25);
            }
            return false;
        };
        const bDone = sendB();
        bDone.catch(() => {}); // reported below, or dropped when the run is already failing for another reason
        let started = false;
        try {
            started = await watchStart();
        } finally {
            if (!started) cancelled = true;
        }
        if (!started) {
            await bp.send('Page.stopScreencast');
            screencasting = false;
            console.error(`What the observer saw: ${JSON.stringify(await bp.evaluate('window.__ggProbe.log'))}`);
            fail(`A did not start an open. ${FOCUS}`);
        }
        await bDone;
        await sleep(Math.max(0, 2500 - (Date.now() - macA)));
        await bp.send('Page.stopScreencast');
        screencasting = false;

        const log = await bp.evaluate('window.__ggProbe.log');
        const timeline = log.map(([at, event]) => [Math.round(at - t0), event]);
        const dir = `${outDir}/trial-${i}-${trial.name}`;
        mkdirSync(dir, { recursive: true });
        // Frames from before A collapse into 00000 (the last one wins): the screen as A found it.
        for (const f of frames) writeFileSync(`${dir}/${String(Math.max(0, Math.round((f.ts - wall0) * 1000))).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64'));
        results.push({ trial: trial.name, pressedAt, timeline, frames: frames.length });
        writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 1)); // after each trial: a later failure keeps what was recorded

        console.log(`\n== trial ${i}: ${pressedAt === null ? 'B not pressed' : `B at ${pressedAt} ms after A`}; ${frames.length} frames (ms since A)`);
        for (const [at, event] of timeline) console.log(String(at).padStart(6), event);

        // Back on Home for the next trial (unless B already brought it back).
        if (!(await onHome())) {
            await pressB();
            await sleep(1500);
        }
        await sleep(1200);
    }
    console.log(`\nWrote ${outDir}/results.json`);
} catch (err) {
    console.error(err instanceof ProbeError ? err.message : `cef-open-probe stopped: ${err?.message ?? err}`);
    process.exitCode = 1;
} finally {
    await cleanup();
}
