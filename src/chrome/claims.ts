export type ChromePage='home'|'game';
export interface ChromeClaim {page:ChromePage;statusHidden:boolean;launching:boolean;returnHome?():void}
export interface ChromeClaims {
    get():readonly ChromeClaim[];
    subscribe(listener:()=>void):()=>void;
    claim(value:ChromeClaim):{update(next:Partial<ChromeClaim>):void;release():void};
}
/** Pages register what they need from the shared chrome host; get() is stable between changes. */
export function createChromeClaims():ChromeClaims{
    let claims:readonly ChromeClaim[]=[];const listeners=new Set<()=>void>();
    const publish=(next:readonly ChromeClaim[])=>{claims=next;for(const fn of [...listeners])fn();};
    return {
        get:()=>claims,
        subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},
        claim(value){
            let current=value;publish([...claims,current]);
            return {
                update(next){const index=claims.indexOf(current);if(index<0)return;const updated={...current,...next};current=updated;publish(claims.map((item,i)=>i===index?updated:item));},
                release(){const index=claims.indexOf(current);if(index<0)return;publish(claims.filter((_,i)=>i!==index));},
            };
        },
    };
}
export const chromeClaims=createChromeClaims();
