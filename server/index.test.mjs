import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { createCanonicalGateway, CANONICAL_TABLES } from './index.mjs';

const tables=Object.fromEntries(CANONICAL_TABLES.map(t=>[t,[]]));
async function withServer(options,fn) {
  const srv=createCanonicalGateway(options);
  srv.listen(0,'127.0.0.1');
  await once(srv,'listening');
  try {return await fn('http://127.0.0.1:'+srv.address().port);}
  finally { await new Promise((resolve,reject)=>srv.close(e=>e?reject(e):resolve()));}
}
test('reads all existing domain entities with bearer token on backend only',async()=>{
 const calls=[];
 const fakeFetch=async(url,options)=>{
   calls.push({url,auth:options.headers.authorization});
   const name=url.split('/').at(-1);
   return {status:200,json:async()=>tables[name]};
 };
 await withServer({upstream:'http://127.0.0.1:9999',token:'local-device-secret',fetchImpl:fakeFetch},async base=>{
   const response=await fetch(base+'/api/canonical/snapshot');
   assert.equal(response.status,200);
   assert.deepEqual(await response.json(),tables);
   assert.equal(calls.length,CANONICAL_TABLES.length);
   assert(calls.every(c=>c.auth==='Bearer local-device-secret'));
   assert(!JSON.stringify(await response.headers.entries?.()||[]).includes('local-device-secret'));
 });
});
test('refuses compound medical measurements mutation through generic table API',async()=>{
 await withServer({upstream:'http://127.0.0.1:9999',token:'secret',fetchImpl:()=>{throw Error('should not call remote')}},async base=>{
  const result=await fetch(base+'/api/canonical/medicoes/1',{method:'DELETE'});
  assert.equal(result.status,405);
 });
});
test('rejects writing without an expected revision instead of overwriting concurrent edits',async()=>{
 await withServer({upstream:'http://127.0.0.1:9999',token:'secret',fetchImpl:()=>{throw Error('should not call remote')}},async base=>{
  const result=await fetch(base+'/api/canonical/contas/7',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({data:{valor_centavos:1200}})});
  assert.equal(result.status,400);
 });
});
test('fails closed when LAN access not configured; never serves demo data as real records',async()=>{
 await withServer({upstream:'',token:''},async base=>{
  const result=await fetch(base+'/api/canonical/snapshot');
  assert.equal(result.status,503);
 });
});
test('fails entire snapshot if even one canonical table is unavailable',async()=>{
 const fakeFetch=async(url)=>({status:url.endsWith('contas')?403:200,json:async()=>[]});
 await withServer({upstream:'http://127.0.0.1:9999',token:'secret',fetchImpl:fakeFetch},async base=>{
  const result=await fetch(base+'/api/canonical/snapshot');
  assert.equal(result.status,502);
  assert.equal((await result.json()).table,'contas');
 });
});
