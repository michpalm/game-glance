import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureChatAnchor, restoreChatAnchor } from '../../src/menu/socialScroll';

it('preserves the visible message when a bounded history window changes without changing total height', () => {
    const { document } = parseHTML('<div id="history"><div data-gg-message="a"></div><div data-gg-message="b"></div></div>');
    const container = document.querySelector('#history')! as unknown as HTMLElement;
    const first = container.querySelector<HTMLElement>('[data-gg-message="a"]')!;
    let top = 100;
    container.getBoundingClientRect = () => ({ top: 100, bottom: 500 } as DOMRect);
    first.getBoundingClientRect = () => ({ top, bottom: top + 40 } as DOMRect);
    Object.defineProperty(container, 'scrollHeight', { value: 5000 }); container.scrollTop = 400;
    const anchor = captureChatAnchor(container); top = 300;
    restoreChatAnchor(container, anchor);
    expect(container.scrollTop).toBe(600);
});

it('moves focused rows clear of the complete focus ring at both edges under menu scaling',async()=>{
 const {revealFriendRow}=await import('../../src/menu/socialScroll');
 const {document}=parseHTML('<div id="list"><button class="gg-social-friend"></button></div>');
 const list=document.getElementById('list')! as unknown as HTMLElement,row=list.firstElementChild as HTMLElement;
 Object.defineProperties(list,{clientHeight:{value:200},scrollHeight:{value:600}});
 list.getBoundingClientRect=()=>({top:100,bottom:500,height:400} as DOMRect);list.scrollTop=20;
 row.getBoundingClientRect=()=>({top:102,bottom:230,height:128} as DOMRect);revealFriendRow(list,row);expect(list.scrollTop).toBe(1);
 list.scrollTop=20;row.getBoundingClientRect=()=>({top:370,bottom:498,height:128} as DOMRect);revealFriendRow(list,row);expect(list.scrollTop).toBe(39);
 row.getBoundingClientRect=()=>({top:200,bottom:328,height:128} as DOMRect);revealFriendRow(list,row);expect(list.scrollTop).toBe(39);
});
it('shows edge fades only where more rows exist and releases the scroll listener',async()=>{
 const {installFriendScroll}=await import('../../src/menu/socialScroll');
 const {document,window}=parseHTML('<div id="list"><button class="gg-social-friend"></button></div>');
 const list=document.getElementById('list')! as unknown as HTMLElement;
 Object.defineProperties(list,{clientHeight:{value:200},scrollHeight:{value:600}});
 list.scrollTop=0;const stop=installFriendScroll(list);expect(list.dataset.scrollTop).toBe('false');expect(list.dataset.scrollBottom).toBe('true');
 list.scrollTop=30;list.dispatchEvent(new window.Event('scroll') as unknown as Event);expect(list.dataset.scrollTop).toBe('true');
 list.scrollTop=400;list.dispatchEvent(new window.Event('scroll') as unknown as Event);expect(list.dataset.scrollBottom).toBe('false');
 stop();list.scrollTop=0;list.dispatchEvent(new window.Event('scroll') as unknown as Event);expect(list.dataset.scrollTop).toBeUndefined();
});

it('waits for Steam focus scrolling before reserving room, and cancels a pending reveal on cleanup',async()=>{
 const {installFriendScroll}=await import('../../src/menu/socialScroll');
 const {document,window}=parseHTML('<div id="list"><button class="gg-social-friend"><span>Example</span></button></div>');
 const list=document.getElementById('list')! as unknown as HTMLElement,row=list.firstElementChild as HTMLElement;
 Object.defineProperties(list,{clientHeight:{value:200},scrollHeight:{value:600}});list.scrollTop=20;
 list.getBoundingClientRect=()=>({top:100,bottom:500,height:400} as DOMRect);row.getBoundingClientRect=()=>({top:102,bottom:230,height:128} as DOMRect);
 let callback:FrameRequestCallback|undefined;window.requestAnimationFrame=(run:FrameRequestCallback)=>{callback=run;return 7;};window.cancelAnimationFrame=()=>{callback=undefined;};
 const tick=()=>{const run=callback;callback=undefined;run?.(0);};
 const stop=installFriendScroll(list);row.firstElementChild!.dispatchEvent(new window.Event('focusin',{bubbles:true}) as unknown as Event);
 expect(list.scrollTop).toBe(20);tick();expect(list.scrollTop).toBe(20);tick();expect(list.scrollTop).toBe(1);
 list.scrollTop=20;row.dispatchEvent(new window.Event('focusin',{bubbles:true}) as unknown as Event);stop();tick();tick();expect(list.scrollTop).toBe(20);
});

