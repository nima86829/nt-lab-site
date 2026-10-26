/**
 * Displays bot identity and recent private chat IDs.
 * Safe diagnostics: never prints token or full API URL.
 * This helper does not remove or change an existing webhook.
 */
import {loadTelegramConfig,telegramCall} from './telegram-utils.mjs';

try{
  const {token}=loadTelegramConfig();
  const bot=await telegramCall(token,'getMe');
  console.log(`✅ بات شناسایی شد: @${bot.username}`);
  const webhook=await telegramCall(token,'getWebhookInfo');
  if(webhook.url){
    console.log('\n⚠️ برای این بات Webhook فعال است؛ بنابراین getUpdates کار نمی‌کند.');
    console.log('اگر CHAT ID را از قبل داری، می‌توانی مستقیماً npm run telegram:test را اجرا کنی.');
    console.log('Webhook را خودکار حذف نمی‌کنیم، زیرا ممکن است یک سرویس دیگر از آن استفاده کند.');
  }else{
    const updates=await telegramCall(token,'getUpdates?limit=100&timeout=0');
    const chats=new Map();
    for(const update of updates){
      const msg=update.message??update.edited_message??update.callback_query?.message;
      if(msg?.chat?.type==='private'){
        const name=[msg.chat.first_name,msg.chat.last_name].filter(Boolean).join(' ')||msg.chat.username||'کاربر';
        chats.set(msg.chat.id,name);
      }
    }
    if(chats.size===0){
      console.log('\nشناسه‌ای در پیام‌های اخیر پیدا نشد. به بات /start یا یک پیام جدید بفرست، سپس دوباره اجرا کن.');
      console.log('اگر برنامه دیگری با getUpdates پیام‌ها را دریافت کرده باشد، ممکن است این صف خالی باشد.');
    }else{
      console.log('\nشناسه‌های گفت‌وگوی خصوصی:');
      for(const [id,name] of chats)console.log(`  ${name}: ${id}`);
      console.log('\nشناسه‌ها را با ویرگول در TELEGRAM_CHAT_IDS فایل .env قرار بده.');
    }
  }
}catch(error){
  console.error(`❌ ${error.message}`);
  process.exitCode=1;
}
