import { randomBytes } from 'node:crypto';

export const CATEGORY_LABELS = Object.freeze({
  ai: 'هوش مصنوعی و یادگیری ماشین',
  robotics: 'رباتیک و سیستم هوشمند',
  power: 'سیستم قدرت و مهندسی برق',
  software: 'نرم‌افزار و ابزار مهندسی',
  research: 'پژوهش و مشاوره تخصصی',
  other: 'سایر موارد'
});
export const BUDGET_LABELS = Object.freeze({
  '': 'نامشخص', negotiable: 'قابل مذاکره', under20: 'تا ۲۰ میلیون تومان',
  '20to50': '۲۰ تا ۵۰ میلیون تومان', '50to100': '۵۰ تا ۱۰۰ میلیون تومان', over100: 'بیش از ۱۰۰ میلیون تومان'
});
export const TIMELINE_LABELS = Object.freeze({
  '': 'نامشخص', urgent: 'کمتر از دو هفته', month: 'تا یک ماه',
  'three-months': 'یک تا سه ماه', flexible: 'انعطاف‌پذیر'
});
const clean = value => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim() : '';
export function validateSubmission(value) {
  if(!value || typeof value!=='object' || Array.isArray(value)) return {ok:false,error:'اطلاعات درخواست نامعتبر است.'};
  if(clean(value.website)) return {ok:false,spam:true,error:'درخواست نامعتبر است.'};
  const name=clean(value.name),contact=clean(value.contact),description=clean(value.description);
  const category=clean(value.category),budget=clean(value.budget),timeline=clean(value.timeline);
  if(name.length<2||name.length>80) return {ok:false,error:'نام باید بین ۲ تا ۸۰ کاراکتر باشد.'};
  if(contact.length<5||contact.length>120) return {ok:false,error:'راه ارتباطی باید بین ۵ تا ۱۲۰ کاراکتر باشد.'};
  if(!Object.hasOwn(CATEGORY_LABELS,category)) return {ok:false,error:'دسته‌بندی پروژه معتبر نیست.'};
  if(description.length<20||description.length>2500) return {ok:false,error:'توضیح پروژه باید بین ۲۰ تا ۲۵۰۰ کاراکتر باشد.'};
  if(!Object.hasOwn(BUDGET_LABELS,budget)) return {ok:false,error:'بازه بودجه معتبر نیست.'};
  if(!Object.hasOwn(TIMELINE_LABELS,timeline)) return {ok:false,error:'زمان موردنظر معتبر نیست.'};
  return {ok:true,data:{name,contact,description,category,budget,timeline}};
}
export const escapeTelegram = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function makeTicketId(now=new Date()) {
  const date=now.toISOString().slice(0,10).replaceAll('-','');
  return `NT-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}
export function formatTelegramMessage(ticketId,details){
  const v=escapeTelegram;
  return [
    `🎫 <b>درخواست پروژه جدید | ${v(ticketId)}</b>`,
    '',
    `👤 <b>نام:</b> ${v(details.name)}`,
    `📨 <b>راه ارتباطی:</b> ${v(details.contact)}`,
    `🧩 <b>دسته‌بندی:</b> ${v(CATEGORY_LABELS[details.category])}`,
    `💰 <b>بودجه:</b> ${v(BUDGET_LABELS[details.budget])}`,
    `⏳ <b>زمان:</b> ${v(TIMELINE_LABELS[details.timeline])}`,
    '',
    '<b>شرح پروژه:</b>',
    v(details.description),
    '',
    `🔖 شناسه: <code>${v(ticketId)}</code>`
  ].join('\n');
}
