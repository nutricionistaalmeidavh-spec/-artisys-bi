import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANONICAL_TABLES=Object.freeze([
  'obras','frentes_obra','itens_orcamentarios','cronograma_etapas','contas',
  'categorias_financeiras','medicoes','rdos','rdo_equipamentos','tarefas_obra'
]);
export const MUTABLE_TABLES=new Set([
  'obras','frentes_obra','itens_orcamentarios','cronograma_etapas','contas','rdos','rdo_equipamentos','tarefas_obra'
]);
const json=(res,status,payload)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(payload));};
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif','.ico':'image/x-icon','.woff2':'font/woff2'};
const HOST_ALLOW=new Set(['localhost','127.0.0.1','[::1]']);
export function createCanonicalGateway({upstream=process.env.OBRA_LAN_API_URL,token=process.env.OBRA_LAN_DEVICE_TOKEN,root=resolve(fileURLToPath(new URL('../dist/',import.meta.url))),fetchImpl=fetch}={}) {
  const endpoint=upstream?.replace(/\/$/,'') || '';
  if(endpoint && !/^https?:\/\//.test(endpoint))throw new Error('OBRA_LAN_API_URL deve ser uma URL HTTP(S) válida.');
  const connected=!!endpoint && !!token;
  const remote=async(table,method='GET',id=null,payload=null,query='')=>{
    const ctrl=new AbortController();
    const timeout=setTimeout(()=>ctrl.abort(),12000);
    try {
      const url=`${endpoint}/api/v1/${table}${id!==null?'/'+id:''}${query}`;
      const response=await fetchImpl(url,{method,signal:ctrl.signal,
        headers:{authorization:`Bearer ${token}`,accept:'application/json',
          ...(payload!==null?{'content-type':'application/json'}:{})},
        ...(payload!==null?{body:JSON.stringify(payload)}:{})});
      const data=await response.json().catch(()=>({error:'invalid_upstream_response'}));
      return {status:response.status,data};
    } finally{clearTimeout(timeout);}
  };
  return http.createServer(async(req,res)=>{
    const host=String(req.headers.host||'').replace(/:\d+$/,'').toLowerCase();
    if(!HOST_ALLOW.has(host))return json(res,403,{error:'localhost_only'});
    const url=new URL(req.url||'/',`http://${req.headers.host}`);
    if(url.pathname.startsWith('/api/canonical/')){
      if(!connected)return json(res,503,{error:'unconfigured',message:'Configure OBRA_LAN_API_URL e OBRA_LAN_DEVICE_TOKEN no processo local. A demo do GitHub Pages permanece fictícia.'});
      const origin=req.headers.origin;
      if(origin && new URL(origin).host!==req.headers.host)return json(res,403,{error:'cross_origin_rejected'});
      if(url.pathname==='/api/canonical/snapshot'&&req.method==='GET'){
        try {
          const result=await Promise.all(CANONICAL_TABLES.map(t=>remote(t)));
          const bad=result.findIndex(r=>r.status!==200||!Array.isArray(r.data));
          if(bad!==-1)return json(res,502,{error:'canonical_unavailable',table:CANONICAL_TABLES[bad],status:result[bad].status,message:'Falha no domínio canônico. Nenhuma amostra será usada no lugar dos dados reais.'});
          return json(res,200,Object.fromEntries(CANONICAL_TABLES.map((t,i)=>[t,result[i].data])));
        }catch(error){return json(res,502,{error:'canonical_connection_failed',message:String(error.message||error)})}
      }
      const match=url.pathname.match(/^\/api\/canonical\/([a-z_]+)(?:\/(\d+))?\/?$/);
      if(!match||!CANONICAL_TABLES.includes(match[1]))return json(res,404,{error:'unknown_domain'});
      const [,table,id]=match;
      if(!['GET','POST','PUT','DELETE'].includes(req.method||''))return json(res,405,{error:'method_not_allowed'});
      if(req.method!=='GET'&&!MUTABLE_TABLES.has(table))return json(res,405,{error:'requires_canonical_domain_service',message:'Use o serviço transacional de medições/contratos, não edição genérica.'});
      if(req.method==='POST'&&id||['PUT','DELETE'].includes(req.method)&&!id)return json(res,405,{error:'invalid_entity_method'});
      let payload=null;
      if(req.method==='POST'||req.method==='PUT'){
        if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'json_required'});
        let body='';for await(const chunk of req){body+=chunk;if(body.length>1024*1024)return json(res,413,{error:'payload_too_large'});}
        try{payload=JSON.parse(body);}catch{return json(res,400,{error:'invalid_json'});}
        if(req.method==='PUT' && (!Number.isSafeInteger(payload?.expectedRevision)||!payload?.data))
          return json(res,400,{error:'revision_required'});
      }
      try{
        const reply=await remote(table,req.method,id||null,payload,req.method==='DELETE'?url.search:'');
        return json(res,reply.status,reply.data);
      }catch(error){return json(res,502,{error:'canonical_connection_failed',message:String(error.message||error)})}
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'method_not_allowed'});
    const clean=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);
    const target=resolve(root,'.'+clean);
    if(!target.startsWith(root+sep)&&target!==resolve(root,'index.html'))return json(res,403,{error:'invalid_path'});
    try{
      const info=await stat(target);
      if(!info.isFile())throw new Error('not file');
      const data=await readFile(target);
      res.writeHead(200,{'content-type':MIME[extname(target)]||'application/octet-stream','content-length':data.length,'x-content-type-options':'nosniff'});
      if(req.method==='HEAD')res.end();else res.end(data);
    }catch{return json(res,404,{error:'not_found'});}
  });
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||4175);
  createCanonicalGateway().listen(port,'127.0.0.1',()=>{
    console.log(`ArtiSys BI: http://127.0.0.1:${port} | fonte ${process.env.OBRA_LAN_API_URL?'configurada':'não configurada'}`);
  });
}
