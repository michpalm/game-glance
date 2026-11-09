/** Decky's UI routing IDs: 13/14 are Select/Start; the two stick clicks are 15/16. */
const CONTROLS=new Set([1,2,3,4,5,6,7,8,9,10,11,12,15,16]);
export const isRadialControl=(button:number):boolean=>CONTROLS.has(button);
