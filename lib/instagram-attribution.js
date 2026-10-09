/** Only an opaque, server-issued reference is persisted. No Instagram user or comment IDs. */
const KEY='storekit.instagram.ref.v1';
const TTL_MS=7*24*60*60*1000;
export const validInstagramRef=(v)=>typeof v==='string'&&/^[A-Za-z0-9_-]{32}$/.test(v);
export const readInstagramRef=(storage=globalThis.localStorage,now=Date.now())=>{
  try {
    const record=JSON.parse(storage.getItem(KEY)??'null');
    if(record&&validInstagramRef(record.ref)&&Number.isSafeInteger(record.at)&&
       record.at<=now&&now-record.at<TTL_MS)return record.ref;
  }catch{/* Storage might be disabled */ }
  return null;
};
export const captureInstagramRef=(ref,storage=globalThis.localStorage,now=Date.now())=>{
  if(!validInstagramRef(ref))return false;
  try{storage.setItem(KEY,JSON.stringify({ref,at:now}));return true;}
  catch{return false;}
};
