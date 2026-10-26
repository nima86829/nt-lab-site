import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Regression: v1.4 used escapeHTML inside syncTeamIdentity before initializing
// its const declaration. That exception left projects/team unrendered.
test('homepage executes its render path and fills public projects and team',async()=>{
 const source=readFileSync(new URL('../public/main.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
 const nodes={
  '.hero-trust strong':{innerHTML:''},
  '#projects-grid':{innerHTML:''},
  '#team-grid':{innerHTML:''},
  '#all-count':{textContent:''},
  '#current-year':{textContent:''}
 };
 const document={querySelector:sel=>nodes[sel]||null,querySelectorAll:()=>[]};
 const person=(slug,name)=>({slug,name,en:'TEST MEMBER',initials:'ت',role:'متخصص نمونه',label:'ENGINEER',intro:'معرفی کوتاه',highlights:['هوش مصنوعی'],linkedin:'https://example.com',photo:''});
 const team=[person('nima','نیما <تست>'),person('behrooz','دکتر طاهری')];
 const projects=[{id:'test',owner:'nima',art:'network',kind:'پروژه تست',image:'',number:'01',year:'2026',title:'پروژه آزمایشی',subtitle:'عنوان فرعی',description:'توضیحات پروژه تستی',tags:['پایتون'],source:'https://example.com'}];
 const helpers={document,window:{},Date,console,URL,defaultTeam:team,defaultProjects:projects,workArt:{network:'<svg></svg>'},
  loadSiteContent:async()=>({team,projects,texts:{},branding:{}}),applyEditableTexts:()=>{},applyBranding:()=>{},mediaURL:()=>'',safeURL:s=>s,initTheme:()=>{}};
 await runInNewContext(`(async()=>{${source}\n})()`,helpers);
 assert.match(nodes['.hero-trust strong'].innerHTML,/نیما &lt;تست&gt;/);
 assert.match(nodes['#projects-grid'].innerHTML,/پروژه آزمایشی/);
 assert.match(nodes['#team-grid'].innerHTML,/دکتر طاهری/);
 assert.equal(nodes['#all-count'].textContent,'01');
});

test('reveal effects never default to invisible if scripts fail',()=>{
 const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/\.reveal\s*\{\s*opacity\s*:\s*0\s*[;}]/);
 assert.match(css,/\.reveal\s*\{opacity:1/);
});
