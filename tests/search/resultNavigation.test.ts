import {it,expect} from 'vitest';
import {nextSearchResult} from '../../src/search/layout';
it('clamps navigation and returns to the field above the first result',()=>{expect(nextSearchResult(0,'up',3)).toBeNull();expect(nextSearchResult(2,'down',3)).toBe(2);expect(nextSearchResult(null,'down',3)).toBe(0);expect(nextSearchResult(0,'down',0)).toBeNull();});
