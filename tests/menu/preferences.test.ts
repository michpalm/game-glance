import { describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createMenuPreferences } from '../../src/menu/preferences';

const defaults=['navigate','quick-settings','performance','social'];
describe('menu preferences', () => {
    it('starts disabled and persists choices independently of master settings',async()=>{
        const kv=memoryKv(),store=createMenuPreferences(kv);await store.load();
        expect(store.get()).toEqual({version:1,enabled:false,pins:defaults});
        const listener=vi.fn();store.subscribe(listener);
        await store.setEnabled(true);await store.setPins(['plugins']);
        const reload=createMenuPreferences(kv);await reload.load();
        expect(reload.get()).toEqual({version:1,enabled:true,pins:['plugins']});
        expect(await kv.get('settings')).toBeNull();expect(listener).toHaveBeenCalledTimes(2);
    });
    it.each([null,'invalid',{pins:[]},{pins:['unknown']},{pins:['in-game','more']}])('repairs missing or corrupt pins %j',async raw=>{
        const kv=memoryKv();await kv.set('menu:preferences',raw);const store=createMenuPreferences(kv);await store.load();
        expect(store.get()).toEqual({version:1,enabled:false,pins:defaults});
    });
    it('removes invalid/duplicate choices and retains the first four valid old pins',async()=>{
        const kv=memoryKv();await kv.set('menu:preferences',{enabled:true,pins:['social','social','bad','help','plugins','navigate','performance']});
        const store=createMenuPreferences(kv);await store.load();
        expect(store.get().pins).toEqual(['social','help','plugins','navigate']);
    });
    it('migrates old mock numeric bar IDs without pinning More or In game',async()=>{
        const kv=memoryKv();await kv.set('menu:preferences',{barMenus:[8,0,1,2,3,4,5]});const store=createMenuPreferences(kv);await store.load();
        expect(store.get().pins).toEqual(defaults);
    });
    it('rejects invalid interactive selections without saving or emitting',async()=>{
        const kv=memoryKv(),store=createMenuPreferences(kv);await store.load();const listener=vi.fn();store.subscribe(listener);
        await expect(store.setPins([])).rejects.toThrow();
        await expect(store.setPins(['navigate','quick-settings','performance','social','plugins'])).rejects.toThrow();
        await expect(store.setPins(['navigate','navigate'])).rejects.toThrow();
        expect(store.get().pins).toEqual(defaults);expect(listener).not.toHaveBeenCalled();expect(await kv.get('menu:preferences')).toBeNull();
    });
    it('preserves a newer schema without enabling or overwriting it',async()=>{
        const kv=memoryKv(),raw={version:9,enabled:true,pins:['plugins'],future:'keep'};await kv.set('menu:preferences',raw);
        const store=createMenuPreferences(kv);await store.load();expect(store.get().enabled).toBe(false);
        await expect(store.setEnabled(true)).rejects.toThrow();expect(await kv.get('menu:preferences')).toEqual(raw);
    });
    it('serializes persistence snapshots so a slow first write cannot replace a later choice',async()=>{
        const kv=memoryKv();let release!:()=>void;const gate=new Promise<void>(r=>release=r);let count=0;
        const set=kv.set;kv.set=async(k,v)=>{if(++count===1)await gate;await set(k,v);};
        const store=createMenuPreferences(kv);await store.load();
        const first=store.setEnabled(true),second=store.setPins(['plugins']);release();await Promise.all([first,second]);
        expect(await kv.get('menu:preferences')).toEqual({version:1,enabled:true,pins:['plugins']});
    });
    it('does not lose later saves after a rejected write or expose mutable snapshots',async()=>{
        const kv=memoryKv(),set=kv.set;let reject=true;kv.set=async(k,v)=>{if(reject){reject=false;throw Error('disk full');}await set(k,v);};
        const store=createMenuPreferences(kv);await store.load();await expect(store.setEnabled(true)).rejects.toThrow('disk full');
        await store.setPins(['help']);expect(await kv.get('menu:preferences')).toEqual({version:1,enabled:true,pins:['help']});
        expect(()=>{(store.get().pins as string[]).push('plugins');}).toThrow();
    });
});
