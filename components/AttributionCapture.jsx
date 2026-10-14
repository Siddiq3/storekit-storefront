'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureInstagramRef, validInstagramRef } from '@/lib/instagram-attribution.js';
import { postJson } from '@/lib/client-api.js';

const id=()=>{
  const bytes=new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
};
/** Observed storefront arrival (not an Instagram click). Does not block rendering or checkout. */
export function AttributionCapture() {
  const pathname=usePathname();
  useEffect(()=>{
    if(typeof window==='undefined'||!pathname.startsWith('/products/'))return;
    const ref=new URLSearchParams(window.location.search).get('sk_ig');
    if(!validInstagramRef(ref))return;
    captureInstagramRef(ref);
    let visitorId;
    try {
      visitorId=sessionStorage.getItem('storekit.ig.visitor.v1');
      if(!visitorId||!/^[a-f0-9]{32}$/.test(visitorId)){
        visitorId=id();sessionStorage.setItem('storekit.ig.visitor.v1',visitorId);
      }
    }catch{visitorId=id();}
    void postJson('/api/instagram/visit',{ref,visitorId}).catch(()=>null);
  },[pathname]);
  return null;
}
