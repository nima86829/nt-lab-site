/** Read the server-managed public content. Falls back to bundled content only if unavailable. */
export async function loadSiteContent(defaultTeam,defaultProjects){
  return {team:defaultTeam,projects:defaultProjects,texts:{},branding:{}};
}
export function applyEditableTexts(texts){
 for(const node of document.querySelectorAll('[data-edit]')){
  const val=texts[node.dataset.edit];if(typeof val==='string')node.textContent=val;
 }
}
export const mediaURL=v=>/^\/media\/[a-f0-9]{24}\.(png|jpg|webp)$/.test(v||'')?v:'';
export const safeURL=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.toString():'';}catch{return '';}};

export function applyBranding(branding){
 const hero=mediaURL(branding?.heroImage),logo=mediaURL(branding?.logoImage);
 if(hero){const art=document.querySelector('.hero-visual');if(art){const image=document.createElement('img');image.src=hero;image.alt='تصویر انتخابی تیم N&T Lab';image.className='cms-hero-brand-image';art.insertBefore(image,art.firstChild);}}
 if(logo){for(const header of document.querySelectorAll('.brand')){const image=document.createElement('img');image.src=logo;image.alt='لوگوی N&T Lab';image.className='cms-logo-brand';header.append(image);header.querySelector('.brand-symbol')?.classList.add('cms-logo-hidden');}for(const footer of document.querySelectorAll('.footer-logo')){const image=document.createElement('img');image.src=logo;image.alt='لوگوی N&T Lab';image.className='cms-logo-footer';footer.textContent='';footer.append(image);}}
}
