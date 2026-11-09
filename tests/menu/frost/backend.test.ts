import { describe, expect, it, vi } from 'vitest';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@decky/api',()=>({callable:(name:string)=>(...args:unknown[])=>rpc(name,...args)}));
import { createFrostBridge } from '../../../src/menu/frost/backend';
describe('frost RPC transport',()=>{
    it('degrades rejected RPCs to glass and rejects malformed activation replies',async()=>{
        const bridge=createFrostBridge();rpc.mockRejectedValueOnce(Error('offline'));
        expect(await bridge.renew('token')).toBe(false);
        rpc.mockResolvedValueOnce({status:'active',token:undefined});
        expect((await bridge.activate('r','key',1,{} as never)).status).toBe('unavailable');
    });
});