describe('Notifications page scrolling', () => {
    const page = () => {
        const { document, window } = parseHTML('<div class="gg-menu-panel"><div class="gg-notifications"><div class="gg-menu-heading"><h2>Notifications</h2><button id="mark">Mark all read</button></div><div class="gg-notifications-list"><button class="gg-notification" id="a"><span>A</span></button><button class="gg-notification" id="b"></button></div></div></div>');
        const panel = document.querySelector('.gg-menu-panel') as unknown as HTMLElement;
        Object.defineProperties(panel, { clientHeight: { value: 200 }, scrollHeight: { value: 600 } });
        panel.getBoundingClientRect = () => ({ top: 100, bottom: 500, height: 400 } as DOMRect);
        let callback: FrameRequestCallback | undefined;
        window.requestAnimationFrame = (run: FrameRequestCallback) => { callback = run; return 3; }; window.cancelAnimationFrame = () => { callback = undefined; };
        const tick = () => { const run = callback; callback = undefined; run?.(0); };
        const focus = (id: string) => document.getElementById(id)!.dispatchEvent(new window.Event('focusin', { bubbles: true }) as unknown as Event);
        return { document, panel, tick, focus };
    };
    it('scrolls to the very top after Steam’s focus scroll when the heading button or first row takes focus', async () => {
        const { installNotificationScroll } = await import('../../src/menu/socialScroll');
        const p = page(), stop = installNotificationScroll(p.panel);
        p.panel.scrollTop = 46; p.focus('mark'); p.tick(); expect(p.panel.scrollTop).toBe(46); p.tick(); expect(p.panel.scrollTop).toBe(0);
        p.panel.scrollTop = 30; (p.document.querySelector('#a span') as unknown as HTMLElement).dispatchEvent(new (p.document.defaultView as any).Event('focusin', { bubbles: true })); p.tick(); p.tick(); expect(p.panel.scrollTop).toBe(0);
        stop();
    });
    it('keeps other rows 28px clear of the panel edges, and cancels a pending correction on cleanup', async () => {
        const { installNotificationScroll, NOTIFICATION_FOCUS_INSET } = await import('../../src/menu/socialScroll');
        expect(NOTIFICATION_FOCUS_INSET).toBe(28);
        const p = page(), row = p.document.getElementById('b') as unknown as HTMLElement, stop = installNotificationScroll(p.panel);
        p.panel.scrollTop = 100; row.getBoundingClientRect = () => ({ top: 400, bottom: 496, height: 96 } as DOMRect);
        p.focus('b'); p.tick(); p.tick(); expect(p.panel.scrollTop).toBe(126);
        p.panel.scrollTop = 100; p.focus('mark'); stop(); p.tick(); p.tick(); expect(p.panel.scrollTop).toBe(100);
    });
});

afterEach(() => vi.useRealTimers());
/** A settings panel; `settle()` lets the scroll go still (QUIET_MS) so the correction runs; `scrollTo` glides (smooth). */
function panelOf(html: string) {
    vi.useFakeTimers();
    const { document, window } = parseHTML(html);
    const panel = document.querySelector('.gg-menu-panel') as unknown as HTMLElement;
    Object.defineProperties(panel, { clientHeight: { value: 200 }, scrollHeight: { value: 600 } });
    panel.getBoundingClientRect = () => ({ top: 100, bottom: 500, height: 400 } as DOMRect);
    const glides: ScrollToOptions[] = [];
    panel.scrollTo = ((options: ScrollToOptions) => { glides.push(options); panel.scrollTop = options.top ?? panel.scrollTop; }) as typeof panel.scrollTo;
    const settle = () => vi.advanceTimersByTime(200);
    const focus = (id: string) => document.getElementById(id)!.dispatchEvent(new window.Event('focusin', { bubbles: true }) as unknown as Event);
    const scroll = (to: number) => { panel.scrollTop = to; panel.dispatchEvent(new window.Event('scroll') as unknown as Event); };
    return { document, panel, settle, focus, scroll, glides };
}

