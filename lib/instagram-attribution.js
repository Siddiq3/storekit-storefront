/** Only an opaque, server-issued reference is persisted. No Instagram user or comment IDs. */
const KEY='storekit.instagram.ref.v1';
const TTL_MS=7*24*60*60*1000;
export const validInstagramRef=(v)=>typeof v==='string'&&/^[A-Za-z0-9_-]{32}$/.test(v);
export const readInstagramRef=(storage=null,now=Date.now())=>{
  try {
    const target=storage??globalThis.localStorage;
    const record=JSON.parse(target.getItem(KEY)??'null');
    if(record&&validInstagramRef(record.ref)&&Number.isSafeInteger(record.at)&&
       record.at<=now&&now-record.at<TTL_MS)return record.ref;
  }catch{/* Storage might be disabled */ }
  return null;
};
export const captureInstagramRef=(ref,storage=null,now=Date.now())=>{
  if(!validInstagramRef(ref))return false;
  try{(storage??globalThis.localStorage).setItem(KEY,JSON.stringify({ref,at:now}));return true;}
  catch{return false;}
};
