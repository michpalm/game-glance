import {it,expect,vi} from 'vitest';
import {routeSource} from '../../src/search/steam';
it('observes native history changes and removes the listener once',()=>{let f=()=>{};const stop=vi.fn();const h={location:{pathname:'/library/home'},listen:(fn:()=>void)=>{f=fn;return stop;}};const r=routeSource(h);const changed=vi.fn(),off=r.subscribe(changed);h.location.pathname='/library/app/1';f();expect(r.get()).toBe('/library/app/1');expect(changed).toHaveBeenCalledOnce();off();off();expect(stop).toHaveBeenCalledOnce();});
it('has a safe unavailable route without a verified history',()=>{expect(routeSource(null).get()).toBeNull();expect(()=>routeSource(null).subscribe(()=>{})()).not.toThrow();});
