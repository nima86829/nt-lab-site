import {initTheme} from "./theme.js";
import {team as defaultTeam,projects as defaultProjects,workArt} from './content.js';
import {loadSiteContent,applyEditableTexts,applyBranding,mediaURL,safeURL} from './cms-public.js';

// Escaping must be initialized before any dynamic team or project rendering.
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {team,projects,texts,branding}=await loadSiteContent(defaultTeam,defaultProjects);
applyEditableTexts(texts);
applyBranding(branding);
function syncTeamIdentity(){
 const trust=document.querySelector('.hero-trust strong');
 if(trust&&team.length>=2)trust.innerHTML=`${escapeHTML(team[0].name)} <span class="trust-cross">×</span> ${escapeHTML(team[1].name)}`;
 document.querySelectorAll('.trust-avatars span').forEach((e,i)=>{if(team[i])e.textContent=team[i].initials;});
 for(const member of team){
  const filter=document.querySelector(`.work-filter[data-filter="${member.slug}"]`);if(filter)filter.textContent=member.name;
  const link=[...document.querySelectorAll('.footer-links a')].find(a=>a.textContent.includes(member.slug==='nima'?'نیما':'طاهری'));
  if(link){link.href=safeURL(member.linkedin)||'#';link.textContent=`لینکدین ${member.name} ↗`;}
 }
}
syncTeamIdentity();

const $ = (selector,root=document) => root.querySelector(selector);
const $$ = (selector,root=document) => [...root.querySelectorAll(selector)];

function projectCard(project){
  const person = team.find(p=>p.slug===project.owner);
  return `<article class="project-card" data-owner="${project.owner}">
    <div class="project-art project-art--${project.art}"><span class="project-art-badge">${escapeHTML(project.kind)}</span>${mediaURL(project.image)?`<img class="cms-project-image" src="${mediaURL(project.image)}" alt="تصویر پروژه ${escapeHTML(project.title)}" loading="lazy">`:(workArt[project.art]||workArt.network)}<span class="project-art-number">${escapeHTML(project.number)}</span></div>
    <div class="project-body"><div class="project-meta"><span>${escapeHTML(project.kind)}</span><span>${escapeHTML(project.year)}</span></div><h3>${escapeHTML(project.title)}</h3><span class="project-subtitle">${escapeHTML(project.subtitle)}</span><p>${escapeHTML(project.description)}</p><div class="project-tags">${project.tags.map(tag=>`<span>${escapeHTML(tag)}</span>`).join('')}</div><div class="project-bottom"><span class="project-owner">${escapeHTML(person?.name||"عضو تیم")}</span>${safeURL(project.source)?`<a class="project-source" href="${escapeHTML(safeURL(project.source))}" target="_blank" rel="noopener noreferrer" aria-label="مشاهده منبع پروژه ${escapeHTML(project.title)}">مشاهده منبع ↗</a>`:`<span class="project-source project-source-muted">منبع عمومی ندارد</span>`}</div></div>
  </article>`;
}

function renderProjects(filter='all'){
  const shown=filter==='all'?projects:projects.filter(project=>project.owner===filter);
  const grid=$('#projects-grid');if(!grid)return;
  grid.innerHTML=shown.length?shown.map(projectCard).join(''):'<p class="project-empty">پروژه‌ای در این دسته ثبت نشده است.</p>';
}

function renderTeam(){
  const el=$('#team-grid');if(!el)return;
  el.innerHTML=team.map(person=>`<article class="person-card reveal"><div class="person-cover person-cover--${person.slug}"><div class="person-outline"></div>${mediaURL(person.photo)?`<img class="cms-member-photo" src="${mediaURL(person.photo)}" alt="تصویر ${escapeHTML(person.name)}" loading="lazy">`:`<span class="person-monogram">${escapeHTML(person.initials)}</span>`}<span class="cover-star">✳</span><span class="cover-id">${escapeHTML(person.en)} / N&T LAB</span></div><div class="person-content"><span class="person-label">${escapeHTML(person.label)}</span><h3>${escapeHTML(person.name)}</h3><p class="person-role">${escapeHTML(person.role)}</p><p class="person-description">${escapeHTML(person.intro)}</p><div class="person-chips">${person.highlights.slice(0,3).map(skill=>`<span>${escapeHTML(skill)}</span>`).join('')}</div><div class="person-actions"><a href="/team/${person.slug}">آشنایی بیشتر و پروژه‌ها <span>↖</span></a><a class="linkedin-link" href="${escapeHTML(safeURL(person.linkedin))}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></div></div></article>`).join('');
}

function initReveals(){
  const els=$$('.reveal');
  if(!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches){els.forEach(x=>x.classList.add('visible'));return;}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.08,rootMargin:'0px 0px -25px 0px'});
  els.forEach(x=>observer.observe(x));
}

function initMenu(){
  const btn=$('.menu-toggle'),menu=$('.mobile-nav');if(!btn||!menu)return;
  btn.addEventListener('click',()=>{const opening=btn.getAttribute('aria-expanded')!=='true';btn.setAttribute('aria-expanded',String(opening));btn.setAttribute('aria-label',opening?'بستن منو':'باز کردن منو');menu.hidden=!opening});
  $$('a',menu).forEach(link=>link.addEventListener('click',()=>{menu.hidden=true;btn.setAttribute('aria-expanded','false')}));
}

function initFilters(){
  $$('.work-filter').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.work-filter').forEach(other=>{const active=other===btn;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active))});
    renderProjects(btn.dataset.filter);
  }));
  const count=$('#all-count');if(count)count.textContent=String(projects.length).padStart(2,'0');
}

const categories={ai:'هوش مصنوعی و یادگیری ماشین',robotics:'رباتیک و سیستم هوشمند',power:'سیستم قدرت و مهندسی برق',software:'نرم‌افزار و ابزار مهندسی',research:'پژوهش و مشاوره تخصصی',other:'سایر موارد'};
function initForm(){
  const form=$('#project-form'),msg=$('#form-message');if(!form)return;
  form.addEventListener('submit',async e=>{
    e.preventDefault();msg.hidden=true;msg.className='form-message';
    const values=Object.fromEntries(new FormData(form).entries());
    const name=String(values.name||'').trim(),contact=String(values.contact||'').trim(),description=String(values.description||'').trim();
    if(name.length<2||contact.length<5||description.length<20||!categories[values.category]){
      msg.textContent='لطفاً نام، راه ارتباطی، دسته‌بندی و حداقل ۲۰ کاراکتر توضیح پروژه را تکمیل کنید.';msg.classList.add('error');msg.hidden=false;return;
    }
    const submit=$('button[type="submit"]',form),label=$('.submit-label',form);
    submit.disabled=true;label.textContent='در حال ارسال درخواست...';
    try{
      const response=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'ارسال درخواست با خطا مواجه شد.');
      form.reset();msg.classList.add('success');msg.innerHTML=`درخواست شما با موفقیت ثبت و به تیم ارسال شد. <strong>کد پیگیری: <bdi>${escapeHTML(payload.ticketId)}</bdi></strong> لطفاً این کد را نگه دارید.`;
    }catch(err){msg.classList.add('error');msg.textContent=err.message||'خطا در اتصال به سرور. دوباره تلاش کنید.'}
    finally{msg.hidden=false;submit.disabled=false;label.textContent='ارسال درخواست پروژه';msg.scrollIntoView({behavior:'smooth',block:'nearest'});}
  });
}

renderProjects();renderTeam();initReveals();initMenu();initFilters();initForm();
const year=$('#current-year');if(year)year.textContent=new Date().getFullYear();

initTheme();
