import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {team as seedTeam,projects as seedProjects} from '../public/content.js';

export const TEXT_FIELDS = Object.freeze({
  hero_heading_first:'عنوان اصلی — خط اول',hero_heading_second:'عنوان اصلی — خط دوم',
  hero_description:'توضیح اصلی ابتدای صفحه',
  intro_first:'درباره ما — جمله اول',intro_second:'درباره ما — جمله تأکیدی',
  services_heading_first:'عنوان تخصص‌ها — خط اول',services_heading_second:'عنوان تخصص‌ها — خط دوم',services_lead:'توضیح بخش تخصص‌ها',
  service_1_title:'تخصص اول — عنوان',service_1_body:'تخصص اول — توضیح',
  service_2_title:'تخصص دوم — عنوان',service_2_body:'تخصص دوم — توضیح',
  service_3_title:'تخصص سوم — عنوان',service_3_body:'تخصص سوم — توضیح',
  service_4_title:'تخصص چهارم — عنوان',service_4_body:'تخصص چهارم — توضیح',
  projects_heading_first:'عنوان پروژه‌ها — خط اول',projects_heading_second:'عنوان پروژه‌ها — خط دوم',projects_lead:'معرفی پروژه‌ها',
  team_heading_first:'عنوان تیم — خط اول',team_heading_second:'عنوان تیم — خط دوم',team_lead:'معرفی تیم',
  process_heading_first:'عنوان روند همکاری — خط اول',process_heading_second:'عنوان روند همکاری — خط دوم',process_lead:'توضیح مراحل همکاری',
  process_1_title:'مرحله اول — عنوان',process_1_body:'مرحله اول — توضیح',
  process_2_title:'مرحله دوم — عنوان',process_2_body:'مرحله دوم — توضیح',
  process_3_title:'مرحله سوم — عنوان',process_3_body:'مرحله سوم — توضیح',
  process_4_title:'مرحله چهارم — عنوان',process_4_body:'مرحله چهارم — توضیح',
  contact_heading_first:'عنوان ثبت درخواست — خط اول',contact_heading_second:'عنوان ثبت درخواست — خط دوم',contact_lead:'توضیح فرم درخواست',footer_line:'جمله معرفی پایین سایت'
});
export const DEFAULT_TEXTS = Object.freeze({
  hero_heading_first:'فکرهای بزرگ،',hero_heading_second:'اجرای دقیق',
  hero_description:'از هوش مصنوعی و رباتیک تا تحلیل و بهینه‌سازی سیستم‌های قدرت؛ ما دانش پژوهشی را به راه‌حل‌هایی تبدیل می‌کنیم که در دنیای واقعی معنا دارند.',
  intro_first:'ما فقط درباره تکنولوژی حرف نمی‌زنیم؛',intro_second:'مسئله را می‌فهمیم، راه‌حل را طراحی می‌کنیم و برای اجرا همراه می‌شویم.',
  services_heading_first:'تخصص‌هایی برای',services_heading_second:'حل مسئله‌های واقعی.',services_lead:'هر پروژه نقطه شروع متفاوتی دارد. ما تخصص‌های مکمل را کنار هم می‌گذاریم تا مسیر رسیدن از ایده به نتیجه، روشن‌تر شود.',
  service_1_title:'هوش مصنوعی و یادگیری ماشین',service_1_body:'توسعه راهکارهای مبتنی بر داده، مدل‌های یادگیری عمیق، پردازش سیگنال و تحلیل هوشمند.',
  service_2_title:'رباتیک و سیستم‌های هوشمند',service_2_body:'طراحی و پیاده‌سازی اجزای هوشمند سامانه‌های رباتیکی، از نمونه‌سازی تا توسعه الگوریتم.',
  service_3_title:'سیستم‌های قدرت و انرژی',service_3_body:'مدل‌سازی، شبیه‌سازی، حفاظت و بهینه‌سازی شبکه‌های برق با ابزارهای تخصصی مهندسی.',
  service_4_title:'نرم‌افزار و ابزارهای مهندسی',service_4_body:'ساخت ابزارهای محاسباتی و نرم‌افزارهای اختصاصی برای تحلیل، پردازش داده و اتوماسیون مهندسی.',
  projects_heading_first:'کارها، بهتر از',projects_heading_second:'حرف‌ها می‌گویند.',projects_lead:'نمونه‌هایی از فعالیت‌های مهندسی، پژوهشی و تیمی که می‌توان منشأ آن‌ها را بررسی کرد.',
  team_heading_first:'دو نگاه متفاوت.',team_heading_second:'یک هدف مشترک.',team_lead:'ترکیب انرژی توسعه و عمق پژوهش؛ از الگوریتم و برنامه‌نویسی تا تحلیل تخصصی مهندسی.',
  process_heading_first:'مسیر ساده‌ای از',process_heading_second:'ایده تا اجرا.',process_lead:'شفاف، مرحله‌به‌مرحله و بدون پیچیدگی غیرضروری.',
  process_1_title:'درخواست پروژه',process_1_body:'موضوع، مسئله و انتظار خودتان را از طریق فرم سایت برای ما بفرستید.',
  process_2_title:'بررسی و گفت‌وگو',process_2_body:'جزئیات فنی، امکان‌سنجی و نیازمندی‌های واقعی پروژه را مرور می‌کنیم.',
  process_3_title:'پیشنهاد مسیر اجرا',process_3_body:'دامنه کار، مراحل تحویل و شیوه همکاری را قبل از شروع مشخص می‌کنیم.',
  process_4_title:'توسعه و تحویل',process_4_body:'پروژه را طبق برنامه پیش می‌بریم و خروجی‌های توافق‌شده را تحویل می‌دهیم.',
  contact_heading_first:'ایده‌ات رو',contact_heading_second:'بذار روی میز.',contact_lead:'لازم نیست همه جزئیات را از قبل بدانید. مسئله یا ایده‌تان را بنویسید؛ درخواست در پنل مدیریت تیم ثبت می‌شود و در صورت اتصال بات، اعلان تلگرام هم ارسال خواهد شد.',
  footer_line:'ساختن راه‌حل‌های هوشمند، با دقت مهندسی و نگاه پژوهشی.'
});
const COPY = x=>structuredClone(x);
const baseState=()=>({version:1,updatedAt:new Date().toISOString(),branding:{heroImage:'',logoImage:''},texts:COPY(DEFAULT_TEXTS),team:COPY(seedTeam).map(p=>({...p,photo:''})),projects:COPY(seedProjects).map(p=>({...p,image:''})),tickets:[]});
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const field=(v,name,max=2500,min=0)=>{if(typeof v!=='string')fail(`${name} معتبر نیست.`);const s=v.trim();if(s.length<min||s.length>max)fail(`${name} باید بین ${min} و ${max} کاراکتر باشد.`);return s;};
const validWeb=(url,optional=true)=>{if(!url&&optional)return '';try{const parsed=new URL(url);if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')throw 0;return parsed.toString();}catch{fail('لینک باید یک نشانی معتبر http یا https باشد.');}};
const validMedia=(u)=>!u?'':(/^\/media\/[a-f0-9]{24}\.(png|jpg|webp)$/.test(u)?u:fail('آدرس تصویر باید از فایل‌های آپلودشده در پنل باشد.'));
const arrayText=(a,name,max=18)=>{if(!Array.isArray(a)||a.length>max)fail(`${name} نامعتبر است.`);return a.map(x=>field(x,name,120,1));};
export function validateTexts(v){if(!v||typeof v!=='object'||Array.isArray(v))fail('متن‌ها نامعتبرند.');const obj={};for(const key of Object.keys(TEXT_FIELDS))obj[key]=field(v[key],TEXT_FIELDS[key],1100,1);return obj;}
export function validateBranding(data){if(!data||typeof data!=='object'||Array.isArray(data))fail('تنظیمات تصاویر نامعتبر است.');return {heroImage:validMedia(data.heroImage||''),logoImage:validMedia(data.logoImage||'')};}
export function validateProject(p,currentId=''){
  if(!p||typeof p!=='object'||Array.isArray(p))fail('پروژه نامعتبر است.');
  if(!['nima','behrooz'].includes(p.owner))fail('عضو تیم نامعتبر است.');
  const allowed=['robot','brain','network','bars','wave','signal','pulse'];
  if(!allowed.includes(p.art))fail('نوع تصویر زمینه نامعتبر است.');
  return {id:currentId||`work-${randomBytes(8).toString('hex')}`,owner:p.owner,kind:field(p.kind,'نوع پروژه',80,2),number:'',year:field(p.year,'سال',36,1),title:field(p.title,'عنوان',140,2),subtitle:field(p.subtitle,'زیرعنوان',160),description:field(p.description,'توضیح پروژه',3000,10),tags:arrayText(p.tags,'برچسب‌ها',12),art:p.art,image:validMedia(p.image||''),source:validWeb(field(p.source,'لینک',1200))};
}
export function validatePerson(p,slug){
  if(!p||typeof p!=='object'||Array.isArray(p))fail('مشخصات عضو نامعتبر است.');
  if(!['nima','behrooz'].includes(slug))fail('عضو تیم پیدا نشد.',404);
  if(!Array.isArray(p.achievements)||p.achievements.length>25||!Array.isArray(p.details)||p.details.length>15)fail('تعداد سوابق یا بخش‌های اطلاعاتی بیش از حد است.');
  return {slug,name:field(p.name,'نام',100,2),en:field(p.en,'نام لاتین',120),initials:field(p.initials,'حرف آواتار',4,1),role:field(p.role,'عنوان شغلی',170,2),label:field(p.label,'برچسب انگلیسی',120),intro:field(p.intro,'معرفی کوتاه',800,2),fullBio:field(p.fullBio,'بیوگرافی کامل',5000,2),highlights:arrayText(p.highlights,'مهارت‌ها',24),achievements:p.achievements.map(a=>({year:field(a.year,'سال',40),title:field(a.title,'عنوان سابقه',150,2),detail:field(a.detail,'توضیح سابقه',800),source:validWeb(field(a.source,'لینک سابقه',1200))})),details:p.details.map(d=>({title:field(d.title,'عنوان بخش',180,2),items:arrayText(d.items,'مورد',30)})),linkedin:validWeb(field(p.linkedin,'لینکدین',1200)),photo:validMedia(p.photo||'')};
}
export function createStore(directory){
 const filename=path.join(directory,'site-data.json');let state;let inflight=Promise.resolve();let initPromise;
 async function init(){if(state)return;if(initPromise)return initPromise;initPromise=(async()=>{await mkdir(directory,{recursive:true});try{const raw=JSON.parse(await readFile(filename,'utf8'));const seed=baseState();state={...seed,...raw,texts:{...seed.texts,...raw.texts},branding:{...seed.branding,...raw.branding},team:raw.team||seed.team,projects:raw.projects||seed.projects,tickets:raw.tickets||[]};}catch(e){if(e.code!=='ENOENT')throw e;state=baseState();await writeSafe(state);}})();try{await initPromise;}catch(e){initPromise=undefined;throw e;}}
 async function writeSafe(next){await mkdir(directory,{recursive:true});const tmp=`${filename}.${randomBytes(6).toString('hex')}.tmp`;await writeFile(tmp,JSON.stringify(next,null,2),{mode:0o600});await rename(tmp,filename);}
 async function get(){await init();await inflight;return COPY(state);}
 async function update(fn){const job=inflight.then(async()=>{await init();const next=COPY(state);const result=await fn(next);next.updatedAt=new Date().toISOString();await writeSafe(next);state=next;return result;});inflight=job.catch(()=>{});return job;}
 return {get,update,filename};
}
export const STATUS=['new','reviewing','in_progress','done','rejected'];
