/** Read the server-managed public content. Falls back to bundled content only if unavailable. */
export async function loadSiteContent(defaultTeam,defaultProjects){
 try{
  const response=await fetch('/api/content',{cache:'no-store'});
  if(!response.ok)throw Error('Unable to load CMS content');
  const data=await response.json();
  // Invalid or half-migrated CMS responses should never erase the public site.
  const validTeam=Array.isArray(data.team) && data.team.length>=2 && data.team.every(person=>person && typeof person.name==='string' && typeof person.slug==='string' && Array.isArray(person.highlights) && Array.isArray(person.achievements) && Array.isArray(person.details));
  const validProjects=Array.isArray(data.projects) && data.projects.every(project=>project && typeof project.title==='string' && typeof project.owner==='string' && Array.isArray(project.tags));
  return {team:validTeam?data.team:defaultTeam,projects:validProjects?data.projects:defaultProjects,texts:data.texts&&typeof data.texts==='object'&&!Array.isArray(data.texts)?data.texts:{},branding:data.branding&&typeof data.branding==='object'?data.branding:{}};
 }catch(error){console.warn('CMS unavailable; showing bundled content:',error.message);return {team:defaultTeam,projects:defaultProjects,texts:{},branding:{}};}
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
