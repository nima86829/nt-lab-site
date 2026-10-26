import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const envPath=path.join(root,'.env');

export function loadTelegramConfig(){
  if(existsSync(envPath)){
    for(const line of readFileSync(envPath,'utf8').split(/\r?\n/)){
      const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if(!match||Object.hasOwn(process.env,match[1]))continue;
      let value=match[2].trim();
      if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
      process.env[match[1]]=value;
    }
  }
  const token=(process.env.TELEGRAM_BOT_TOKEN||'').trim();
  const chats=(process.env.TELEGRAM_CHAT_IDS||'').split(',').map(c=>c.trim()).filter(Boolean);
  if(!token||token==='your_bot_token_here')throw new Error('فایل .env را در پوشه اصلی پروژه بساز و TELEGRAM_BOT_TOKEN را تنظیم کن.');
  return {token,chats};
}

export async function telegramCall(token,method,body){
  const endpoint=`https://api.telegram.org/bot${token}/${method}`;
  let res;
  try{
    res=await fetch(endpoint,{
      method:body?'POST':'GET',
      ...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),
      signal:AbortSignal.timeout(12000)
    });
  }catch(error){
    const code=error?.cause?.code||error?.code||'';
    if(error?.name==='TimeoutError'||error?.name==='AbortError'||code==='UND_ERR_CONNECT_TIMEOUT'||code==='ETIMEDOUT'){
      throw new Error('مهلت ۱۲ ثانیه‌ای اتصال تمام شد (Timeout). دسترسی سیستم و Node.js به api.telegram.org را بررسی کن.');
    }
    if(code==='ENOTFOUND'||code==='EAI_AGAIN')throw new Error(`خطای DNS (${code}). دامنه api.telegram.org در این سیستم پیدا نشد.`);
    if(code==='ECONNREFUSED'||code==='ECONNRESET'||code==='ENETUNREACH'||code==='EHOSTUNREACH'){
      throw new Error(`خطای شبکه (${code}). اتصال به سرورهای تلگرام برقرار نشد.`);
    }
    throw new Error(`خطای شبکه هنگام تماس با Telegram (${code||error?.name||'fetch failed'}). فیلترینگ، VPN/Proxy و دسترسی Node.js را بررسی کن.`);
  }
  let data;
  try {data=await res.json();}catch{throw new Error(`HTTP ${res.status}: پاسخ تلگرام JSON نبود. احتمال اختلال شبکه یا صفحه خطای پراکسی وجود دارد.`);}
  if(!res.ok||!data.ok){
    const description=typeof data.description==='string'?data.description.replaceAll(token,'[REDACTED]'):'';
    if(res.status===401)throw new Error('401 Unauthorized: توکن بات معتبر نیست یا باطل شده؛ توکن جدید را در .env تنظیم کن.');
    if(res.status===409)throw new Error(`409 Conflict: ${description||'تداخل در دریافت پیام‌ها؛ وجود Webhook یا getUpdates موازی را بررسی کن.'}`);
    if(res.status===403)throw new Error(`403 Forbidden: ${description||'بات اجازه ارسال پیام به این کاربر را ندارد. ابتدا /start بفرست.'}`);
    if(res.status===400)throw new Error(`400 Bad Request: ${description||'شناسه چت یا محتوای پیام را بررسی کن.'}`);
    if(res.status===429)throw new Error('429 Too Many Requests: تعداد درخواست‌های تلگرام زیاد شده؛ بعداً تلاش کن.');
    throw new Error(`Telegram HTTP ${res.status}: ${description||'پاسخ ناموفق از Telegram API'}`);
  }
  return data.result;
}
