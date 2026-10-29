export type WheelBounds={left:number;top:number;diameter:number};
type Rect={left:number;top:number;width:number;height:number};
export function radialBounds(view:{width:number;height:number},field:Rect):[WheelBounds,WheelBounds]|null {
 if(![view.width,view.height,...Object.values(field)].every(Number.isFinite)||view.width<=0||view.height<=0)return null;
 const max=Math.min(280,Math.max(160,.18*view.width),view.height-54,(view.width-36)/2);
 const intersects=(b:WheelBounds)=>b.left<field.left+field.width&&b.left+b.diameter>field.left&&b.top<field.top+field.height&&b.top+b.diameter>field.top;
 for(let diameter=Math.floor(max);diameter>=120;diameter--){
  const top=view.height-42-diameter;
  const pair:[WheelBounds,WheelBounds]=[{left:12,top,diameter},{left:view.width-12-diameter,top,diameter}];
  if(pair.every(b=>!intersects(b)))return pair;
 }
 return null;
}
