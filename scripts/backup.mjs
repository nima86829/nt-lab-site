import {existsSync,readFileSync} from 'node:fs';
import {stat,mkdir,cp,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath=path.join(root,'.env');
if(existsSync(envPath)){
 for(const row of readFileSync(envPath,'utf8').split(/\r?\n/)){
  const match=row.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if(!match||Object.hasOwn(process.env,match[1]))continue;
  let v=match[2].trim();if((v[0]==='"'&&v.at(-1)==='"')||(v[0]==="'"&&v.at(-1)==="'"))v=v.slice(1,-1);
  process.env[match[1]]=v;
 }
}
const data=path.resolve(root,process.env.DATA_DIR||'data');
try{await stat(path.join(data,'site-data.json'));}
catch{console.error('هنوز فایل داده‌ای برای پشتیبان‌گیری وجود ندارد. ابتدا سایت را اجرا کنید.');process.exit(1);}
const backups=path.join(root,'backups');
const suffix=new Date().toISOString().replace(/[.:]/g,'-');
const dest=path.join(backups,`ntlab-backup-${suffix}`);
await mkdir(backups,{recursive:true});
await cp(data,dest,{recursive:true,errorOnExist:true,force:false});
await chmod(dest,0o700).catch(()=>{});
console.log(`پشتیبان داده‌ها و تصاویر ساخته شد: ${dest}`);
console.log('این پوشه شامل اطلاعات مشتریان است. آن را خصوصی نگه دارید و یک نسخه در محل امن دیگری نیز ذخیره کنید.');
