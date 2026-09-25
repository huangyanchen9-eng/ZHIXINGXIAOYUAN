import type {FastifyInstance} from 'fastify';
import staticFiles from '@fastify/static';
type Hosting={staticRoot?:string;amapKey?:string;amapSecurityCode?:string;allowedOrigins:string[]};
const pages=new Set(['/','/login','/register','/schedule','/travel','/planner','/life','/meals','/health','/history','/growth','/assistant','/account','/settings','/password','/all']);
export async function registerHosting(app:FastifyInstance,options:Hosting){
 app.get('/runtime-config.js',async(_req,reply)=>reply.type('application/javascript').send('window.__CAMPUS_CONFIG__='+JSON.stringify({amapKey:options.amapKey??''}).replace(/</g,'\\u003c')+';'));
 app.get('/_AMapService/*',{config:{rateLimit:{max:120,timeWindow:'1 minute'}}},async(req,reply)=>{
  const incoming=new URL(req.url,'https://local.invalid');
  const path=incoming.pathname.replace(/^\/_AMapService/,'');
  if(!/^\/v[345]\/(place|direction|geocode)(\/|$)/.test(path)&&path!='/v3/ip')return reply.code(404).send({error:'不支持的地图接口'});
  if(!options.amapKey||!options.amapSecurityCode)return reply.code(503).send({error:'地图服务尚未配置'});
  let origin=req.headers.origin;
  try{origin??=req.headers.referer?new URL(req.headers.referer).origin:undefined}catch{}
  if(!origin||!options.allowedOrigins.includes(origin))return reply.code(403).send({error:'地图请求来源无效'});
  const callback=incoming.searchParams.get('callback');
  if(callback&&!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(callback))return reply.code(400).send({error:'回调格式无效'});
  const upstream=new URL('https://restapi.amap.com'+path);upstream.search=incoming.search;
  upstream.searchParams.set('key',options.amapKey);upstream.searchParams.set('jscode',options.amapSecurityCode);
  try{
   const result=await fetch(upstream,{redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!result.ok)return reply.code(502).send({error:'地图服务暂时不可用'});
   return reply.type(callback?'application/javascript':'application/json').send(await result.text());
  }catch{return reply.code(502).send({error:'地图服务连接失败，请重试'});}
 });
 await app.register(staticFiles,{root:options.staticRoot!,index:false,dotfiles:'deny'});
 app.setNotFoundHandler((req,reply)=>{
  if((req.method==='GET'||req.method==='HEAD')&&pages.has(req.url.split('?')[0]))return reply.sendFile('index.html');
  return reply.code(404).send({error:{code:'NOT_FOUND',message:'页面或接口不存在'}});
 });
}
