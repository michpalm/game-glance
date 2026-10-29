const TAU=2*Math.PI;
const wrap=(n:number)=>((n%TAU)+TAU)%TAU;
/** Positive Y is up. The second segment is centred at twelve o'clock. */
export function selectRadial(previous:number|null,axis:{x:number;y:number},count:number):number|null {
 if(!Number.isInteger(count)||count<1||![axis.x,axis.y].every(Number.isFinite))return null;
 if(previous!==null&&(!Number.isInteger(previous)||previous<0||previous>=count))previous=null;
 const magnitude=Math.hypot(axis.x,axis.y);
 if(magnitude<=(previous===null?.45:.35))return null;
 const step=TAU/count,angle=wrap(Math.atan2(-axis.y,axis.x)+Math.PI/2+step);
 if(previous!==null){const distance=Math.abs(wrap(angle-previous*step+Math.PI)-Math.PI);if(distance<=step/2+Math.min(.04,.15*step))return previous;}
 return Math.floor(angle/step+.5)%count;
}
