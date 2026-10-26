import http from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {makeTicketId,formatTelegramMessage,validateSubmission} from './src/tickets.mjs';
import {createStore,validateTexts,validateProject,validatePerson,validateBranding,STATUS,TEXT_FIELDS} from './src/cms.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PUBLIC=path.join(ROOT,'public');
const envFile=path.join(ROOT,'.env');
if(existsSync(envFile)){
  for(const row of readFileSync(envFile,'utf8').split(/\r?\n/)){
    const match=row.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if(!match||Object.hasOwn(process.env,match[1]))continue;
    let val=match[2].trim();if((val.startsWith('"')&&val.endsWith('"'))||(val.startsWith("'")&&val.endsWith("'")))val=val.slice(1,-1);
    process.env[match[1]]=val;
  }
}
const PORT=Number(process.env.PORT||3000);
const DATA_DIR=path.resolve(ROOT,process.env.DATA_DIR||'data');
const store=createStore(DATA_DIR);
const mime=new Map([['.html','text/html; charset=utf-8'],['.css','text/css; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.svg','image/svg+xml'],['.png','image/png'],['.jpg','image/jpeg'],['.webp','image/webp'],['.ico','image/x-icon']]);
const SAFE_FILES=new Set(['index.html','team.html','styles.css','content.js','main.js','profile.js','theme.js','theme-preload.js','favicon.svg','admin.html','admin.css','admin.js','cms-public.js']);
const hits=new Map(),loginHits=new Map();
const sessions=new Map();
const sessionTTL=12*60*60*1000;
const password=process.env.ADMIN_PASSWORD||'';
const adminEnabled=password.length>=12;
const salt=randomBytes(24);
const passwordHash=adminEnabled?scryptSync(password,salt,64):null;
const secureCookie=process.env.COOKIE_SECURE==='true';
const COOKIE='ntlab_session';

