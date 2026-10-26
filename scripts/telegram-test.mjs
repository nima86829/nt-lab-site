/**
 * Explicit manual test: verifies bot token and sends ONE test message per configured chat.
 * Uses the same sendMessage method as project ticket submissions.
 * Never prints token or full Telegram API URL.
 */
import {loadTelegramConfig,telegramCall} from './telegram-utils.mjs';

try{
  const {token,chats}=loadTelegramConfig();
  const bot=await telegramCall(token,'getMe');
  console.log(`✅ اتصال و اعتبار توکن درست است: @${bot.username}`);
  if(!chats.length)throw new Error('TELEGRAM_CHAT_IDS در فایل .env خالی است.');
  let successes=0;
  for(const chatId of chats){
    try{
      await telegramCall(token,'sendMessage',{chat_id:chatId,text:'✅ تست اتصال بات N&T Lab موفق بود.'});
      console.log(`✅ پیام آزمایشی به Chat ID ${chatId} ارسال شد.`);
      successes++;
    }catch(error){
      console.error(`❌ Chat ID ${chatId}: ${error.message}`);
    }
  }
  if(successes!==chats.length)process.exitCode=1;
  else console.log('\nهمه پیام‌های آزمایشی با موفقیت ارسال شدند. حالا سایت را با npm start اجرا کن.');
}catch(error){
  console.error(`❌ ${error.message}`);
  process.exitCode=1;
}
