import { z } from 'zod';
import { handleStorePost } from '@/lib/bff.js';
import { apiFetch } from '@/lib/api.js';

const schema=z.object({
  ref:z.string().regex(/^[A-Za-z0-9_-]{32}$/),
  visitorId:z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
}).strict();
export const POST=(request)=>handleStorePost(request,{
  schema,
  run:async(input,ctx)=>{
    const response=await apiFetch(`/public/stores/${ctx.slug}/instagram/visit`,{
      method:'POST',body:input,ip:ctx.ip
    });
    return response.data;
  },
});
