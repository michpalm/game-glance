import { callable } from '@decky/api';
import type { Activated, FrostBridge, FrostFrame, Prepared } from './types';

const prepare=callable<[string,FrostFrame],Prepared>('frost_prepare');
const activate=callable<[string,string,number,FrostFrame],Activated>('frost_activate');
const update=callable<[string,number,FrostFrame],boolean>('frost_update');
const renew=callable<[string],boolean>('frost_renew');
const release=callable<[string],void>('frost_release');
const cancel=callable<[string],void>('frost_cancel');
const unavailable={status:'unavailable',reason:'connection'} as const;
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9_:.-]{1,128}$/.test(v);
export function createFrostBridge():FrostBridge {
    return {
        async prepare(id,frame){try{const r=await prepare(id,frame);return r?.status==='ready'&&validId(r.key)?r:unavailable;}catch{return unavailable;}},
        async activate(id,key,sequence,frame){try{const r=await activate(id,key,sequence,frame);return r?.status==='active'&&validId(r.token)?r:unavailable;}catch{return unavailable;}},
        async update(token,sequence,frame){try{return await update(token,sequence,frame)===true;}catch{return false;}},
        async renew(token){try{return await renew(token)===true;}catch{return false;}},
        async release(token){try{await release(token);}catch{/* Worker watchdog bounds a lost reply. */}},
        async cancel(id){try{await cancel(id);}catch{/* Stale generations cannot acquire a frontend heartbeat. */}},
    };
}