function sendJSON(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function sendError(res,e){if((e.status||500)>=500)console.error('Request error:',e?.message||e);sendJSON(res,e.status||500,{error:e.status?e.message:'خطای داخلی سرور. لطفاً دوباره تلاش کنید.'});}
function error(message,status=400){const e=new Error(message);e.status=status;throw e;}
function rateAllowed(map,key,max,windowMS){const now=Date.now();if(map.size>2500){for(const [k,v] of map)if(v.expires<now)map.delete(k);}let slot=map.get(key);if(!slot||slot.expires<now){slot={count:0,expires:now+windowMS};map.set(key,slot);}if(slot.count>=max)return false;slot.count++;return true;}
async function readBody(req,maxBytes=100_000){const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>maxBytes)error('حجم درخواست بیشتر از حد مجاز است.',413);chunks.push(chunk);}return Buffer.concat(chunks);}
async function parseJSONBody(req,max=100_000){if(!req.headers['content-type']?.includes('application/json'))error('نوع محتوا باید JSON باشد.',415);let data;try{data=JSON.parse((await readBody(req,max)).toString('utf8'));}catch(e){if(e.status)throw e;error('فرمت JSON نامعتبر است.');}return data;}
function sameOrigin(req){const origin=req.headers.origin;if(origin){try{if(new URL(origin).host!==req.headers.host)return false;}catch{return false;}}return req.headers['sec-fetch-site']!=='cross-site';}
function clientIP(req){return req.socket.remoteAddress||'unknown';}
function verifyPassword(guess){if(typeof guess!=='string'||!adminEnabled)return false;const hash=scryptSync(guess.slice(0,500),salt,64);return timingSafeEqual(hash,passwordHash);}
function getSession(req){const cookies=(req.headers.cookie||'').split(';').map(x=>x.trim());const raw=cookies.find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';if(!/^[a-f\d]{64}$/.test(raw))return null;const session=sessions.get(raw);if(!session)return null;if(session.expires<Date.now()){sessions.delete(raw);return null;}return {id:raw,...session};}
function requireSession(req){if(!adminEnabled)error('برای فعال‌سازی پنل، ADMIN_PASSWORD را در فایل .env تعریف کنید.',503);const session=getSession(req);if(!session)error('برای ادامه وارد حساب مدیریت شوید.',401);return session;}
function requireWrite(req){const session=requireSession(req);if(!sameOrigin(req))error('مبدأ درخواست مجاز نیست.',403);const token=req.headers['x-csrf-token'];if(typeof token!=='string'||token.length!==64||!timingSafeEqual(Buffer.from(token),Buffer.from(session.csrf)))error('نشست امن نامعتبر است؛ صفحه را تازه‌سازی کنید.',403);return session;}
function cookie(id,maxAge){return `${COOKIE}=${id}; HttpOnly; Path=/api/admin; SameSite=Strict; Max-Age=${maxAge}${secureCookie?'; Secure':''}`;}
async function notification(ticketId,data){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 const chats=(process.env.TELEGRAM_CHAT_IDS||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(!token||token==='your_bot_token_here'||!chats.length)return {state:'not_configured'};
 const msg=formatTelegramMessage(ticketId,data);
 const results=await Promise.allSettled(chats.map(async chat_id=>{
  const result=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id,text:msg,parse_mode:'HTML',disable_web_page_preview:true}),signal:AbortSignal.timeout(9000)});
  const response=await result.json().catch(()=>({}));if(!result.ok||!response.ok)throw Error(`Telegram HTTP ${result.status}`);return true;
 }));
 const sent=results.filter(x=>x.status==='fulfilled').length;
 if(!sent)console.warn(`Telegram notification failed for ticket ${ticketId}. Ticket is still saved.`);
 return {state:sent===chats.length?'sent':sent>0?'partial':'failed'};
}
async function postProject(req,res){
 if(!sameOrigin(req))error('درخواست مجاز نیست.',403);
 if(!rateAllowed(hits,clientIP(req),5,3600_000))error('تعداد درخواست‌ها زیاد است. لطفاً بعداً تلاش کنید.',429);
 const payload=await parseJSONBody(req,12_000);
 const check=validateSubmission(payload);
 if(!check.ok){if(check.spam)return sendJSON(res,200,{ticketId:makeTicketId(),message:'دریافت شد.'});error(check.error);}
 const ticketId=makeTicketId();const now=new Date().toISOString();
 await store.update(s=>s.tickets.unshift({id:ticketId,...check.data,status:'new',notes:'',telegram:'pending',createdAt:now,updatedAt:now}));
 const notice=await notification(ticketId,check.data);
 await store.update(s=>{const t=s.tickets.find(t=>t.id===ticketId);if(t)t.telegram=notice.state;});
 sendJSON(res,201,{ticketId,message:'درخواست شما ثبت و برای بررسی به تیم ارسال شد.'});
}
async function adminAPI(req,res,pathname){
 if(pathname==='/api/admin/session'){
  if(req.method==='GET'){
   if(!adminEnabled)return sendJSON(res,200,{configured:false,authenticated:false});
   const session=getSession(req);return sendJSON(res,200,{configured:true,authenticated:!!session,csrf:session?.csrf||null});
  }
  if(req.method==='POST'){
   if(!sameOrigin(req))error('درخواست مجاز نیست.',403);
   if(!adminEnabled)error('ابتدا ADMIN_PASSWORD با حداقل ۱۲ کاراکتر را در .env تنظیم کنید.',503);
   if(!rateAllowed(loginHits,clientIP(req),8,15*60_000))error('تلاش ناموفق زیاد بوده است. ۱۵ دقیقه بعد دوباره امتحان کنید.',429);
   const body=await parseJSONBody(req,2500);
   if(!verifyPassword(body?.password))error('رمز عبور اشتباه است.',401);
   loginHits.delete(clientIP(req));
   const id=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
   sessions.set(id,{csrf,expires:Date.now()+sessionTTL});
   res.setHeader('Set-Cookie',cookie(id,Math.floor(sessionTTL/1000)));
   return sendJSON(res,200,{authenticated:true,csrf});
  }
  if(req.method==='DELETE'){const sess=requireWrite(req);sessions.delete(sess.id);res.setHeader('Set-Cookie',cookie('',0));return sendJSON(res,200,{ok:true});}
  error('متد مجاز نیست.',405);
 }
 const session=requireSession(req);
 if(req.method!=='GET')requireWrite(req);
 if(pathname==='/api/admin/dashboard'&&req.method==='GET'){
  const s=await store.get();return sendJSON(res,200,{tickets:s.tickets.length,newTickets:s.tickets.filter(t=>t.status==='new').length,inProgress:s.tickets.filter(t=>t.status==='in_progress'||t.status==='reviewing').length,projects:s.projects.length,latest:s.tickets.slice(0,5)});
 }
 if(pathname==='/api/admin/tickets'&&req.method==='GET'){
  const s=await store.get();return sendJSON(res,200,{tickets:s.tickets});
 }
 const ticketMatch=pathname.match(/^\/api\/admin\/tickets\/(NT-[A-Z0-9-]+)$/);
 if(ticketMatch&&req.method==='PATCH'){
  const body=await parseJSONBody(req,5000);if(!STATUS.includes(body?.status))error('وضعیت نامعتبر است.');if(typeof body.notes!=='string'||body.notes.length>3000)error('یادداشت باید حداکثر ۳۰۰۰ کاراکتر باشد.');
  const ticket=await store.update(s=>{const t=s.tickets.find(t=>t.id===ticketMatch[1]);if(!t)error('تیکت یافت نشد.',404);t.status=body.status;t.notes=body.notes.trim();t.updatedAt=new Date().toISOString();return structuredClone(t);});
  return sendJSON(res,200,{ticket});
 }
 if(pathname==='/api/admin/content'&&req.method==='GET'){
  const s=await store.get();return sendJSON(res,200,{texts:s.texts,team:s.team,projects:s.projects,branding:s.branding,fieldLabels:TEXT_FIELDS,updatedAt:s.updatedAt});
 }
 if(pathname==='/api/admin/branding'&&req.method==='PUT'){
  const branding=validateBranding(await parseJSONBody(req,2000));await store.update(s=>{s.branding=branding;});return sendJSON(res,200,{branding});
 }
 if(pathname==='/api/admin/texts'&&req.method==='PUT'){
  const texts=validateTexts(await parseJSONBody(req,65_000));await store.update(s=>{s.texts=texts;});return sendJSON(res,200,{ok:true});
 }
 const teamMatch=pathname.match(/^\/api\/admin\/team\/(nima|behrooz)$/);
 if(teamMatch&&req.method==='PUT'){
  const person=validatePerson(await parseJSONBody(req,65_000),teamMatch[1]);
  await store.update(s=>{const i=s.team.findIndex(p=>p.slug===person.slug);if(i<0)error('عضو تیم پیدا نشد.',404);s.team[i]=person;});
  return sendJSON(res,200,{person});
 }
 if(pathname==='/api/admin/projects'&&req.method==='POST'){
  const project=validateProject(await parseJSONBody(req,32_000));
  await store.update(s=>{project.number=String(Math.max(0,...s.projects.map(p=>Number.parseInt(p.number,10)||0))+1).padStart(2,'0');s.projects.unshift(project);});return sendJSON(res,201,{project});
 }
 const projectMatch=pathname.match(/^\/api\/admin\/projects\/([a-z0-9-]+)$/);
 if(projectMatch&&(req.method==='PUT'||req.method==='DELETE')){
  const id=projectMatch[1];
  if(req.method==='DELETE'){await store.update(s=>{const n=s.projects.findIndex(p=>p.id===id);if(n<0)error('پروژه یافت نشد.',404);s.projects.splice(n,1);});return sendJSON(res,200,{ok:true});}
  const project=validateProject(await parseJSONBody(req,32_000),id);
  await store.update(s=>{const n=s.projects.findIndex(p=>p.id===id);if(n<0)error('پروژه یافت نشد.',404);project.number=s.projects[n].number;s.projects[n]=project;});return sendJSON(res,200,{project});
 }
 if(pathname==='/api/admin/upload'&&req.method==='POST'){
  const type=(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
  if(!types[type])error('فقط تصویر PNG، JPG یا WebP مجاز است.',415);
  const bytes=await readBody(req,4*1024*1024);
  if(bytes.length<16)error('فایل تصویر معتبر نیست.');
  const isPNG=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isJPG=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const isWEBP=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!(type==='image/png'&&isPNG||type==='image/jpeg'&&isJPG||type==='image/webp'&&isWEBP))error('محتوای فایل با نوع تصویر مطابقت ندارد.');
  const fname=`${randomBytes(12).toString('hex')}.${types[type]}`;
  await mkdir(path.join(DATA_DIR,'uploads'),{recursive:true});await writeFile(path.join(DATA_DIR,'uploads',fname),bytes,{flag:'wx',mode:0o600});
  return sendJSON(res,201,{url:`/media/${fname}`});
 }
 error('مسیر مدیریتی پیدا نشد.',404);
}
async function staticFile(req,res,pathname){
 let file=pathname==='/'?'index.html':/^\/team\/(nima|behrooz)\/?$/.test(pathname)?'team.html':pathname==='/admin'?'admin.html':pathname.replace(/^\//,'');
 let full;
 if(pathname.startsWith('/media/')){
  const match=pathname.match(/^\/media\/([a-f0-9]{24}\.(png|jpg|webp))$/);
  if(!match)error('فایل یافت نشد.',404);
  full=path.join(DATA_DIR,'uploads',match[1]);file=match[1];
 }else{
  if(!SAFE_FILES.has(file))error('صفحه پیدا نشد.',404);
  full=path.join(PUBLIC,file);
 }
 try{const info=await stat(full);res.writeHead(200,{'Content-Type':mime.get(path.extname(file))||'application/octet-stream','Content-Length':info.size,'Cache-Control':file.endsWith('.html')?'no-cache':'public,max-age=300'});if(req.method==='HEAD')return res.end();res.end(await readFile(full));}catch(e){if(e.status)throw e;error('صفحه یا فایل پیدا نشد.',404);}
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return sendJSON(res,400,{error:'مسیر نامعتبر است.'});}
 try{
  if(pathname==='/api/projects'){if(req.method!=='POST')error('متد مجاز نیست.',405);return await postProject(req,res);}
  if(pathname==='/api/content'){if(req.method!=='GET')error('متد مجاز نیست.',405);const s=await store.get();return sendJSON(res,200,{texts:s.texts,team:s.team,projects:s.projects,branding:s.branding});}
  if(pathname.startsWith('/api/admin/'))return await adminAPI(req,res,pathname);
  if(!['GET','HEAD'].includes(req.method))error('متد مجاز نیست.',405);
  return await staticFile(req,res,pathname);
 }catch(e){return sendError(res,e);}
});
server.listen(PORT,()=>console.log(`N&T Lab: http://localhost:${PORT} | Admin: http://localhost:${PORT}/admin`));