describe('settings page scrolling', () => {
    const page = () => panelOf('<div class="gg-menu-panel"><div class="gg-menu-heading"><h2>Game page</h2></div><div class="gg-menu-setting"><button id="full"></button><button id="clean"></button></div><button id="mid"></button><button id="last"></button></div>');
    it('shows the heading for any button on the first row, once Steam’s focus scroll is still', async () => {
        const { installPageScroll } = await import('../../src/menu/socialScroll');
        const p = page(), stop = installPageScroll(p.panel);
        p.panel.scrollTop = 44; p.focus('full'); expect(p.panel.scrollTop).toBe(44); p.settle(); expect(p.panel.scrollTop).toBe(0);
        p.panel.scrollTop = 44; p.focus('clean'); p.settle(); expect(p.panel.scrollTop).toBe(0);
        stop();
    });
    it('shows the notes under the last row, and keeps middle rows clear of the edges', async () => {
        const { installPageScroll } = await import('../../src/menu/socialScroll');
        const p = page(), stop = installPageScroll(p.panel);
        p.panel.scrollTop = 44; p.focus('last'); p.settle(); expect(p.panel.scrollTop).toBe(400);
        const mid = p.document.getElementById('mid') as unknown as HTMLElement;
        mid.getBoundingClientRect = () => ({ top: 400, bottom: 496, height: 96 } as DOMRect);
        p.panel.scrollTop = 100; p.focus('mid'); p.settle(); expect(p.panel.scrollTop).toBe(126);
        p.panel.scrollTop = 100; p.focus('full'); stop(); p.settle(); expect(p.panel.scrollTop).toBe(100);
    });
});

describe('Quick settings scrolling (Steam Focusables, not buttons)', () => {
    const page = () => panelOf(`<div class="gg-menu-panel"><div class="gg-menu-heading"><h2>Quick settings</h2></div>
        <div class="gg-menu-quick-sliders Focusable"><div class="gg-menu-setting"><div class="Focusable" id="brightness"></div></div>
        <div class="gg-menu-setting"><div class="Focusable" id="volume"></div></div><div class="gg-menu-device"><div class="Focusable" id="output"></div></div></div>
        <div class="gg-menu-switches Focusable"><div class="gg-menu-setting"><div class="Focusable" id="wifi"></div></div><div class="gg-menu-setting"><div class="Focusable" id="dnd"></div></div></div></div>`);
    it("waits for Steam's own focus scroll to go still, then glides once (smoothly) to the bottom; later scrolling is left alone", async () => {
        const { installPageScroll, QUICK_FOCUSABLES } = await import('../../src/menu/socialScroll');
        const p = page(); let clock = 1000;
        const stop = installPageScroll(p.panel, QUICK_FOCUSABLES, { now: () => clock });
        p.panel.scrollTop = 0; p.focus('dnd');
        clock += 100; vi.advanceTimersByTime(30); p.scroll(0.4);
        clock += 90; vi.advanceTimersByTime(30); p.scroll(0.9);
        expect(p.glides).toHaveLength(0); // never during Steam's animation: that fight was the choppiness
        p.settle();
        expect(p.panel.scrollTop).toBe(400);
        expect(p.glides).toEqual([{ top: 400, behavior: 'smooth' }]);
        p.scroll(250); p.settle(); // our own glide's scroll events: no second correction
        expect(p.glides).toHaveLength(1);
        clock += 2000; p.scroll(120); p.settle(); expect(p.panel.scrollTop).toBe(120);
        stop();
    });
    it('Brightness (the first row) shows the heading; the device row keeps clear of the edges', async () => {
        const { installPageScroll, QUICK_FOCUSABLES } = await import('../../src/menu/socialScroll');
        const p = page(), stop = installPageScroll(p.panel, QUICK_FOCUSABLES);
        p.panel.scrollTop = 120; p.focus('brightness'); p.settle(); expect(p.panel.scrollTop).toBe(0);
        const output = p.document.getElementById('output') as unknown as HTMLElement;
        output.getBoundingClientRect = () => ({ top: 400, bottom: 496, height: 96 } as DOMRect);
        p.panel.scrollTop = 100; p.focus('output'); p.settle(); expect(p.panel.scrollTop).toBe(126);
        stop();
    });
});
