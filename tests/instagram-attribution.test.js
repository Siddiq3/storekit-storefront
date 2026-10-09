import { describe, expect, it } from 'vitest';
import { validInstagramRef, captureInstagramRef, readInstagramRef } from '../lib/instagram-attribution.js';
const a='a'.repeat(32);
describe('Instagram attribution reference safety',()=>{
  it('rejects malformed and unguessably short IDs',()=> {
    expect(validInstagramRef('hello')).toBe(false);
    expect(validInstagramRef('a'.repeat(31))).toBe(false);
    expect(validInstagramRef(a)).toBe(true);
  });
  it('expires browser attribution without using cookies or user identity',()=>{
    const cache=new Map();
    const storage={getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,v)};
    expect(captureInstagramRef(a,storage,0)).toBe(true);
    expect(readInstagramRef(storage,100)).toBe(a);
    expect(readInstagramRef(storage,8*86400000)).toBe(null);
  });
});
