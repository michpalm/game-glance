interface Fiber {
 return?:Fiber|null;
 memoizedProps?:{instance?:unknown};
 stateNode?:{m_elInput?:unknown;m_iMenuInstance?:unknown};
}
function fibers(element:HTMLElement):Fiber[] {
 const key=Object.keys(element).find(name=>name.startsWith('__reactFiber'));
 let fiber=key?(element as unknown as Record<string,Fiber>)[key]:undefined;
 const result:Fiber[]=[];
 for(let depth=0;fiber&&depth<20;depth++,fiber=fiber.return??undefined)result.push(fiber);
 return result;
}
/** Steam can omit its aria-controls DOM target. Match the actual native menu
 * instance to its exact input instead; a changed native contract stays unstyled.
 * Read identity only: never call native handlers or inspect option values. */
export function nativePickerOwns(source:HTMLElement,popup:HTMLElement):boolean {
 try{
  const owner=fibers(source).find(f=>f.stateNode?.m_elInput===source&&f.stateNode.m_iMenuInstance);
  const instance=owner?.stateNode?.m_iMenuInstance;
  return !!instance&&fibers(popup).some(f=>f.memoizedProps?.instance===instance);
 }catch{return false;}
}
